const {neon}=require('@neondatabase/serverless');
const {createLifecycleStripe}=require('./lifecycle-stripe-reader.cjs');
const {createStore}=require('./communications-store.cjs');
const {createService}=require('./communications-service.cjs');
const {runCommunications}=require('./communications-runner.cjs');
const {deliver}=require('./communications-queue.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const schema=require('./communications-schema.cjs');
const wake=require('./communications-wake.cjs');
const SCHEMA='capacity_fixture_v9';
const SEARCH=`SET LOCAL search_path TO ${SCHEMA},pg_catalog`;
const EMAIL='cpu-fixture@example.invalid';
const SMALL='LJ'+'1'.repeat(24), LARGE='LJ'+'2'.repeat(24);
const FIXTURE_ENV=Object.freeze({VERCEL_ENV:'production',COMMUNICATIONS_ENABLED:'true',
  CUSTOMER_EMAIL_ENABLED:'true',DATABASE_URL:'fixture',STRIPE_SECRET_KEY:'sk_live_fixture',PRINTFUL_API_KEY:'fixture'});
const CASES=['reconcile-small','reconcile-large','send-processing','fresh-review','retry-shipment','retry-not-due','terminal-not-due','cleanup','paid-draft-simulated','paid-replay-simulated','paid-failure-simulated'];

function enabled(env,now=Date.now()){
  const until=Date.parse(env.CLOUDFLARE_CAPACITY_VERIFY_UNTIL||'');
  return env.CLOUDFLARE_WORKER_NAME==='localjagoff-review'&&env.COMMERCE_ENV==='preview'&&
    env.SITE_URL==='https://localjagoff-review.localjagoff-site.workers.dev'&&
    env.CHECKOUT_PAUSED==='true'&&env.COMMUNICATIONS_ENABLED==='false'&&env.CUSTOMER_EMAIL_ENABLED==='false'&&
    Number.isFinite(until)&&until>now&&until<=now+3600000;
}

function database(env,{sqlFactory=neon}={}){
  if(!env.DATABASE_URL)throw Error('capacity_database_missing');
  const sql=sqlFactory(env.DATABASE_URL);
  // Every real database request is scoped transactionally; public customer/test records are inaccessible.
  const transaction=queries=>sql.transaction([sql.query(SEARCH),...queries],
    {fetchOptions:{signal:AbortSignal.timeout(15000)}}).then(rows=>rows.slice(1));
  const query=(text,params=[])=>({text,params,then(resolve,reject){
    return transaction([sql.query(text,params)]).then(rows=>rows[0]).then(resolve,reject);
  }});
  const scoped={query,transaction:tasks=>transaction(tasks.map(task=>sql.query(task.text,task.params)))};
  return {sql,transaction,query,store:createStore(FIXTURE_ENV,{sqlClient:scoped})};
}

async function seed(env,options){
  if(!enabled(env))return {outcome:'capacity_disabled'};
  const db=database(env,options),sql=db.sql;
  await sql.transaction([sql.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`),sql.query(SEARCH),
    ...schema.map(text=>sql.query(text)),
    sql.query(`INSERT INTO comm_orders(reference,session_id,customer,items,printful_id,unresolved,reconcile_reason,next_due_at)
      VALUES($1,'cs_capacity_small',$3,$4,1,false,'event',now()-interval '2 hours'),
      ($2,'cs_capacity_large',$3,$4,2,false,'event',now()-interval '1 hour') ON CONFLICT DO NOTHING`,
    [SMALL,LARGE,JSON.stringify({email:EMAIL}),JSON.stringify([{productId:430697388,name:'Synthetic CPU fixture'}])]),
    sql.query(`INSERT INTO comm_orders(reference,session_id,customer,items,printful_id,unresolved,lifecycle_complete,next_due_at)
      VALUES($1,'cs_capacity_terminal','{}','[]',3,false,true,now()-interval '1 day') ON CONFLICT DO NOTHING`,['LJ'+'3'.repeat(24)]),
  ],{fetchOptions:{signal:AbortSignal.timeout(20000)}});
  await wake.signal(env);
  return {outcome:'capacity_fixture_ready'};
}

function providerFixture(large){
  const reference=large?LARGE:SMALL,id=large?2:1,count=large?200:1;
  const session={id:large?'cs_capacity_large':'cs_capacity_small',object:'checkout.session',livemode:true,
    metadata:{store_id:STORE_ID},payment_status:'paid',
    payment_intent:{latest_charge:{refunded:false,amount_refunded:0,disputed:false}}};
  const order={id,store_id:Number(STORE_ID),external_id:reference,status:large?'fulfilled':'inprocess'};
  const shipped_at='2026-01-01T00:00:00.000Z',delivered_at='2026-01-11T00:00:00.000Z';
  const items=Array.from({length:count},(_,i)=>({id:i+1,quantity:1}));
  const shipments=items.map(item=>({id:item.id,shipment_status:'shipped',delivery_status:'delivered',shipped_at,delivered_at,
    carrier:'Fixture',tracking_number:'SYNTHETIC',tracking_url:'https://example.invalid/tracking',
    shipment_items:[{order_item_id:item.id,quantity:1}]}));
  const base=`/v2/orders/${id}`,bodies=new Map([[base,JSON.stringify({data:order})]]);
  for(const [suffix,all] of [['order-items',items],['shipments',shipments]]){
    for(let offset=0;offset<all.length;offset+=100){
      const pathname=base+'/'+suffix;
      bodies.set(pathname+(offset?'?offset='+offset:''),JSON.stringify({data:all.slice(offset,offset+100),paging:{total:all.length},
        _links:offset+100<all.length?{next:{href:pathname+'?offset=100'}}:{}}));
    }
  }
  return {sessionId:session.id,session:JSON.stringify(session),bodies};
}
// Fixtures arrive as raw provider-shaped bodies. Preparing fake packages is not application CPU.
const SMALL_PROVIDER=providerFixture(false),LARGE_PROVIDER=providerFixture(true);
function providers({large=false,retry=false}={}){
  const fixture=large?LARGE_PROVIDER:SMALL_PROVIDER,calls={stripe:0,printful:0,email:0};
  const stripe=createLifecycleStripe(FIXTURE_ENV,{fetchImpl:async(url,init)=>{
      const u=new URL(url);
      if(u.origin!=='https://api.stripe.com'||u.pathname!==`/v1/checkout/sessions/${fixture.sessionId}`||init.method!=='GET')throw Error('capacity_provider_path_denied');
      calls.stripe++;return new Response(fixture.session,{headers:{'content-type':'application/json'}});
    }});
  const fetchImpl=async(url,init)=>{
    const u=new URL(url),body=fixture.bodies.get(u.pathname+u.search);
    if(u.origin!=='https://api.printful.com'||init.method!=='GET'||!body)throw Error('capacity_provider_path_denied');
    calls.printful++;return new Response(body,{headers:{'content-type':'application/json'}});
  };
  const send=async payload=>{
    if(payload.to?.length!==1||payload.to[0]!==EMAIL)throw Error('capacity_recipient_denied');
    calls.email++;
    // Serialize the real generated mail, but no provider request can occur.
    JSON.parse(JSON.stringify(payload));
    if(retry)throw Object.assign(Error('fixture_retry'),{status:429});
    return {id:'00000000-0000-4000-8000-000000000001'};
  };
  return {stripe,fetchImpl,send,calls};
}

async function run(env,options={}){
  if(!enabled(env))return {outcome:'capacity_disabled'};
  const phase=options.phase??2;
  if(!Number.isInteger(phase)||phase<0||phase>=CASES.length)return {outcome:'capacity_disabled'};
  const {store}=database(env,options),scenario=CASES[phase];
  if(phase>=8){
    const result=await require('./cloudflare-paid-capacity.cjs').run(store,phase);
    console.info('capacity_case',result);return result;
  }
  // A timer arriving before fixture preparation must not claim an unrelated case.
  if(phase===2)store.claimReconciliation=async()=>undefined;
  const mocked=providers({large:phase===1||phase===3,retry:phase===4});
  const serviceFactory=()=>createService({env:FIXTURE_ENV,store,stripe:mocked.stripe,fetchImpl:mocked.fetchImpl,
    dispatch:()=>{throw Error('capacity_inline_send_denied');}});
  const key=phase===2?`processing/${SMALL}`:phase===3?`review/${LARGE}`:`shipment/${SMALL}/1`;
  const dispatch=(s,opts)=>deliver(s,{...opts,key,send:mocked.send,logger:{info(){}}});
  let result;
  try{
    const mode=phase===7?'cleanup':phase<2||phase===6?'fallback':'fast';
    result=await wake.run({env,mode,storeFactory:()=>store,execute:()=>runCommunications({env:FIXTURE_ENV,mode,
      storeFactory:()=>store,stripeFactory:()=>mocked.stripe,serviceFactory,dispatch})});
  }catch{result={outcome:'capacity_case_failed'};}
  const safe={scenario,outcome:result.outcome,simulated_provider_calls:mocked.calls,real_provider_calls:0};
  console.info('capacity_case',safe);
  return safe;
}

async function freeze(env,options){
  if(!enabled(env))return {outcome:'capacity_disabled'};
  // Test preparation is separate from measured execution, and affects this synthetic row only.
  await database(env,options).query("UPDATE comm_orders SET next_due_at=now()+interval '1 day' WHERE reference=$1",[LARGE]);
  await wake.signal(env);return {outcome:'capacity_continuation_frozen'};
}

async function status(env,options){
  if(!enabled(env))return {outcome:'capacity_disabled'};
  const {query}=database(env,options);
  const jobs=await query('SELECT kind,status,count(*)::int AS count,max(attempts)::int AS attempts FROM comm_outbox GROUP BY kind,status ORDER BY kind,status');
  return {outcome:'capacity_status',jobs};
}
module.exports={enabled,seed,run,freeze,status,providers,database,SCHEMA,SMALL,LARGE,CASES};
