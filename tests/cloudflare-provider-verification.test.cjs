const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const review=require('../lib/cloudflare-review-verification.cjs');
const provider=require('../lib/cloudflare-provider-verification.cjs');
const {createApiAdapter}=require('../lib/cloudflare-api-adapter.cjs');
const {EVENTS,verifyPrintfulSignature,printfulEventIdentity}=require('../lib/customer-lifecycle.cjs');
const {installBudget,withBudget,MAX_SUBREQUESTS}=require('../lib/invocation-budget.cjs');
const ORIGIN='https://localjagoff-review.localjagoff-site.workers.dev';
const PATH='/api/internal/cloudflare-review-verification';
const SESSION='cs_test_b1smOwWNyQvVoamURY1KIUlmMvtp6zSiUJZySdkb6Ps1rmVUyDHkd4MZzQ';
const EVENT='evt_1UDBgN2MvN1ioVod1lL0UPCW';
const forbidden=()=>assert.fail('Unexpected provider, database, or owner email access');
const originalFetch=globalThis.fetch,originalInfo=console.info;
before(()=>{globalThis.fetch=installBudget(forbidden);console.info=()=>{};});
after(()=>{globalThis.fetch=originalFetch;console.info=originalInfo;});
function environment(){
  return {CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',SITE_URL:ORIGIN,
    CHECKOUT_PAUSED:'true',CUSTOMER_EMAIL_ENABLED:'false',COMMUNICATIONS_ENABLED:'true',
    CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()+1800000).toISOString(),CRON_SECRET:'auth-fixture-'.repeat(4),
    STRIPE_SECRET_KEY:'rk_test_fixture',PRINTFUL_WEBHOOK_SECRET:'a1'.repeat(32),PRINTFUL_WEBHOOK_PUBLIC_KEY:'fixture-public',
    DATABASE_URL:'postgresql://fixture:fixture@fixture.neon.tech/fixture'};
}
const request=(env,body='fixtures',changes={})=>new Request(ORIGIN+PATH,{
  method:'POST',headers:{authorization:'Bearer '+env.CRON_SECRET},body,...changes,
});
const blocked={fetchImpl:forbidden,sqlFactory:forbidden,storeFactory:forbidden};
const emptyStock={type:'catalog_stock_updated',count:'0',newest_age_seconds:null,oldest_age_seconds:null,
  min_arrival_age_seconds:null,max_arrival_age_seconds:null,latest_identity_hash:null};
function stripeFixture(){
  const session={object:'checkout.session',id:SESSION,livemode:false,status:'complete',payment_status:'paid',amount_total:4500,
    success_url:ORIGIN+'/success?customer_email=private@example.test#secret',cancel_url:ORIGIN+'/cart',
    return_url:'https://evil.test/secret',customer:{email:'private@example.test'},client_secret:'SECRET_CANARY'};
  const event={object:'event',id:EVENT,type:'checkout.session.completed',livemode:false,data:{object:session},request:'SECRET_CANARY'};
  const endpoints={data:[{url:ORIGIN+'/api/webhook',livemode:false,status:'enabled',secret:'SECRET_CANARY',id:'not-output'}],has_more:false};
  const values=[session,event,endpoints],calls=[];
  return {session,event,endpoints,calls,fetchImpl:async(url,init)=>{
    assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');
    assert.match(init.headers.authorization,/^Bearer (sk|rk)_test_/);
    assert.equal(url,['https://api.stripe.com/v1/checkout/sessions/'+SESSION,
      'https://api.stripe.com/v1/events/'+EVENT,'https://api.stripe.com/v1/webhook_endpoints?limit=100'][calls.length]);
    calls.push(url);return Response.json(values[calls.length-1]);
  }};
}
const sqlFixture=rows=>()=>({query:sql=>{assert.match(sql,/^WITH evidence AS/);return sql;},
  transaction:async(queries,options)=>{assert.equal(queries.length,1);assert.equal(options.readOnly,true);return [rows];}});

