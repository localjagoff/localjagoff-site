const {test}=require('node:test');
const assert=require('node:assert/strict');
const verification=require('../lib/cloudflare-review-verification.cjs');
const {hash}=require('../lib/communications-store.cjs');
const {installBudget,withBudget}=require('../lib/invocation-budget.cjs');
const schema=require('../lib/communications-schema.cjs');
const KEY='verification/owner-cloudflare-scheduler-v1';
const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',CHECKOUT_PAUSED:'true',
  CUSTOMER_EMAIL_ENABLED:'false',CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()+1800000).toISOString(),
  CRON_SECRET:'fixture-only-'.repeat(4),DATABASE_URL:'postgresql://fixture:fixture@fixture.neon.tech/fixture',RESEND_API_KEY:'fixture'};
const forbidden=()=>assert.fail('Unexpected real provider or database access');
const req=(body='queue',authorization='Bearer '+env.CRON_SECRET)=>new Request('https://review.example.test/api/internal/cloudflare-review-verification',{
  method:'POST',headers:{authorization},body,
});
const blocked={sqlFactory:forbidden,storeFactory:forbidden,fetchImpl:forbidden};
async function fixture(){
  let job;const finishes=[],sends=[];
  const store={
    enqueue:async(key,kind,order_ref,payload)=>{job={key,kind,order_ref,payload,payload_hash:hash(payload),attempts:1,claim_token:'fixture'};},
    claim:async key=>{assert.equal(key,KEY);return job;},mailQuota:async()=>true,markAttempt:async()=>new Date(),
    finish:async(j,status,options)=>{finishes.push({status,options});if(status==='sent')job=null;},
  };
  assert.equal((await verification.request(req(),env,{storeFactory:()=>store})).status,200);
  const options={storeFactory:()=>store,fetchImpl:async(url,init)=>{
    sends.push({url,init});return Response.json({id:'00000000-0000-4000-8000-000000000001'});
  }};
  return {store,options,finishes,sends,get job(){return job;}};
}

test('verification rejects production, unpaused, customer-mail enabled, expired and oversized windows before access',async()=>{
  for(const change of [{CLOUDFLARE_WORKER_NAME:'localjagoff-production'},{COMMERCE_ENV:'production'},
    {CHECKOUT_PAUSED:'false'},{CUSTOMER_EMAIL_ENABLED:'true'},{CLOUDFLARE_REVIEW_VERIFY_UNTIL:''},
    {CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()-1).toISOString()},
    {CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()+7200000).toISOString()}]){
    const closed={...env,...change};
    const response=await verification.request(req('migrate'),closed,blocked);
    assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await verification.scheduled(closed,blocked)).outcome,'verification_closed');
  }
});

test('verification requires POST and exact Bearer CRON authentication; raw secrets never authenticate',async()=>{
  for(const auth of ['',env.CRON_SECRET,'Basic '+env.CRON_SECRET,'Bearer wrong']){
    assert.equal((await verification.request(req('migrate',auth),env,blocked)).status,401);
  }
  assert.equal((await verification.request(new Request('https://review.example.test',{headers:{authorization:'Bearer '+env.CRON_SECRET}}),env,blocked)).status,401);
  assert.equal((await verification.request(req(),{...env,CRON_SECRET:'short'},blocked)).status,401);
});

test('verification accepts only three fixed bounded commands, never caller-supplied mail or SQL',async()=>{
  for(const body of ['', 'queue\n','SELECT 1','{"to":"a@b.co"}']){
    assert.equal((await verification.request(req(body),env,blocked)).status,400);
  }
  assert.equal((await verification.request(req('x'.repeat(4096)),env,blocked)).status,413);
});

test('migration uses the real Neon SDK in exactly one mocked HTTP transaction for the complete schema',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=installBudget(async(url,init)=>{
    calls++;assert.equal(new URL(url).hostname,'api.neon.tech');assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');
    const {queries}=JSON.parse(init.body);
    assert.deepEqual(queries.map(q=>q.query),schema);
    return Response.json({results:queries.map(()=>({fields:[],rows:[],rowCount:0,command:'CREATE'}))});
  });
  try{
    const result=await withBudget(()=>verification.request(req('migrate'),env),{info(){}});
    assert.equal(result.status,200);assert.equal((await result.json()).outcome,'schema_ready');assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});

test('queue and scheduled verification use only the fixed owner recipient and stable key; completed job cannot replay',async()=>{
  const f=await fixture();assert.equal(f.job.key,KEY);assert.equal(f.job.kind,'contact');assert.equal(f.job.order_ref,null);
  assert.deepEqual(f.job.payload.to,['hello@localjagoff.com']);
  assert.equal((await verification.scheduled(env,f.options)).outcome,'owner_verification_sent');
  assert.equal((await verification.scheduled(env,f.options)).outcome,'owner_verification_no_due_job');
  assert.equal(f.sends.length,1);assert.equal(f.sends[0].url,'https://api.resend.com/emails');
  assert.equal(f.sends[0].init.headers['idempotency-key'],KEY);assert.equal(f.sends[0].init.redirect,'error');
  assert.deepEqual(JSON.parse(f.sends[0].init.body).to,['hello@localjagoff.com']);
});

