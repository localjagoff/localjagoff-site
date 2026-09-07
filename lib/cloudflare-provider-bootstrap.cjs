const {equal}=require('./communications-auth.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const ORIGIN='https://localjagoff-review.localjagoff-site.workers.dev';
const reply=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
function enabled(env,now=Date.now()){
  const until=Date.parse(env.CLOUDFLARE_PROVIDER_SETUP_UNTIL||'');
  return env.CLOUDFLARE_WORKER_NAME==='localjagoff-review'&&env.COMMERCE_ENV==='preview'&&
    env.SITE_URL===ORIGIN&&env.CHECKOUT_PAUSED==='true'&&env.CUSTOMER_EMAIL_ENABLED==='false'&&
    Number.isFinite(until)&&until>now&&until<=now+900000;
}
async function request(req,env,{fetchImpl=fetch,now=Date.now}={}){
  if(req.method!=='POST'||(env.CRON_SECRET||'').length<32||
    !equal(/^Bearer (.+)$/.exec(req.headers.get('authorization')||'')?.[1],env.CRON_SECRET))return reply(enabled(env,now())?401:404,{outcome:'unavailable'});
  if(!enabled(env,now()))return reply(404,{outcome:'closed',checks:{worker:env.CLOUDFLARE_WORKER_NAME==='localjagoff-review',preview:env.COMMERCE_ENV==='preview',origin:env.SITE_URL===ORIGIN,paused:env.CHECKOUT_PAUSED==='true',mail_off:env.CUSTOMER_EMAIL_ENABLED==='false',expiry_valid:Date.parse(env.CLOUDFLARE_PROVIDER_SETUP_UNTIL||'')>now()}});
  if(req.body){
    const reader=req.body.getReader();
    try{const part=await reader.read();if(!part.done){await reader.cancel();return reply(400,{outcome:'body_not_allowed'});}}
    finally{reader.releaseLock();}
  }
  if(!env.PRINTFUL_WEBHOOK_API_KEY||!env.PRINTFUL_API_KEY||!env.CLOUDFLARE_PROVIDER_SETUP_PUBLIC_KEY)return reply(503,{outcome:'missing_configuration'});
  try{
    // Import and validate the pinned recipient key before any provider configuration change.
    const key=await crypto.subtle.importKey('spki',Buffer.from(env.CLOUDFLARE_PROVIDER_SETUP_PUBLIC_KEY,'base64'),
      {name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
    if(key.algorithm.modulusLength<2048)return reply(400,{outcome:'invalid_encryption_key'});
    const stored=env.PRINTFUL_WEBHOOK_API_KEY.trim();
    const candidates=stored.split(/\r?\n/).map(s=>s.trim()).filter(s=>/^[A-Za-z0-9_+/.=-]{40,500}$/.test(s)&&!s.includes('://'));
    if(/\s/.test(stored)&&candidates.length!==1)return reply(502,{outcome:'credential_copy_requires_repair',candidate_lengths:candidates.map(s=>s.length)});
    const token=/\s/.test(stored)?candidates[0]:stored;
    const headers={authorization:`Bearer ${token}`,'X-PF-Store-Id':STORE_ID,'content-type':'application/json'};
    const get=await fetchImpl('https://api.printful.com/v2/webhooks',{headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
    if(get.ok){
      const envelope=await get.json();
      const field=Object.hasOwn(envelope,'result')?'result':Object.hasOwn(envelope,'data')?'data':null;
      const current=field?envelope[field]:undefined;
      const empty=field&&(current===null||(Array.isArray(current)?current.length===0:current&&
        (Object.keys(current).length===0||(current.default_url==null&&Array.isArray(current.events)&&current.events.length===0))));
      if(!empty)return reply(409,{outcome:'existing_configuration_preserved',provider_status:get.status,
        current:{has_url:!!current?.default_url,event_count:Array.isArray(current?.events)?current.events.length:null,keys:current&&typeof current==='object'?Object.keys(current):[],envelope_keys:Object.keys(envelope)}});
    }else if(get.status!==404){await get.body?.cancel();return reply(502,{outcome:'configuration_read_failed',provider_status:get.status});}
    else await get.body?.cancel();
    const product=await fetchImpl('https://api.printful.com/store/products/430964873',{
      headers:{authorization:`Bearer ${env.PRINTFUL_API_KEY}`,'X-PF-Store-Id':STORE_ID},redirect:'manual',signal:AbortSignal.timeout(10000)});
    if(!product.ok){await product.body?.cancel();return reply(502,{outcome:'product_read_failed',provider_status:product.status});}
    const data=await product.json(),ids=[...new Set((data.result?.sync_variants||[]).map(v=>v.product?.product_id))];
    if(!ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<=0))return reply(502,{outcome:'catalog_identity_unavailable'});
    if(!enabled(env,now()))return reply(404,{outcome:'closed'});
    const response=await fetchImpl('https://api.printful.com/v2/webhooks',{method:'POST',headers,redirect:'manual',signal:AbortSignal.timeout(10000),
      body:JSON.stringify({default_url:ORIGIN+'/api/printful-events',expires_at:'2027-09-07T00:00:00Z',
        events:[{type:'catalog_stock_updated',params:[{name:'products',value:ids.map(id=>({id}))}]}]})});
    if(!response.ok){await response.body?.cancel();return reply(502,{outcome:'configuration_write_failed',provider_status:response.status});}
    const configured=await response.json(),result=configured.result??configured.data;
    if(!/^(?:[a-f\d]{2}){16,}$/i.test(result?.secret_key||'')||!result?.public_key||result.default_url!==ORIGIN+'/api/printful-events')return reply(502,{outcome:'configuration_response_invalid'});
    const plain=Buffer.from(JSON.stringify({PRINTFUL_WEBHOOK_SECRET:result.secret_key,PRINTFUL_WEBHOOK_PUBLIC_KEY:result.public_key,
      ...(stored!==token?{PRINTFUL_WEBHOOK_API_KEY:token}:{})}));
    const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,plain);plain.fill(0);
    const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},key,await crypto.subtle.exportKey('raw',aes));
    return reply(200,{outcome:'configured',path:'/api/printful-events',event:'catalog_stock_updated',catalog_product_ids:ids,
      encrypted:{key:Buffer.from(wrapped).toString('base64'),iv:Buffer.from(iv).toString('base64'),data:Buffer.from(ciphertext).toString('base64')}});
  }catch{return reply(502,{outcome:'secure_setup_failed'});}
}
module.exports={enabled,request};
