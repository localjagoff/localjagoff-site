const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPreparation}=require('../lib/production-preparation.cjs');
const env={COMMERCE_ENV:'production',CLOUDFLARE_WORKER_NAME:'localjagoff-production',COMMERCE_PRODUCTION_WORKER:'localjagoff-production',
  SITE_URL:'https://www.localjagoff.com',COMMERCE_EXECUTOR_ENABLED:'true',CHECKOUT_PAUSED:'true',
  COMMUNICATIONS_ENABLED:'false',CUSTOMER_EMAIL_ENABLED:'false'};
for(const key of ['DATABASE_URL','PRINTFUL_API_KEY','PRINTFUL_WEBHOOK_API_KEY','STRIPE_WEBHOOK_SECRET','COMMUNICATIONS_SECRET','CRON_SECRET'])env[key]='synthetic-fixture-not-a-key-'+key;
env.STRIPE_SECRET_KEY='sk_live_synthetic_fixture_only';env.RESEND_API_KEY='re_synthetic_fixture_only';
const blocked=()=>assert.fail('No provider or database operation permitted');
test('production preparation closes before I/O when any runtime gate changes',async()=>{
  for(const [name,value]of Object.entries({COMMERCE_ENV:'preview',CLOUDFLARE_WORKER_NAME:'other',SITE_URL:'https://other.invalid',
    COMMERCE_EXECUTOR_ENABLED:'false',CHECKOUT_PAUSED:'false',COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true'})){
    const api=createPreparation({...env,[name]:value},{fetchImpl:blocked,query:blocked,refresh:blocked,read:blocked});
    for(const action of ['preflight','catalog-step','catalog-status','webhook-stage','signing-status'])assert.equal((await api.run(action)).outcome,'production_preparation_closed');
  }
  assert.equal((await createPreparation(env,{fetchImpl:blocked}).run('send-email')).outcome,'unsupported_preparation_action');
});

test('webhook staging preserves existing credentials/config and creates zero subscriptions with encrypted-only signing material',async()=>{
  const crypto=require('node:crypto');
  const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const spki=publicKey.export({format:'der',type:'spki'}).toString('base64');
  const calls=[];
  const signature='ab'.repeat(32);
  const api=createPreparation(env,{fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.printful.com/v2/webhooks');calls.push(options.method);
    if(options.method==='GET')return Response.json({data:[]});
    const payload=JSON.parse(options.body);
    assert.deepEqual(payload,{default_url:'https://www.localjagoff.com/api/printful-events',expires_at:'2027-09-07T00:00:00Z',events:[]});
    return Response.json({data:{...payload,secret_key:signature,public_key:'synthetic-public-fixture'}});
  }});
  const result=await api.run('webhook-stage',spki);
  assert.equal(result.outcome,'webhook_staged_no_events');assert.deepEqual(calls,['GET','POST']);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(signature+'|synthetic-public-fixture'));
  const raw=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(result.encrypted.key,'base64'));
  const key=await crypto.webcrypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  const decoded=await crypto.webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(result.encrypted.iv,'base64')},key,Buffer.from(result.encrypted.data,'base64'));
  assert.deepEqual(JSON.parse(Buffer.from(decoded)),{PRINTFUL_WEBHOOK_SECRET:signature,PRINTFUL_WEBHOOK_PUBLIC_KEY:'synthetic-public-fixture'});
  for(const name of ['PRINTFUL_WEBHOOK_SECRET','PRINTFUL_WEBHOOK_PUBLIC_KEY']){
    const result=await createPreparation({...env,[name]:'already-set'},{fetchImpl:blocked}).run('webhook-stage',spki);
    assert.equal(result.outcome,'existing_signing_keys_preserved');
  }
  const existing=createPreparation(env,{fetchImpl:async()=>Response.json({data:{default_url:'https://existing.invalid',events:[]}})});
  assert.equal((await existing.run('webhook-stage',spki)).outcome,'existing_webhook_configuration_preserved');
  assert.equal((await existing.run('webhook-stage',{publicKey:spki,recoverEmpty:true})).outcome,'existing_webhook_configuration_preserved');
  const recoveryCalls=[];
  const recover=createPreparation(env,{fetchImpl:async(url,options)=>{
    recoveryCalls.push(options.method);
    return Response.json({data:{default_url:'https://www.localjagoff.com/api/printful-events',events:[],
      secret_key:signature,public_key:'synthetic-public-fixture'}});
  }});
  assert.equal((await recover.run('webhook-stage',spki)).outcome,'existing_webhook_configuration_preserved');
  assert.deepEqual(recoveryCalls,['GET']);recoveryCalls.length=0;
  assert.equal((await recover.run('webhook-stage',{publicKey:spki,recoverEmpty:true})).outcome,'webhook_staged_no_events');
  assert.deepEqual(recoveryCalls,['GET','POST']);
  assert.equal((await createPreparation(env,{fetchImpl:blocked}).run('webhook-stage','invalid')).outcome,'production_preparation_failed');
});