test('new dispatch rejects wrong origin, path, auth, mode, expiry and controls before any I/O',async()=>{
  for(const command of ['fixtures','provider-status']){
    for(const changes of [{SITE_URL:'https://www.localjagoff.com'},{SITE_URL:ORIGIN+'/'},
      {CLOUDFLARE_WORKER_NAME:'localjagoff-production'},{COMMERCE_ENV:'production'},
      {CHECKOUT_PAUSED:'false'},{CUSTOMER_EMAIL_ENABLED:'true'},
      {CLOUDFLARE_REVIEW_VERIFY_UNTIL:''},{CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()-1).toISOString()},
      {CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()+7200000).toISOString()}]){
      const env={...environment(),...changes};
      const response=await review.request(request(env,command),env,blocked);
      assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
    }
    const env=environment();
    for(const url of ['https://www.localjagoff.com'+PATH,ORIGIN+PATH+'?command=fixtures',ORIGIN+PATH+'/',ORIGIN+'/other']){
      assert.equal((await review.request(new Request(url,{method:'POST',headers:{authorization:'Bearer '+env.CRON_SECRET},body:command}),env,blocked)).status,404);
    }
    for(const auth of ['',env.CRON_SECRET,'Bearer wrong','Basic '+env.CRON_SECRET]){
      assert.equal((await review.request(request(env,command,{headers:{authorization:auth}}),env,blocked)).status,401);
    }
    assert.equal((await provider.request(new Request(ORIGIN+PATH),env,command,blocked)).status,401);
    assert.equal((await review.request(request(env,command),{...env,CRON_SECRET:'short'},blocked)).status,401);
  }
});

test('dispatch accepts only exact bounded commands, including streamed byte limit',async()=>{
  const env=environment();
  for(const body of ['fixtures\n','provider-status ','catalog-fixture','cs_test_other','SELECT 1','{"url":"x"}']){
    assert.equal((await review.request(request(env,body),env,blocked)).status,400);
  }
  for(const chunks of [['provider-status','xx'],['\u00e9'.repeat(8),'x']]){
    const stream=new ReadableStream({start(controller){chunks.forEach(chunk=>controller.enqueue(Buffer.from(chunk)));controller.close();}});
    assert.equal((await review.request(request(env,stream,{duplex:'half'}),env,blocked)).status,413);
  }
  assert.equal((await provider.request(request(env),env,'arbitrary',blocked)).status,400);
});

test('14 sequential hosted fixtures traverse the real adapter and source parser without side effects',async()=>{
  const env=environment(),adapter=createApiAdapter(),calls=[];
  for(const key of ['PRINTFUL_API_KEY','PRINTFUL_WEBHOOK_API_KEY','RESEND_API_KEY']){
    Object.defineProperty(env,key,{get:forbidden,enumerable:true});
  }
  const response=await review.request(request(env),env,{...blocked,fetchImpl:async(url,init)=>{
    assert.equal(url,ORIGIN+'/api/printful-events');assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');
    assert.equal(init.headers.authorization,undefined);
    const event=JSON.parse(init.body);assert.notEqual(event.type,'catalog_stock_updated');
    if(![10,13].includes(calls.length))assert.equal(verifyPrintfulSignature(Buffer.from(init.body),init.headers,env),true);
    calls.push({body:init.body,headers:init.headers});
    return adapter(new Request(url,init),env);
  }});
  assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.outcome,'synthetic_order_shipment_verified');
  assert.equal(calls.length,14);assert.ok(calls.length<=16);
  assert.deepEqual(result.checks.slice(0,9).map(row=>row.fixture),[...EVENTS]);
  assert.deepEqual(result.checks.map(row=>row.endpointstatus),[...Array(10).fill(200),...Array(4).fill(400)]);
  assert.ok(result.checks.every(row=>row.passed));
  assert.equal(calls[9].body,calls[0].body);assert.deepEqual(calls[9].headers,calls[0].headers);
  assert.equal(printfulEventIdentity(JSON.parse(calls[9].body),18032822),printfulEventIdentity(JSON.parse(calls[0].body),18032822));
  const output=JSON.stringify(result);
  for(const value of [env.PRINTFUL_WEBHOOK_SECRET,env.PRINTFUL_WEBHOOK_PUBLIC_KEY,env.CRON_SECRET,'LJ'+'a'.repeat(24)]){
    assert.equal(output.includes(value),false);
  }
});

test('missing signing config, parser mismatch, redirect or transport failure cannot pass or leak',async()=>{
  for(const changes of [{PRINTFUL_WEBHOOK_SECRET:''},{PRINTFUL_WEBHOOK_SECRET:'not-hex'},{PRINTFUL_WEBHOOK_PUBLIC_KEY:''}]){
    const env={...environment(),...changes};assert.equal((await review.request(request(env),env,blocked)).status,503);
  }
  for(const result of [()=>Response.json({received:true}),()=>Response.json({outcome:'preview_catalog_transport_persisted'}),
    ()=>new Response(null,{status:302,headers:{location:'https://evil.test/SECRET_CANARY'}}),
    ()=>{throw Error('SECRET_CANARY private@example.test');}]){
    const env=environment();let calls=0;
    const response=await review.request(request(env),env,{...blocked,fetchImpl:async()=>{calls++;return result();}});
    assert.equal(response.status,502);assert.equal(calls,1);assert.doesNotMatch(await response.text(),/SECRET_CANARY|private@/);
  }
});

