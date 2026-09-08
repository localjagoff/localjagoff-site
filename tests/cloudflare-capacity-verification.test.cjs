const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const probe=require('../lib/cloudflare-capacity-verification.cjs');
const verification=require('../lib/cloudflare-review-verification.cjs');
const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',
  SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',CHECKOUT_PAUSED:'true',
  COMMUNICATIONS_ENABLED:'false',CUSTOMER_EMAIL_ENABLED:'false',DATABASE_URL:'fixture',
  CRON_SECRET:'fixture-only-'.repeat(4),CLOUDFLARE_CAPACITY_VERIFY_UNTIL:new Date(Date.now()+1800000).toISOString()};
let db;
before(async()=>{db=new PGlite();await db.exec("CREATE TABLE comm_orders(sentinel text); INSERT INTO comm_orders VALUES('untouched')");});
after(async()=>db.close());
const options={sqlFactory:()=>({query:(text,params)=>({text,params}),
  transaction:qs=>db.transaction(async t=>{const rows=[];for(const q of qs)rows.push((await t.query(q.text,q.params)).rows);return rows;})})};
const forbidden={sqlFactory:()=>assert.fail('database must remain inaccessible')};
test('capacity fixture is closed outside exact isolated review and short expiry',async()=>{
  for(const change of [{CLOUDFLARE_WORKER_NAME:'localjagoff-production'}, {COMMERCE_ENV:'production'},
    {SITE_URL:'https://www.localjagoff.com'},{CHECKOUT_PAUSED:'false'},{COMMUNICATIONS_ENABLED:'true'},
    {CUSTOMER_EMAIL_ENABLED:'true'},{CLOUDFLARE_CAPACITY_VERIFY_UNTIL:''},
    {CLOUDFLARE_CAPACITY_VERIFY_UNTIL:new Date(Date.now()+7200000).toISOString()}]){
    assert.equal(probe.enabled({...env,...change}),false);
    assert.equal((await probe.run({...env,...change},forbidden)).outcome,'capacity_disabled');
  }
});
test('capacity commands require auth and cannot open owner mail/provider commands',async()=>{
  const request=(body,auth)=>new Request(env.SITE_URL+'/api/internal/cloudflare-review-verification',{
    method:'POST',headers:{authorization:auth||'Bearer '+env.CRON_SECRET},body});
  assert.equal((await verification.request(request('capacity-seed','Bearer wrong'),env,forbidden)).status,401);
  for(const command of ['queue','migrate','provider-status','fixtures','contact-status']){
    assert.equal((await verification.request(request(command),env,forbidden)).status,404);
  }
});
test('real SQL and lifecycle code use only isolated synthetic rows; providers never access network',async()=>{
  const original=global.fetch;
  global.fetch=()=>assert.fail('no real network permitted');
  try{
    assert.equal((await probe.seed(env,options)).outcome,'capacity_fixture_ready');
    const results=[];
    for(let i=0;i<probe.CASES.length;i++){
      results.push(await probe.run(env,{...options,phase:i}));
      if(i===1)await probe.freeze(env,options);
    }
    assert.deepEqual(results.map(r=>r.outcome),['reconciled','reconciled_partial','sent','sent','retry_scheduled','no_due_order','no_due_order','cleanup_complete','paid_capacity_pass','paid_capacity_pass','paid_capacity_pass']);
    assert.deepEqual(results[1].simulated_provider_calls,{stripe:1,printful:5,email:0});
    assert.deepEqual(results[3].simulated_provider_calls,{stripe:1,printful:5,email:1});
    assert.equal((await probe.run(env,{...options,phase:11})).outcome,'capacity_disabled');
    assert.equal(results[8].simulated_provider_calls.email,2);
    assert.equal(results[9].simulated_provider_calls.email,0);
    assert.equal(results[10].status,500);
    const status=await probe.status(env,options);
    assert.equal(status.jobs.find(j=>j.kind==='review').status,'sent');
    assert.deepEqual((await db.query('SELECT * FROM public.comm_orders')).rows,[{sentinel:'untouched'}]);
    await probe.seed(env,options);
    assert.deepEqual((await probe.status(env,options)).jobs,status.jobs,'seed never resets completed fixtures');
  }finally{global.fetch=original;}
});
test('fixture provider transport rejects unexpected hosts, mutations, recipients and paths',async()=>{
  const p=probe.providers();
  await assert.rejects(p.fetchImpl('https://api.printful.com/v2/orders/1',{method:'POST'}),/path_denied/);
  await assert.rejects(p.fetchImpl('https://example.com/v2/orders/1',{method:'GET'}),/path_denied/);
  await assert.rejects(p.fetchImpl('https://api.printful.com/v2/orders/999',{method:'GET'}),/path_denied/);
  await assert.rejects(p.send({to:['hello@localjagoff.com']}),/recipient_denied/);
  assert.deepEqual(p.calls,{stripe:0,printful:0,email:0});
});
