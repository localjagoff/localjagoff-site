const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const snapshot=require('../lib/catalog-snapshot.cjs');
const {createApiAdapter}=require('../lib/cloudflare-api-adapter.cjs');
const env={CATALOG_SNAPSHOT_ENABLED:'true',PUBLIC_CATALOG_DB:{},COMMERCE_ENV:'preview',
  CLOUDFLARE_WORKER_NAME:'localjagoff-review',SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev'};
let db,store;
before(async()=>{
  db=new DatabaseSync(':memory:');db.exec(snapshot.SCHEMA);
  store=snapshot.createSnapshotStore(env,{database:{prepare:q=>({bind:(...params)=>({all:async()=>({
    results:db.prepare(q).all(Object.fromEntries(params.map((v,i)=>['?'+(i+1),v])))
  })})})}});
});
after(async()=>db.close());
function product(id){return {id,name:'Fixture '+id,description:'Synthetic product',images:['/images/fixture.jpg'],
  variants:[{id:id+100,name:'M',price:'30.00',unit_amount:3000,currency:'USD',availability:'in stock'}]};}
async function reset(){await db.exec('DELETE FROM public_catalog_snapshot');await store.initialize();}
async function cycle(readProduct=async id=>product(id)){
  for(let i=0;i<snapshot.IDS.length;i++)await snapshot.refreshStep(env,{store,readProduct});
}
test('scheduled steps read exactly one product; only a complete snapshot is public',async()=>{
  await reset();let calls=0;
  for(let i=0;i<snapshot.IDS.length;i++){
    const result=await snapshot.refreshStep(env,{store,readProduct:async id=>{calls++;return product(id);}});
    assert.equal(calls,i+1);
    assert.equal(result.outcome,i===snapshot.IDS.length-1?'catalog_published':'catalog_product_refreshed');
    if(i<snapshot.IDS.length-1)await assert.rejects(snapshot.readSnapshot(env,{store}),/unavailable/);
  }
  assert.equal((await snapshot.readSnapshot(env,{store})).length,14);
  assert.equal((await store.read()).cursor,0);
});
test('provider failure preserves the previous full snapshot and does not advance',async()=>{
  await reset();await cycle();const before=await store.read();
  await assert.rejects(snapshot.refreshStep(env,{store,readProduct:async()=>{throw Error('fixture outage');}}),/outage/);
  const after=await store.read();assert.equal(after.version,before.version);assert.deepEqual(after.published,before.published);
  await cycle(async id=>id===snapshot.IDS[0]?null:product(id));
  const published=await snapshot.readSnapshot(env,{store});assert.equal(published.length,13);
  assert.ok(!published.some(p=>p.id===snapshot.IDS[0]));
});
test('single-product D1 read preserves approval, omission and snapshot expiry without parsing the entire catalog',async()=>{
  await reset();await cycle();const id=snapshot.IDS[0];
  assert.deepEqual(await snapshot.readProductSnapshot(env,id,{store}),product(id));
  assert.equal(await snapshot.readProductSnapshot(env,999999,{store}),null);
  await cycle(async current=>current===id?null:product(current));
  assert.equal(await snapshot.readProductSnapshot(env,id,{store}),null);
  db.exec("UPDATE public_catalog_snapshot SET published_source_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-151 minutes')");
  await assert.rejects(snapshot.readProductSnapshot(env,id,{store}),/unavailable/);
});
test('compare-and-swap rejects a racing or stale refresh and never publishes partial data',async()=>{
  await reset();const state=await store.read();
  assert.equal(await store.advance(state,[product(snapshot.IDS[0])],false),true);
  assert.equal(await store.advance(state,[product(snapshot.IDS[0])],false),false);
  assert.equal((await store.read()).cursor,1);assert.equal(await store.published(),undefined);
});
test('small database clock skew keeps a new cycle; materially future timestamps still reset before provider access',async()=>{
  await reset();const started=Date.parse((await store.read()).cycle_started_at);
  assert.equal((await snapshot.refreshStep(env,{store,now:()=>started-2,readProduct:async id=>product(id)})).outcome,'catalog_product_refreshed');
  assert.equal((await snapshot.refreshStep(env,{store,now:()=>started-5001,readProduct:()=>assert.fail('future cycle must not contact provider')})).outcome,'catalog_cycle_reset');
});
test('expired and policy-mismatched snapshots fail closed without a provider fallback',async()=>{
  await reset();await cycle();
  db.exec("UPDATE public_catalog_snapshot SET published_source_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-151 minutes')");
  await assert.rejects(snapshot.readSnapshot(env,{store}),/unavailable/);
  await db.exec("UPDATE public_catalog_snapshot SET policy='outdated'");
  const result=await snapshot.refreshStep(env,{store,readProduct:()=>assert.fail('provider must not run')});
  assert.equal(result.outcome,'catalog_cycle_reset');assert.equal((await store.read()).published,null);
  db.exec("UPDATE public_catalog_snapshot SET cycle_started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-151 minutes')");
  assert.equal((await snapshot.refreshStep(env,{store,readProduct:()=>assert.fail()})).outcome,'catalog_cycle_reset');
});
test('snapshot API never invokes Printful; expired data returns 503 and preview stays noindex',async()=>{
  const info=console.info;console.info=()=>{};
  try{
    const adapter=createApiAdapter({loadCatalog:()=>assert.fail('no live catalog fallback'),loadSnapshot:async()=>{throw Error('expired');}});
    for(const route of ['/api/get-products','/api/meta-catalog','/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml']){
      const r=await adapter(new Request(env.SITE_URL+route),env);
      assert.equal(r.status,503,route);assert.match(r.headers.get('x-robots-tag'),/noindex/);
    }
  }finally{console.info=info;}
});
test('disabled or mis-scoped scheduler performs no database or provider work',async()=>{
  for(const bad of [{}, {...env,CATALOG_SNAPSHOT_ENABLED:'false'},{...env,COMMERCE_ENV:'production'},{...env,SITE_URL:'https://wrong.invalid'}]){
    assert.equal((await snapshot.refreshStep(bad,{store:{read:()=>assert.fail()},readProduct:()=>assert.fail()})).outcome,'catalog_snapshot_disabled');
  }
});

test('catalog-only verification cannot queue email and expires before database access',async()=>{
  const review=require('../lib/cloudflare-review-verification.cjs');
  let migrations=0;
  const clock=Date.now();
  const configured={...env,CHECKOUT_PAUSED:'true',CUSTOMER_EMAIL_ENABLED:'false',CRON_SECRET:'x'.repeat(48),
    CLOUDFLARE_REVIEW_VERIFY_UNTIL:'1970-01-01T00:00:00.000Z',
    CLOUDFLARE_CATALOG_VERIFY_UNTIL:new Date(clock+600000).toISOString(),
    PUBLIC_CATALOG_DB:{prepare:text=>({run:async()=>{assert.equal(text,snapshot.SCHEMA);migrations++;}})}};
  const request=body=>new Request(env.SITE_URL+'/api/internal/cloudflare-review-verification',{
    method:'POST',headers:{authorization:'Bearer '+configured.CRON_SECRET},body});
  const opts={now:()=>clock,sqlFactory:()=>assert.fail('Neon must not be contacted'),storeFactory:()=>assert.fail('mail store must not open')};
  assert.equal((await review.request(request('catalog-migrate'),configured,opts)).status,200);
  assert.equal(migrations,1);
  for(const body of ['queue','status','migrate','fixtures','provider-status']){
    assert.equal((await review.request(request(body),configured,opts)).status,404);
  }
  assert.equal((await review.request(request('catalog-migrate'),configured,{...opts,now:()=>clock+600001})).status,404);
  assert.equal(migrations,1);
});
