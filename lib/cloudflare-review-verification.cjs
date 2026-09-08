const {equal}=require('./communications-auth.cjs');
const {ORDER_SENDER,SUPPORT}=require('./customer-mail.cjs');
const KEY='verification/owner-cloudflare-scheduler-v1';
const CONTACT_FIELDS=Object.freeze({name:'Cloudflare Contact Verification',email:SUPPORT,topic:'other',
  message:'OWNER-ONLY CONTACT DELIVERY CHECK. Submitted through the Cloudflare review Contact endpoint. No purchase, customer order or fulfillment was created.',
  orderNumber:'',requestId:'47764c42-f5a0-4f83-bd60-4352609ba6ae',honeypot:false});
const CONTACT_KEY='contact/'+CONTACT_FIELDS.requestId;
const capacity=require('./cloudflare-capacity-verification.cjs');
function enabled(env,now=Date.now()){
  const until=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL||'');
  return env.CLOUDFLARE_WORKER_NAME==='localjagoff-review'&&env.COMMERCE_ENV==='preview'&&
    env.CUSTOMER_EMAIL_ENABLED==='false'&&Number.isFinite(until)&&until>now&&until<=now+3600000;
}
function idleEnabled(env,now=Date.now()){
  return enabled({...env,CLOUDFLARE_REVIEW_VERIFY_UNTIL:env.CLOUDFLARE_IDLE_VERIFY_UNTIL},now)&&
    env.CHECKOUT_PAUSED==='true'&&env.COMMUNICATIONS_IDLE_GATE==='true'&&
    require('./catalog-snapshot.cjs').configured(env);
}
function contactEnabled(env,now=Date.now()){
  return enabled({...env,CLOUDFLARE_REVIEW_VERIFY_UNTIL:env.CLOUDFLARE_CONTACT_VERIFY_UNTIL},now)&&
    env.SITE_URL==='https://localjagoff-review.localjagoff-site.workers.dev'&&env.CHECKOUT_PAUSED==='true';
}
async function idleScheduled(env,{storeFactory}={}){
  if(!idleEnabled(env))return {outcome:'idle_verification_disabled'};
  const {createStore}=require('./communications-store.cjs');
  storeFactory??=()=>createStore({...env,COMMUNICATIONS_ENABLED:'true'});
  return require('./communications-wake.cjs').run({env,mode:'fast',storeFactory,
    execute:async()=>{await storeFactory().nextFastDue();return {outcome:'read_only_due_checked'};}});
}
function mail(){return {from:ORDER_SENDER,to:[SUPPORT],reply_to:SUPPORT,
  subject:'Local Jagoff - owner-only Cloudflare scheduler verification',
  text:'OWNER-ONLY CLOUDFLARE SCHEDULER TEST. The native Cloudflare timer claimed this fixed durable job. No real payment, Printful order or customer email was created. This verifies the hosting migration only; completed domain authentication tests remain closed.'};}
