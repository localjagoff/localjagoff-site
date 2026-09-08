const {equal}=require('./communications-auth.cjs');
const {ORDER_SENDER,SUPPORT}=require('./customer-mail.cjs');
const KEY='verification/owner-cloudflare-scheduler-v1';
function enabled(env,now=Date.now()){
  const until=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL||'');
  return env.CLOUDFLARE_WORKER_NAME==='localjagoff-review'&&env.COMMERCE_ENV==='preview'&&
    env.CUSTOMER_EMAIL_ENABLED==='false'&&Number.isFinite(until)&&until>now&&until<=now+3600000;
}
function mail(){return {from:ORDER_SENDER,to:[SUPPORT],reply_to:SUPPORT,
  subject:'Local Jagoff - owner-only Cloudflare scheduler verification',
  text:'OWNER-ONLY CLOUDFLARE SCHEDULER TEST. The native Cloudflare timer claimed this fixed durable job. No real payment, Printful order or customer email was created. This verifies the hosting migration only; completed domain authentication tests remain closed.'};}
const reply=(status,body)=>new Response(body===undefined?null:JSON.stringify(body),{
  status,headers:{'cache-control':'no-store','x-robots-tag':'noindex','content-type':'application/json'},
});
async function request(req,env,{sqlFactory,storeFactory,fetchImpl=fetch,now=Date.now}={}){
  const catalogWindow=()=>enabled({...env,CLOUDFLARE_REVIEW_VERIFY_UNTIL:env.CLOUDFLARE_CATALOG_VERIFY_UNTIL},now());
  if((!enabled(env,now())&&!catalogWindow())||env.CHECKOUT_PAUSED!=='true')return reply(404);
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
  if(!['migrate','queue','status','provider-status','fixtures','catalog-migrate','catalog-step','catalog-status'].includes(body))return reply(400);
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
  if(!enabled(env,now())||env.CHECKOUT_PAUSED!=='true')return {outcome:'verification_closed'};
  if(!env.RESEND_API_KEY||!env.DATABASE_URL)return {outcome:'verification_configuration_incomplete'};
  const {createStore,hash}=require('./communications-store.cjs');
  const store=(storeFactory||createStore)({...env,COMMUNICATIONS_ENABLED:'true'}),job=await store.claim(KEY),payload=mail();
  if(!job)return {outcome:'owner_verification_no_due_job'};
  if(job.key!==KEY||job.kind!=='contact'||job.order_ref!==null||job.payload_hash!==hash(payload)||hash(job.payload)!==hash(payload)||
    (job.first_attempt_at&&now()-Date.parse(job.first_attempt_at)>=23*3600000)){
    await store.finish(job,'held',{error:'verification_payload_mismatch'});return {outcome:'held'};
  }
  if(!await store.mailQuota()){await store.finish(job,'pending',{error:'daily_mail_budget',delay:86400});return {outcome:'rate_limited'};}
  if(!enabled(env,now())||env.CHECKOUT_PAUSED!=='true'){
    await store.finish(job,'held',{error:'verification_window_closed'});return {outcome:'verification_closed'};
  }
  await store.markAttempt(job);
  if(!enabled(env,now())||env.CHECKOUT_PAUSED!=='true'){
    await store.finish(job,'held',{error:'verification_window_closed'});return {outcome:'verification_closed'};
  }
  let providerId;
  try{
    const r=await fetchImpl('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','idempotency-key':KEY},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
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
module.exports={enabled,request,scheduled};
