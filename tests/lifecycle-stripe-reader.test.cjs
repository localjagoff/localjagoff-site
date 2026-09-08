const {test}=require('node:test');
const assert=require('node:assert/strict');
const Stripe=require('stripe');
const {createLifecycleStripe,API_VERSION}=require('../lib/lifecycle-stripe-reader.cjs');
const env={VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_live_fixture'};
const expand={expand:['payment_intent.latest_charge']};
test('bounded lifecycle reader matches pinned SDK session URL, expansion, version and payload',async()=>{
  const calls=[],body={id:'cs_fixture',livemode:true,payment_intent:{latest_charge:{refunded:false}}};
  const fetchImpl=async(url,init)=>{calls.push({url,init});return Response.json(body);};
  const sdk=new Stripe(env.STRIPE_SECRET_KEY,{maxNetworkRetries:0,httpClient:Stripe.createFetchHttpClient(fetchImpl)});
  assert.deepEqual(await sdk.checkout.sessions.retrieve('cs_fixture',expand),body);
  assert.deepEqual(await createLifecycleStripe(env,{fetchImpl}).checkout.sessions.retrieve('cs_fixture',expand),body);
  const urls=calls.map(c=>new URL(c.url));
  assert.equal(urls[0].origin+urls[0].pathname,urls[1].origin+urls[1].pathname);
  assert.deepEqual([...urls[0].searchParams],[...urls[1].searchParams]);
  assert.equal(new Headers(calls[0].init.headers).get('stripe-version'),API_VERSION);
  assert.equal(new Headers(calls[1].init.headers).get('stripe-version'),API_VERSION);
  assert.equal(calls[1].init.method,'GET');assert.equal(calls[1].init.redirect,'error');
});
test('reader rejects nonproduction/test keys/invalid identity or expansion before fetch',async()=>{
  const fetchImpl=()=>assert.fail('must not access provider');
  for(const e of [{...env,VERCEL_ENV:'preview'},{...env,STRIPE_SECRET_KEY:'sk_test_fixture'},
    {...env,CLOUDFLARE_WORKER_NAME:'localjagoff-review'}]){
    await assert.rejects(createLifecycleStripe(e,{fetchImpl}).checkout.sessions.retrieve('cs_fixture',expand),/environment_required/);
  }
  for(const [id,opts] of [['cs_../secret',expand],['cs_fixture',{}],['cs_fixture',{expand:['customer']}],['cs_fixture',{expand:['payment_intent.latest_charge','customer']}]]){
    await assert.rejects(createLifecycleStripe(env,{fetchImpl}).checkout.sessions.retrieve(id,opts),/invalid_lifecycle/);
  }
});
test('provider errors, malformed JSON and oversized responses fail closed without retry or error-body disclosure',async()=>{
  for(const response of [new Response('private provider detail',{status:429}),new Response('bad json'),new Response('x'.repeat(262145))]){
    let count=0;
    await assert.rejects(createLifecycleStripe(env,{fetchImpl:async()=>{count++;return response;}}).checkout.sessions.retrieve('cs_fixture',expand),/^Error: payment_read_unavailable$/);
    assert.equal(count,1);
  }
});
