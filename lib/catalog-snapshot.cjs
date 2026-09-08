const budget=require('./invocation-budget.cjs');
const {APPROVED_PRODUCT_IDS,HIDDEN_PRODUCT_IDS}=require('./commerce-policy.cjs');
const {loadProduct}=require('./catalog.cjs');
const {catalogProducts}=require('./discovery.cjs');
const {isProduction}=require('./deployment.cjs');

const IDS=[...APPROVED_PRODUCT_IDS].filter(id=>!HIDDEN_PRODUCT_IDS.has(id)).sort((a,b)=>a-b);
const POLICY=JSON.stringify(IDS);
const MAX_AGE_MS=150*60*1000;
const SCHEMA=`CREATE TABLE IF NOT EXISTS public_catalog_snapshot (
  id integer PRIMARY KEY CHECK(id=1), policy text NOT NULL, version integer NOT NULL DEFAULT 0,
  cursor integer NOT NULL DEFAULT 0 CHECK(cursor>=0), pending text NOT NULL DEFAULT '[]',
  cycle_started_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), published text,
  published_source_at text, updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`;

function configured(env){
  return env.CATALOG_SNAPSHOT_ENABLED==='true'&&Boolean(env.PUBLIC_CATALOG_DB)&&
    (isProduction(env)||(env.CLOUDFLARE_WORKER_NAME==='localjagoff-review'&&env.COMMERCE_ENV==='preview'&&
      env.SITE_URL==='https://localjagoff-review.localjagoff-site.workers.dev'));
}
function createSnapshotStore(env,{database=env.PUBLIC_CATALOG_DB}={}){
  if(!configured(env))throw Error('catalog_snapshot_disabled');
  const query=async(text,params=[])=>{
    budget.consume();
    return (await database.prepare(text).bind(...params.map(v=>typeof v==='boolean'?Number(v):v)).all()).results;
  };
  return {
    async read(){
      const row=(await query('SELECT * FROM public_catalog_snapshot WHERE id=1'))[0];
      return row?{...row,pending:JSON.parse(row.pending),published:row.published===null?null:JSON.parse(row.published)}:undefined;
    },
    async initialize(){
      await query('INSERT INTO public_catalog_snapshot(id,policy) VALUES(1,?1) ON CONFLICT DO NOTHING',[POLICY]);
    },
    async reset(version){
      return (await query(`UPDATE public_catalog_snapshot SET policy=?2,version=version+1,cursor=0,
        pending='[]',cycle_started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        published=CASE WHEN policy=?2 THEN published ELSE NULL END,
        published_source_at=CASE WHEN policy=?2 THEN published_source_at ELSE NULL END
        WHERE id=1 AND version=?1 RETURNING id`,[version,POLICY])).length===1;
    },
    async advance(state,products,complete){
      return (await query(`UPDATE public_catalog_snapshot SET version=version+1,
        cursor=CASE WHEN ?4 THEN 0 ELSE cursor+1 END,
        pending=CASE WHEN ?4 THEN '[]' ELSE ?3 END,
        published=CASE WHEN ?4 THEN ?3 ELSE published END,
        published_source_at=CASE WHEN ?4 THEN cycle_started_at ELSE published_source_at END,
        cycle_started_at=CASE WHEN ?4 THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE cycle_started_at END,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=1 AND version=?1 AND policy=?2
        AND cycle_started_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-150 minutes') RETURNING id`,
      [state.version,POLICY,JSON.stringify(products),complete])).length===1;
    },
    async published(){
      const row=(await query(`SELECT published FROM public_catalog_snapshot WHERE id=1 AND policy=?1
        AND published_source_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-150 minutes')
        AND published_source_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,[POLICY]))[0];
      return row?.published?JSON.parse(row.published):undefined;
    },
  };
}
async function readSnapshot(env,{store=createSnapshotStore(env)}={}){
  const products=await store.published();
  if(!Array.isArray(products))throw Error('catalog_snapshot_unavailable');
  const approved=new Set(IDS);
  if(products.some(p=>!approved.has(p?.id)))throw Error('catalog_snapshot_policy_mismatch');
  return catalogProducts(products);
}
async function refreshStep(env,{store,readProduct=loadProduct,now=Date.now}={}){
  if(!configured(env))return {outcome:'catalog_snapshot_disabled'};
  store??=createSnapshotStore(env);
  const state=await store.read();
  if(!state){await store.initialize();return {outcome:'catalog_initialized'};}
  const started=Date.parse(state.cycle_started_at);
  if(state.policy!==POLICY||!Number.isFinite(started)||started>now()||now()-started>=MAX_AGE_MS||
    !Number.isInteger(state.cursor)||state.cursor<0||state.cursor>=IDS.length){
    const changed=await store.reset(state.version);
    return {outcome:changed?'catalog_cycle_reset':'catalog_refresh_raced'};
  }
  if(!Array.isArray(state.pending))throw Error('catalog_pending_invalid');
  // Exactly one read-only provider request. Failures leave the cursor and published data intact.
  const product=await readProduct(IDS[state.cursor],{apiKey:env.PRINTFUL_API_KEY});
  if(product&&product.id!==IDS[state.cursor])throw Error('catalog_product_mismatch');
  const products=catalogProducts([...state.pending,...(product?[product]:[])]);
  const allowed=new Set(IDS.slice(0,state.cursor+1));
  if(products.some(p=>!allowed.has(p.id)))throw Error('catalog_pending_policy_mismatch');
  const complete=state.cursor===IDS.length-1;
  const changed=await store.advance(state,products,complete);
  return {outcome:!changed?'catalog_refresh_raced':complete?'catalog_published':'catalog_product_refreshed',
    product_id:IDS[state.cursor],products:products.length};
}
module.exports={IDS,POLICY,MAX_AGE_MS,SCHEMA,configured,createSnapshotStore,readSnapshot,refreshStep};
