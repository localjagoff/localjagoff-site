const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../lib/catalog-maintenance.cjs');
const {sendViaResend}=require('../lib/customer-mail.cjs');
const env={COMMERCE_ENV:'production',CLOUDFLARE_WORKER_NAME:'localjagoff-production',COMMERCE_PRODUCTION_WORKER:'localjagoff-production',
 SITE_URL:'https://www.localjagoff.com',CATALOG_SNAPSHOT_ENABLED:'true',PUBLIC_CATALOG_DB:{},PRINTFUL_API_KEY:'synthetic-only',
 COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true',RESEND_API_KEY:'synthetic-only'};
const at=Date.parse('2026-09-09T00:00:00Z');
const state=age=>({published_source_at:new Date(at-age*60000).toISOString(),published:[{variants:[{},{}]}],cursor:3});
function receipts(){const data=new Map();const tx={get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)};return {...tx,transaction:fn=>fn(tx)};}
const blocked=()=>assert.fail('unexpected I/O');
test('maintenance is private production catalog-only; status never refreshes or sends',async()=>{
 for(const bad of [{...env,COMMERCE_ENV:'preview'},{...env,CATALOG_SNAPSHOT_ENABLED:'false'},{...env,SITE_URL:'https://wrong.invalid'}]){
  assert.equal((await run('step',bad,{}, {store:{read:blocked},refresh:blocked,send:blocked})).outcome,'catalog_maintenance_closed');
 }
 assert.equal((await run('order',env,{}, {store:{read:blocked},refresh:blocked,send:blocked})).outcome,'catalog_maintenance_closed');
 const result=await run('status',env,{}, {store:{read:async()=>state(151)},refresh:blocked,send:blocked,now:()=>at});
 assert.equal(result.health,'expired');assert.equal(result.products,1);assert.equal(result.variants,2);
 assert.doesNotMatch(JSON.stringify(result),/synthetic-only/);
});
test('fresh steps perform one bounded refresh without alerts',async()=>{
 let calls=0;
 const result=await run('step',env,receipts(),{store:{read:async()=>state(28)},refresh:async()=>{calls++;return {outcome:'catalog_product_refreshed'};},send:blocked,now:()=>at});
 assert.equal(calls,1);assert.equal(result.health,'fresh');
});
test('stale risk uses valid Resend envelope and durable deduplication, not one alert per minute',async()=>{
 let sends=0;const storage=receipts();
 const options={store:{read:async()=>state(121)},refresh:async()=>({outcome:'catalog_product_refreshed'}),now:()=>at,
  send:(payload,key,{env})=>sendViaResend(payload,key,{env,fetchImpl:async(url,opts)=>{
   sends++;assert.equal(url,'https://api.resend.com/emails');assert.equal(opts.method,'POST');
   assert.deepEqual(JSON.parse(opts.body).to,['hello@localjagoff.com']);
   assert.match(JSON.parse(opts.body).subject,/HIGH PRIORITY/);
   return Response.json({id:'12345678-1234-1234-1234-123456789012'});
  }})};
 assert.equal((await run('step',env,storage,options)).alert,'sent');
 assert.equal((await run('step',env,storage,options)).alert,'already_attempted');assert.equal(sends,1);
});
test('provider/DB failures remain visible, never alter stale state, and uncertain alerts are not duplicated',async()=>{
 let sends=0;const storage=receipts();
 const options={store:{read:async()=>{throw Error('private database details');}},refresh:async()=>{throw Error('provider key');},
  now:()=>at,send:async()=>{sends++;throw Error('ambiguous');}};
 const result=await run('step',env,storage,options);
 assert.equal(result.outcome,'catalog_state_read_failed');assert.equal(result.health,'missing');assert.equal(result.alert,'delivery_uncertain');
 assert.doesNotMatch(JSON.stringify(result),/private|provider key/);
 await run('step',env,storage,options);assert.equal(sends,1);
});