test('fixed TEST session/event/endpoint evidence is strictly projected and stock read uses one read-only SQL statement',async()=>{
  const env=environment(),stripe=stripeFixture();let statement;
  const db=new PGlite();
  try{
    await db.exec('CREATE TABLE comm_preview_events(identity text,kind text,store_id bigint,occurred_at timestamptz,age_seconds integer)');
    const hash=createHash('sha256').update('synthetic-test-only').digest('hex');
    for(const [type,store] of [['catalog_stock_updated',18032822],['catalog_stock_updated',18032823],['order_updated',18032822]]){
      await db.query('INSERT INTO comm_preview_events VALUES($1,$2,$3,now()-interval \'2 minutes\',3)',[hash,type,store]);
    }
    const response=await review.request(request(env,'provider-status'),env,{...blocked,fetchImpl:stripe.fetchImpl,
      sqlFactory:()=>({query:sql=>{statement=sql;return sql;},transaction:async(queries,options)=>{
        assert.equal(queries.length,1);assert.equal(options.readOnly,true);assert.equal(options.fetchOptions.redirect,'error');
        return [(await db.query(queries[0])).rows];
      }})});
    assert.equal(response.status,200);assert.equal(stripe.calls.length,3);
    const result=await response.json();
    assert.equal(result.stripe.session.amount,4500);assert.equal(result.stripe.session.livemode,false);
    assert.deepEqual(result.stripe.session.returnURL,{success:ORIGIN+'/success',cancel:ORIGIN+'/cart',return:null});
    assert.equal(result.stripe.endpointstatus,'enabled');assert.equal(result.stock.count,1);
    assert.equal(result.stock.latest_identity_hash,hash);assert.ok(result.stock.newest_age_seconds>=119);
    assert.equal(result.stock.min_arrival_age_seconds,3);
    assert.doesNotMatch(statement,/\b(?:INSERT|UPDATE|DELETE)\b|comm_orders|comm_outbox|customer|secret|SELECT \*/i);
    assert.doesNotMatch(JSON.stringify(result),/SECRET_CANARY|private@|client_secret|customer|not-output|cs_test_|evt_/);
  }finally{await db.close();}
});

test('status rejects live keys or mismatched evidence and never reflects unsafe URL/status values',async()=>{
  for(const key of ['', 'sk_live_fixture','rk_live_fixture']){
    const env={...environment(),STRIPE_SECRET_KEY:key};
    assert.equal((await review.request(request(env,'provider-status'),env,blocked)).status,503);
  }
  for(const change of [s=>{s.session.livemode=true;},s=>{s.session.id='cs_test_other';},
    s=>{s.event.id='evt_other';},s=>{s.event.livemode=true;},s=>{s.event.data.object={...s.session,id:'cs_test_other'};}]){
    const env=environment(),stripe=stripeFixture();change(stripe);
    assert.equal((await review.request(request(env,'provider-status'),env,{...blocked,fetchImpl:stripe.fetchImpl})).status,502);
  }
  const env=environment(),stripe=stripeFixture();
  Object.assign(stripe.session,{status:'SECRET_CANARY',payment_status:'private@example.test',amount_total:'4500',
    success_url:ORIGIN+'/customer/SECRET_CANARY',cancel_url:'https://private:SECRET_CANARY@'+new URL(ORIGIN).host+'/cart'});
  stripe.endpoints.data[0].status='SECRET_CANARY';
  const response=await review.request(request(env,'provider-status'),env,{...blocked,fetchImpl:stripe.fetchImpl,sqlFactory:sqlFixture([emptyStock])});
  assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/SECRET_CANARY|private@/);
});

test('authentication and review conditions are rechecked before every fixture and Stripe/SQL action',async()=>{
  for(const change of [env=>{env.CRON_SECRET='rotated-'.repeat(8);},env=>{env.CUSTOMER_EMAIL_ENABLED='true';},
    env=>{env.CHECKOUT_PAUSED='false';},env=>{env.SITE_URL='https://www.localjagoff.com';},
    env=>{env.CLOUDFLARE_REVIEW_VERIFY_UNTIL=new Date(Date.now()-1).toISOString();}]){
    const env=environment();let calls=0;
    const response=await review.request(request(env),env,{...blocked,fetchImpl:async()=>{
      calls++;change(env);return Response.json({received:true,outcome:'preview_no_provider_or_email'});
    }});
    assert.ok([401,404].includes(response.status));assert.equal(calls,1);
  }
  for(const closeAfter of [1,2,3]){
    const env=environment(),stripe=stripeFixture();let clock=Date.now();
    const response=await review.request(request(env,'provider-status'),env,{...blocked,now:()=>clock,fetchImpl:async(...args)=>{
      const response=await stripe.fetchImpl(...args);
      if(stripe.calls.length===closeAfter)clock=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL)+1;
      return response;
    }});
    assert.equal(response.status,404);assert.equal(stripe.calls.length,closeAfter);
  }
});

