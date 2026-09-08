const {test}=require('node:test');
const assert=require('node:assert/strict');
const {subscriptions}=require('../lib/production-webhook-subscriptions.cjs');
const {createPreparation}=require('../lib/production-preparation.cjs');
const {EVENTS}=require('../lib/customer-lifecycle.cjs');
const env={PRINTFUL_WEBHOOK_API_KEY:'synthetic-token',PRINTFUL_WEBHOOK_PUBLIC_KEY:'synthetic-public-key',
  PRINTFUL_WEBHOOK_SECRET:'ab'.repeat(32)};
const initial=()=>({default_url:'https://www.localjagoff.com/api/printful-events',
  public_key:env.PRINTFUL_WEBHOOK_PUBLIC_KEY,expires_at:'2027-09-07T00:00:00Z',events:[]});
const blocked=()=>assert.fail('I/O forbidden');

test('subscriptions preserve signing keys, add one exact event per call and replay without writes',async()=>{
  const config=initial(),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push([url,options.method]);
    assert.equal(options.redirect,'manual');
    if(options.method==='POST'){
      const body=JSON.parse(options.body);
      assert.ok(EVENTS.has(body.type));
      assert.equal(url,'https://api.printful.com/v2/webhooks/'+body.type);
      assert.deepEqual(body,{type:body.type,url:config.default_url,params:[]});
      config.events.push(body);
    }else assert.equal(url,'https://api.printful.com/v2/webhooks');
    return Response.json({data:config});
  };
  for(const event of EVENTS){
    const result=await subscriptions(env,event,{fetchImpl});
    assert.equal(result.providerMutations,1);assert.equal(result.signingKeyPreserved,true);
    assert.doesNotMatch(JSON.stringify(result),/synthetic|abab/);
  }
  assert.equal(calls.length,27);
  const result=await subscriptions(env,undefined,{fetchImpl});
  assert.equal(result.outcome,'lifecycle_subscriptions_ready');assert.deepEqual(result.missing,[]);
  assert.equal((await subscriptions(env,'shipment_sent',{fetchImpl})).providerMutations,0);
  assert.equal(calls.filter(([,method])=>method==='POST').length,9);
});

test('unknown events, mismatched signing/target/expiry and unrelated subscriptions are preserved',async()=>{
  assert.equal((await subscriptions(env,'catalog_stock_updated',{fetchImpl:blocked})).outcome,'unsupported_lifecycle_event');
  for(const patch of [{public_key:'different'},{default_url:'https://other.invalid'},
    {expires_at:'2026-01-01T00:00:00Z'},{events:[{type:'unknown',params:[]}]},
    {events:[{type:'shipment_sent',url:'https://other.invalid',params:[]}]}]){
    const result=await subscriptions(env,'shipment_sent',{fetchImpl:async(_,options)=>{
      assert.equal(options.method,'GET');return Response.json({data:{...initial(),...patch}});
    }});
    assert.equal(result.outcome,'subscription_configuration_mismatch');assert.equal(result.providerMutations,0);
  }
  assert.equal((await subscriptions({...env,PRINTFUL_WEBHOOK_SECRET:''},'shipment_sent',{fetchImpl:blocked})).outcome,'missing_signing_configuration');
  const result=await createPreparation({...env,COMMERCE_ENV:'preview'},{fetchImpl:blocked}).run('lifecycle-subscriptions','shipment_sent');
  assert.equal(result.outcome,'production_preparation_closed');
});

test('uncertain provider write never retries or claims success',async()=>{
  const calls=[];
  const result=await subscriptions(env,'shipment_sent',{fetchImpl:async(_,options)=>{
    calls.push(options.method);return options.method==='GET'?Response.json({data:initial()}):new Response('',{status:503});
  }});
  assert.equal(result.outcome,'subscription_write_uncertain');assert.deepEqual(calls,['GET','POST']);
});