test('tampered recipient, key, kind, order identity and expired send window hold without provider access',async()=>{
  for(const change of [
    job=>{job.payload.to=['customer@example.test'];job.payload_hash=hash(job.payload);},
    job=>{job.key='arbitrary';},job=>{job.kind='review';},job=>{job.order_ref='real-order';},
    job=>{job.first_attempt_at=new Date(Date.now()-24*3600000).toISOString();},
  ]){
    const f=await fixture();change(f.job);
    assert.equal((await verification.scheduled(env,{...f.options,fetchImpl:forbidden})).outcome,'held');
    assert.equal(f.finishes[0].status,'held');
  }
});

test('expiry during quota or attempt persistence prevents provider send',async()=>{
  for(const stage of ['mailQuota','markAttempt']){
    const f=await fixture();let now=Date.now();
    f.store[stage]=async()=>{now=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL)+1;return true;};
    assert.equal((await verification.scheduled(env,{...f.options,now:()=>now,fetchImpl:forbidden})).outcome,'verification_closed');
    assert.equal(f.finishes[0].status,'held');
  }
});

test('provider acceptance followed by persistence failure preserves lease and never switches to pending',async()=>{
  const f=await fixture();
  f.store.finish=async(job,status)=>{f.finishes.push({status});throw new Error('fixture persistence failure');};
  await assert.rejects(verification.scheduled(env,f.options),/fixture persistence failure/);
  assert.equal(f.sends.length,1);assert.deepEqual(f.finishes,[{status:'sent'}]);
});

test('terminal rejection holds; transport failure retries the same fixed job',async()=>{
  const f=await fixture();
  assert.equal((await verification.scheduled(env,{...f.options,fetchImpl:async()=>Response.json({error:'fixture'},{status:422})})).outcome,'held');
  assert.equal(f.finishes[0].status,'held');
  const g=await fixture();
  assert.equal((await verification.scheduled(env,{...g.options,fetchImpl:async()=>{throw new Error('fixture offline');}})).outcome,'owner_verification_retry');
  assert.equal(g.finishes[0].status,'pending');assert.equal(g.job.key,KEY);
});

test('contact-only window cannot queue owner mail, migrate or inspect providers; scope and expiry fail closed',async()=>{
  const contactEnv={...env,SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',
    CLOUDFLARE_REVIEW_VERIFY_UNTIL:'',CLOUDFLARE_CONTACT_VERIFY_UNTIL:new Date(Date.now()+600000).toISOString()};
  assert.equal(verification.contactEnabled(contactEnv),true);
  for(const body of ['queue','migrate','status','provider-status','fixtures','catalog-wake']){
    assert.equal((await verification.request(req(body),contactEnv,blocked)).status,404);
  }
  for(const change of [{SITE_URL:'https://www.localjagoff.com'},{COMMERCE_ENV:'production'},
    {CLOUDFLARE_WORKER_NAME:'localjagoff-production'},{CHECKOUT_PAUSED:'false'},
    {CUSTOMER_EMAIL_ENABLED:'true'},{CLOUDFLARE_CONTACT_VERIFY_UNTIL:new Date(Date.now()-1).toISOString()}]){
    assert.equal(verification.contactEnabled({...contactEnv,...change}),false);
    assert.equal((await verification.scheduled({...contactEnv,...change},blocked)).outcome,'verification_closed');
  }
  const response=await verification.request(req('contact-status'),contactEnv,{storeFactory:()=>({query:async(sql,params)=>{
    assert.equal(sql,'SELECT status,attempts,provider_id,sent_at FROM comm_outbox WHERE key=$1');
    assert.deepEqual(params,[verification.CONTACT_KEY]);return [];
  }})});
  assert.equal(response.status,200);
});

test('contact verification sends only the exact Contact-generated owner payload and preserves stable idempotency',async()=>{
  const contactEnv={...env,SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',
    CLOUDFLARE_REVIEW_VERIFY_UNTIL:'',CLOUDFLARE_CONTACT_VERIFY_UNTIL:new Date(Date.now()+600000).toISOString()};
  for(const tamper of [false,true]){
    const payload=require('../lib/customer-mail.cjs').contactEmail(verification.CONTACT_FIELDS);
    if(tamper)payload.text+=' changed';
    let job={key:verification.CONTACT_KEY,kind:'contact',order_ref:null,payload,payload_hash:hash(payload),attempts:1};
    let sends=0;
    const store={claim:async key=>{assert.equal(key,verification.CONTACT_KEY);return job;},
      mailQuota:async()=>true,markAttempt:async()=>true,finish:async(j,status)=>{
        assert.equal(status,tamper?'held':'sent');job=null;
      }};
    const options={storeFactory:()=>store,fetchImpl:async(url,init)=>{
      sends++;assert.equal(url,'https://api.resend.com/emails');
      assert.deepEqual(JSON.parse(init.body),require('../lib/customer-mail.cjs').contactEmail(verification.CONTACT_FIELDS));
      assert.equal(init.headers['idempotency-key'],verification.CONTACT_KEY);
      return Response.json({id:'00000000-0000-4000-8000-000000000002'});
    }};
    assert.equal((await verification.scheduled(contactEnv,options)).outcome,tamper?'held':'owner_verification_sent');
    assert.equal((await verification.scheduled(contactEnv,options)).outcome,'owner_verification_no_due_job');
    assert.equal(sends,tamper?0:1);
  }
});