test('expiry while reading the command and signing-key rotation prevent the next outbound action',async()=>{
  const env=environment();let clock=Date.now();
  const stream=new ReadableStream({pull(controller){
    clock=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL)+1;
    controller.enqueue(Buffer.from('fixtures'));controller.close();
  }});
  assert.equal((await review.request(request(env,stream,{duplex:'half'}),env,{...blocked,now:()=>clock})).status,404);
  let calls=0;
  const response=await review.request(request(env),env,{...blocked,fetchImpl:async()=>{
    calls++;env.PRINTFUL_WEBHOOK_SECRET='b2'.repeat(32);
    return Response.json({received:true,outcome:'preview_no_provider_or_email'});
  }});
  assert.equal(response.status,404);assert.equal(calls,1);
});

test('endpoint status cannot mistake live, unrelated, duplicate or truncated configuration for enabled',async()=>{
  for(const [data,has_more,expected] of [
    [[{url:ORIGIN+'/api/webhook',livemode:true,status:'enabled'}],false,'not_found'],
    [[{url:'https://www.localjagoff.com/api/webhook',livemode:false,status:'enabled'}],false,'not_found'],
    [[],true,'unknown'],
    [Array(2).fill({url:ORIGIN+'/api/webhook',livemode:false,status:'enabled'}),false,'ambiguous'],
  ]){
    const env=environment(),stripe=stripeFixture();Object.assign(stripe.endpoints,{data,has_more});
    const response=await review.request(request(env,'provider-status'),env,{...blocked,fetchImpl:stripe.fetchImpl,sqlFactory:sqlFixture([emptyStock])});
    assert.equal(response.status,200);assert.equal((await response.json()).stripe.endpointstatus,expected);
  }
});

test('database and Stripe failures emit fixed errors without secrets or response fields',async()=>{
  for(const failure of ['stripe','database']){
    const env=environment(),stripe=stripeFixture();
    const response=await review.request(request(env,'provider-status'),env,{...blocked,
      fetchImpl:failure==='stripe'?async()=>Response.json({error:'SECRET_CANARY private@example.test'},{status:401}):stripe.fetchImpl,
      sqlFactory:()=>{throw Error('SECRET_CANARY '+env.DATABASE_URL);}});
    assert.equal(response.status,502);assert.deepEqual(await response.json(),{outcome:'provider_verification_failed'});
  }
});

test('real Neon SDK performs one counted read-only HTTP transaction; nested fetches share the 32 call cap',async()=>{
  const env=environment(),stripe=stripeFixture();let databaseCalls=0,budget;
  globalThis.fetch=installBudget(async(url,init)=>{
    databaseCalls++;assert.equal(new URL(url).hostname,'api.neon.tech');assert.equal(init.redirect,'manual');
    assert.equal(init.headers['Neon-Batch-Read-Only'],'true');
    const body=JSON.parse(init.body);assert.equal(body.queries.length,1);
    assert.match(body.queries[0].query,/FROM comm_preview_events/);
    return Response.json({results:[{fields:Object.keys(emptyStock).map(name=>({name,dataTypeID:25})),
      rows:[Object.values(emptyStock)],rowCount:1,command:'SELECT'}]});
  });
  try{
    const response=await withBudget(()=>review.request(request(env,'provider-status'),env,{fetchImpl:stripe.fetchImpl,storeFactory:forbidden}),
      {info:(label,value)=>{budget=value;}});
    assert.equal(response.status,200);assert.equal(databaseCalls,1);assert.equal(budget.subrequests,4);
  }finally{globalThis.fetch=installBudget(forbidden);}
  let calls=0;
  const nested=installBudget(async()=>{calls++;return new Response(null,{status:204});});
  const response=await withBudget(()=>review.request(request(env),env,{...blocked,fetchImpl:async()=>{
    for(let i=0;i<MAX_SUBREQUESTS;i++)await nested('https://fixture.invalid');
    return Response.json({received:true,outcome:'preview_no_provider_or_email'});
  }}),{info:(label,value)=>{budget=value;}});
  assert.equal(response.status,502);assert.equal(calls,31);assert.equal(budget.limit,32);assert.equal(budget.exceeded,true);
});