const reply=(status,body)=>new Response(body===undefined?null:JSON.stringify(body),{
  status,headers:{'cache-control':'no-store','x-robots-tag':'noindex','content-type':'application/json'},
});
async function request(req,env,{sqlFactory,storeFactory,fetchImpl=fetch,now=Date.now}={}){
  const catalogWindow=()=>enabled({...env,CLOUDFLARE_REVIEW_VERIFY_UNTIL:env.CLOUDFLARE_CATALOG_VERIFY_UNTIL},now());
  if((!enabled(env,now())&&!catalogWindow()&&!contactEnabled(env,now())&&!capacity.enabled(env,now()))||env.CHECKOUT_PAUSED!=='true')return reply(404);
  const supplied=/^Bearer (.+)$/.exec(req.headers.get('authorization')||'')?.[1];
  if(req.method!=='POST'||(env.CRON_SECRET||'').length<32||!equal(supplied,env.CRON_SECRET))return reply(401);
  let body='',size=0;
  if(req.body){
    const reader=req.body.getReader();
    try{
      for(;;){
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;
        if(size>16){await reader.cancel();return reply(413);}
        body+=Buffer.from(value).toString('utf8');
      }
    }catch{return reply(400);}finally{reader.releaseLock();}
  }
  if(['capacity-seed','capacity-status','capacity-freeze'].includes(body)||/^capacity-r(?:[0-9]|10)$/.test(body)){
    if(!capacity.enabled(env,now()))return reply(404);
    if(/^capacity-r(?:[0-9]|10)$/.test(body)){
      const executor=require('./commerce-executor.cjs'),phase=Number(body.slice(10));
      return reply(200,await (executor.enabled(env)?executor.stub(env).verifyCapacity(phase):capacity.run(env,{sqlFactory,phase})));
    }
    return reply(200,await capacity[body.slice(9)](env,{sqlFactory}));
  }
  if(body==='contact-status'){
    if(!contactEnabled(env,now())||!env.DATABASE_URL)return reply(404);
    const store=(storeFactory||require('./communications-store.cjs').createStore)({...env,COMMUNICATIONS_ENABLED:'true'});
    const rows=await store.query('SELECT status,attempts,provider_id,sent_at FROM comm_outbox WHERE key=$1',[CONTACT_KEY]);
    return reply(200,{outcome:'contact_verification_status',job:rows[0]||null});
  }
  if(!['migrate','queue','status','provider-status','fixtures','catalog-migrate','catalog-step','catalog-status','catalog-wake'].includes(body))return reply(400);
  if(!(body.startsWith('catalog-')?catalogWindow():enabled(env,now()))||env.CHECKOUT_PAUSED!=='true')return reply(404);
  if(['provider-status','fixtures'].includes(body)){
    return require('./cloudflare-provider-verification.cjs').request(req,env,body,{sqlFactory,fetchImpl,now});
  }
  if(body.startsWith('catalog-')){
    const snapshot=require('./catalog-snapshot.cjs');
    if(!snapshot.configured(env))return reply(503);
    if(body==='catalog-migrate'){
      require('./invocation-budget.cjs').consume();
      await env.PUBLIC_CATALOG_DB.prepare(snapshot.SCHEMA).run();
      return reply(200,{outcome:'catalog_schema_ready'});
    }
    if(body==='catalog-wake'){
      if(!idleEnabled(env,now()))return reply(404);
      const wake=require('./communications-wake.cjs');
      require('./invocation-budget.cjs').consume();
      await env.PUBLIC_CATALOG_DB.prepare(wake.SCHEMA).run();
      await wake.createWake(env).signal();
      return reply(200,{outcome:'idle_verification_signaled'});
    }
    const store=snapshot.createSnapshotStore(env);
    if(body==='catalog-step')return reply(200,await snapshot.refreshStep(env,{store}));
    const row=await store.read();
    return reply(200,{outcome:'catalog_status',cursor:row?.cursor??null,
      published_at:row?.published_source_at??null,products:row?.published?.length??0});
  }
  if(!env.DATABASE_URL)return reply(503);
  if(body==='migrate'){
    const sql=(sqlFactory||require('@neondatabase/serverless').neon)(env.DATABASE_URL);
    const schema=require('./communications-schema.cjs');
    await sql.transaction(schema.map(s=>sql.query(s)),{fetchOptions:{signal:AbortSignal.timeout(20000)}});
    return reply(200,{outcome:'schema_ready'});
  }
  const store=(storeFactory||require('./communications-store.cjs').createStore)({...env,COMMUNICATIONS_ENABLED:'true'});
  if(body==='queue'){await store.enqueue(KEY,'contact',null,mail());return reply(200,{outcome:'fixed_owner_job_queued'});}
  const rows=await store.query('SELECT status,attempts,provider_id,sent_at FROM comm_outbox WHERE key=$1',[KEY]);
  return reply(200,{outcome:'verification_status',job:rows[0]||null});
}
async function scheduled(env,{storeFactory,fetchImpl=fetch,now=Date.now}={}){
  const contact=contactEnabled(env,now());
  const active=()=>contact?contactEnabled(env,now()):enabled(env,now());
  if(!active()||env.CHECKOUT_PAUSED!=='true')return {outcome:'verification_closed'};
  if(!env.RESEND_API_KEY||!env.DATABASE_URL)return {outcome:'verification_configuration_incomplete'};
  const {createStore,hash}=require('./communications-store.cjs');
  const key=contact?CONTACT_KEY:KEY;
  const store=(storeFactory||createStore)({...env,COMMUNICATIONS_ENABLED:'true'}),job=await store.claim(key),
    payload=contact?require('./customer-mail.cjs').contactEmail(CONTACT_FIELDS):mail();
  if(!job)return {outcome:'owner_verification_no_due_job'};
  if(job.key!==key||job.kind!=='contact'||job.order_ref!==null||job.payload_hash!==hash(payload)||hash(job.payload)!==hash(payload)||
    (job.first_attempt_at&&now()-Date.parse(job.first_attempt_at)>=23*3600000)){
    await store.finish(job,'held',{error:'verification_payload_mismatch'});return {outcome:'held'};
  }
  if(!await store.mailQuota()){await store.finish(job,'pending',{error:'daily_mail_budget',delay:86400});return {outcome:'rate_limited'};}
  if(!active()||env.CHECKOUT_PAUSED!=='true'){
    await store.finish(job,'held',{error:'verification_window_closed'});return {outcome:'verification_closed'};
  }
  await store.markAttempt(job);
  if(!active()||env.CHECKOUT_PAUSED!=='true'){
    await store.finish(job,'held',{error:'verification_window_closed'});return {outcome:'verification_closed'};
  }
  let providerId;
  try{
    const r=await fetchImpl('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    const data=await r.json().catch(()=>null);
    if(!r.ok){
      const terminal=r.status>=400&&r.status<500&&r.status!==429;
      await store.finish(job,terminal?'held':'pending',{error:'verification_provider_rejected',delay:120});
      return {outcome:terminal?'held':'owner_verification_retry'};
    }
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data?.id||''))throw Error('provider_rejected');
    providerId=data.id;
  }catch{await store.finish(job,'pending',{error:'verification_retry',delay:120});return {outcome:'owner_verification_retry'};}
  // Keep the existing lease and idempotency key if persistence fails after acceptance.
  await store.finish(job,'sent',{providerId});return {outcome:'owner_verification_sent',email_id:providerId};
}
module.exports={enabled,idleEnabled,idleScheduled,contactEnabled,CONTACT_FIELDS,CONTACT_KEY,request,scheduled};
