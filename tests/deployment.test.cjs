const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isProduction}=require('../lib/deployment.cjs');
const {assertCheckoutEnvironment}=require('../lib/commerce.cjs');
const {fulfillEvent}=require('../lib/fulfillment.cjs');
const {trustedIP,allowedOrigins}=require('../lib/contact-handler.cjs');
const {deliver}=require('../lib/communications-queue.cjs');
const {runCommunications}=require('../lib/communications-runner.cjs');
const {trigger,work}=require('../lib/netlify-communications.cjs');
const forbidden=()=>assert.fail('Forbidden provider/storage access');
const logger={info(){},error(){}};
const preview={SITE_ID:'review-site',SITE_NAME:'review',URL:'https://review.netlify.app',
  SITE_URL:'https://review.netlify.app',COMMERCE_ENV:'preview',CRON_SECRET:'fixture-only'.repeat(4)};

test('Cloudflare production requires every pinned setting; blank worker markers never fall through to another host',()=>{
  const live={CLOUDFLARE_WORKER_NAME:'localjagoff-production',COMMERCE_PRODUCTION_WORKER:'localjagoff-production',
    COMMERCE_ENV:'production',SITE_URL:'https://www.localjagoff.com'};
  assert.equal(isProduction(live),true);
  for(const change of [{CLOUDFLARE_WORKER_NAME:''},{CLOUDFLARE_WORKER_NAME:'localjagoff-review'},
    {COMMERCE_PRODUCTION_WORKER:''},{COMMERCE_PRODUCTION_WORKER:'other'},{COMMERCE_ENV:'preview'},
    {SITE_URL:'https://attacker.test'},{SITE_URL:'http://www.localjagoff.com'}]){
    assert.equal(isProduction({...live,...change,VERCEL_ENV:'production',SITE_ID:'review-site',COMMERCE_PRODUCTION_SITE_ID:'review-site'}),false);
  }
  assert.equal(isProduction({CLOUDFLARE_WORKER_NAME:'',VERCEL_ENV:'production'}),false);
  assert.equal(isProduction({COMMERCE_PRODUCTION_WORKER:'localjagoff-production',VERCEL_ENV:'production'}),false);
});

test('Cloudflare contact trusts only CF connecting IP and a configured HTTPS origin',()=>{
  const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',SITE_URL:'https://review.example.test'};
  assert.deepEqual(allowedOrigins(env),['https://review.example.test']);
  for(const site of ['', 'http://review.example.test','https://user:pass@review.example.test','https://review.example.test/path','https://review.example.test?query=1']){
    assert.deepEqual(allowedOrigins({...env,SITE_URL:site}),[]);
  }
  const req={headers:{'x-forwarded-for':'192.0.2.1','x-nf-client-connection-ip':'192.0.2.2',
    'x-vercel-forwarded-for':'192.0.2.3'},socket:{remoteAddress:'127.0.0.1'}};
  assert.equal(trustedIP(req,env),null);assert.equal(trustedIP(req,{...env,CLOUDFLARE_WORKER_NAME:''}),null);
  req.headers['cf-connecting-ip']='2001:db8::1';assert.equal(trustedIP(req,env),'2001:db8::1');
  req.headers['cf-connecting-ip']='192.0.2.1,192.0.2.2';assert.equal(trustedIP(req,env),null);
});

test('Cloudflare Preview cannot enter normal mail or communications work even with inherited live flags',async()=>{
  const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',VERCEL_ENV:'production',
    CUSTOMER_EMAIL_ENABLED:'true',COMMUNICATIONS_ENABLED:'true'};
  assert.equal((await deliver({claim:forbidden},{env,send:forbidden})).outcome,'sending_disabled');
  assert.equal((await runCommunications({env,storeFactory:forbidden,serviceFactory:forbidden})).outcome,'sending_disabled');
});

test('only an explicitly configured review build receives search exclusion headers',async()=>{
  const original=process.env.COMMERCE_ENV;
  const config=require('../next.config.js');
  try {
    process.env.COMMERCE_ENV='preview';
    assert.deepEqual(await config.headers(),[{source:'/:path*',
      headers:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}]}]);
    process.env.COMMERCE_ENV='production';assert.deepEqual(await config.headers(),[]);
    delete process.env.COMMERCE_ENV;assert.deepEqual(await config.headers(),[]);
  } finally {
    if(original===undefined) delete process.env.COMMERCE_ENV;else process.env.COMMERCE_ENV=original;
  }
});