test('signing status verifies the installed pair against the provider without returning either key',async()=>{
  const signingEnv={...env,PRINTFUL_WEBHOOK_SECRET:'ab'.repeat(32),PRINTFUL_WEBHOOK_PUBLIC_KEY:'synthetic-public-fixture'};
  const api=createPreparation(signingEnv,{fetchImpl:async(url,options)=>{
    assert.equal(options.method,'GET');assert.equal(url,'https://api.printful.com/v2/webhooks');
    return Response.json({data:{public_key:signingEnv.PRINTFUL_WEBHOOK_PUBLIC_KEY,default_url:'https://www.localjagoff.com/api/printful-events',events:[]}});
  }});
  const result=await api.run('signing-status');assert.equal(result.outcome,'signing_staged_pass');
  assert.doesNotMatch(JSON.stringify(result),/synthetic|abab/);assert.equal(result.providerMutations,0);
});
test('preflight is GET-only, exact scoped, and never returns provider keys or customer objects',async()=>{
  const seen=[];
  const api=createPreparation(env,{fetchImpl:async(url,opts)=>{
    assert.equal(opts.method,'GET');assert.equal(opts.redirect,'manual');seen.push(url);
    if(url.endsWith('/stores'))return Response.json({result:[{id:18032822,name:'must not leak'}]});
    if(url.endsWith('/oauth/scopes'))return Response.json({result:{scopes:(opts.headers.authorization.endsWith('PRINTFUL_API_KEY')?
      ['orders','sync_products/read']:['webhooks']).map(scope=>({scope}))}});
    if(url.endsWith('/v2/webhooks'))return Response.json({data:{secret_key:'never-return-this',public_key:'nor-this',
      default_url:'https://localjagoff-review.localjagoff-site.workers.dev/api/printful-events',events:[{}]}});
    if(url.endsWith('/v1/account'))return Response.json({id:'acct_1TN0vR2MvN1ioVod',business_profile:{name:'private'}});
    return blocked();
  },query:async(sql)=>{assert.match(sql,/^SELECT/);return [{tables:7,orders:0,outbox:0}];}});
  const result=await api.run('preflight');assert.equal(result.outcome,'production_preflight_pass');assert.equal(seen.length,6);
  assert.equal(result.webhookTarget,'review');assert.equal(result.emailSent,false);assert.equal(result.providerMutations,0);
  assert.doesNotMatch(JSON.stringify(result),/never-return|nor-this|private|synthetic|must not leak/);
});
test('catalog preparation permits only one existing bounded refresh step and sanitized status',async()=>{
  let steps=0;const api=createPreparation(env,{fetchImpl:blocked,query:blocked,
    refresh:async e=>{assert.equal(e,env);steps++;return {outcome:'catalog_product_refreshed'};},
    read:async()=>[{variants:[{},{}],privateField:'do-not-return'}]});
  assert.equal((await api.run('catalog-step')).outcome,'catalog_product_refreshed');assert.equal(steps,1);
  assert.deepEqual(await api.run('catalog-status'),{outcome:'catalog_ready',products:1,variants:2});
});
test('missing keys and provider failures fail closed with sanitized details',async()=>{
  assert.equal((await createPreparation({...env,RESEND_API_KEY:''},{fetchImpl:blocked}).run('preflight')).outcome,'missing_production_configuration');
  const failure=await createPreparation(env,{fetchImpl:async()=>{throw Error('secret-and-customer-data');}}).run('preflight');
  assert.deepEqual(failure,{outcome:'production_preparation_failed',detailsWithheld:true});
});