test('Netlify live access requires production role and matching pinned site, never just NODE_ENV/CONTEXT',()=>{
  for (const env of [{},{NODE_ENV:'production'},{CONTEXT:'production'},preview,
    {...preview,VERCEL_ENV:'production'}, {...preview,COMMERCE_ENV:'production'},
    {...preview,COMMERCE_ENV:'production',COMMERCE_PRODUCTION_SITE_ID:'other-site'}]) {
    assert.equal(isProduction(env),false);
    assert.throws(()=>assertCheckoutEnvironment({...env,STRIPE_SECRET_KEY:'sk_live_fixture'}));
  }
  assert.equal(isProduction({...preview,COMMERCE_ENV:'production',COMMERCE_PRODUCTION_SITE_ID:'review-site'}),true);
  assert.equal(isProduction({VERCEL_ENV:'production'}),true);
  assert.doesNotThrow(()=>assertCheckoutEnvironment({...preview,STRIPE_SECRET_KEY:'sk_test_fixture'}));
});
test('Netlify request origin and connecting IP use explicit host configuration only',()=>{
  assert.deepEqual(allowedOrigins(preview),['https://review.netlify.app']);
  assert.deepEqual(allowedOrigins({SITE_ID:'review-site'}),[]);
  const req={headers:{'x-forwarded-for':'192.0.2.1','x-vercel-forwarded-for':'192.0.2.2'},socket:{remoteAddress:'127.0.0.1'}};
  assert.equal(trustedIP(req,preview),null);
  req.headers['x-nf-client-connection-ip']='192.0.2.3';assert.equal(trustedIP(req,preview),'192.0.2.3');
  req.headers['x-nf-client-connection-ip']='192.0.2.3,192.0.2.4';assert.equal(trustedIP(req,preview),null);
});
test('Netlify TEST fulfillment, outbox and runner cannot enter live storage/provider/email paths',async()=>{
  const env={...preview,CUSTOMER_EMAIL_ENABLED:'true',COMMUNICATIONS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_fixture'};
  const event={id:'evt_fixture',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_fixture'}}};
  const options={env,logger,stripe:forbidden,fetchImpl:forbidden,sendEmail:forbidden,recordPaid:forbidden};
  assert.equal((await fulfillEvent(event,options)).skipped,'test_mode_no_printful');
  await assert.rejects(fulfillEvent({...event,livemode:true},options),/environment mismatch/);
  assert.equal((await deliver({claim:forbidden},{env,send:forbidden})).outcome,'sending_disabled');
  assert.equal((await runCommunications({env,storeFactory:forbidden,serviceFactory:forbidden,dispatch:forbidden})).outcome,'sending_disabled');
});
test('Netlify scheduler dispatches only to its own HTTPS site, with secret header and no redirects',async()=>{
  await trigger({env:preview,logger,fetchImpl:async(url,options)=>{
    assert.equal(url,'https://review.netlify.app/.netlify/functions/communications-worker');
    assert.equal(options.headers.Authorization,`Bearer ${preview.CRON_SECRET}`);
    assert.equal(options.redirect,'error');assert.equal(options.method,'POST');return {status:202};
  }});
  for (const change of [{URL:'https://attacker.test'},{URL:'http://review.netlify.app'},{CRON_SECRET:''},{SITE_ID:''}]) {
    await assert.rejects(trigger({env:{...preview,...change},logger,fetchImpl:forbidden}),/configuration_invalid/);
  }
  await assert.rejects(trigger({env:preview,logger,fetchImpl:async()=>({status:401})}),/dispatch_failed/);
});
test('Netlify background worker authenticates before work and never treats a transport ACK as success',async()=>{
  for (const headers of [{},{authorization:'Bearer wrong'},{authorization:preview.CRON_SECRET}]) {
    await work(new Request(preview.URL,{method:'POST',headers}),{env:preview,run:forbidden,logger});
  }
  const req=new Request(preview.URL,{method:'POST',headers:{authorization:`Bearer ${preview.CRON_SECRET}`}});
  let calls=0;await work(req,{env:preview,run:async({env})=>{calls++;assert.equal(env,preview);return {outcome:'sending_disabled'};},logger});
  assert.equal(calls,1);
  await assert.rejects(work(req,{env:preview,run:async()=>{throw new Error('private provider detail');},logger}),/communications_worker_incomplete/);
});

test('native worker uses the fixed owner scheduler check only after authentication in explicitly enabled review',async()=>{
  const env={...preview,OWNER_SCHEDULER_VERIFICATION_ENABLED:'true'};
  await work(new Request(preview.URL,{method:'POST'}),{env,run:forbidden,verifyOwner:forbidden,logger});
  const req=new Request(preview.URL,{method:'POST',headers:{authorization:`Bearer ${preview.CRON_SECRET}`}});
  let calls=0;
  await work(req,{env,run:forbidden,logger,verifyOwner:async(request,options)=>{calls++;assert.equal(request,req);assert.equal(options.mode,'scheduler');assert.equal(options.env,env);return Response.json({outcome:'already_queued_or_completed'});}});
  assert.equal(calls,1);
  await work(req,{env:{...env,OWNER_SCHEDULER_VERIFICATION_ENABLED:'false'},run:async()=>({outcome:'sending_disabled'}),verifyOwner:forbidden,logger});
  await work(req,{env:{...env,COMMERCE_ENV:'production'},run:async()=>({outcome:'sending_disabled'}),verifyOwner:forbidden,logger});
  await assert.rejects(work(req,{env,run:forbidden,logger,verifyOwner:async()=>Response.json({outcome:'provider_rejected'},{status:502})}),/communications_worker_incomplete/);
});
