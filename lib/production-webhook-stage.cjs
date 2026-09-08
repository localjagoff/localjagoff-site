const {STORE_ID}=require('./commerce-policy.cjs');
const ORIGIN='https://www.localjagoff.com';
const EXPIRY='2027-09-07T00:00:00Z';

async function stage(env,input,{fetchImpl=fetch}={}){
  const publicKey=typeof input==='string'?input:input?.publicKey;
  if(env.PRINTFUL_WEBHOOK_SECRET||env.PRINTFUL_WEBHOOK_PUBLIC_KEY)return {outcome:'existing_signing_keys_preserved'};
  if(!env.PRINTFUL_WEBHOOK_API_KEY||typeof publicKey!=='string'||publicKey.length>2048)return {outcome:'invalid_stage_configuration'};
  // Validate the ephemeral recipient before creating one-time signing material.
  const key=await crypto.subtle.importKey('spki',Buffer.from(publicKey,'base64'),
    {name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  if(key.algorithm.modulusLength<2048)return {outcome:'invalid_stage_configuration'};
  const headers={authorization:`Bearer ${env.PRINTFUL_WEBHOOK_API_KEY}`,'X-PF-Store-Id':STORE_ID,'content-type':'application/json'};
  const options={headers,redirect:'manual',signal:AbortSignal.timeout(15000)};
  const get=await fetchImpl('https://api.printful.com/v2/webhooks',{...options,method:'GET'});
  if(get.status!==200){await get.body?.cancel();return {outcome:'webhook_stage_read_failed',status:get.status};}
  const envelope=await get.json();
  const field=Object.hasOwn(envelope,'result')?'result':Object.hasOwn(envelope,'data')?'data':null;
  const current=field?envelope[field]:undefined;
  const empty=field&&(current===null||(Array.isArray(current)?current.length===0:current&&
    (Object.keys(current).length===0||(current.default_url==null&&Array.isArray(current.events)&&current.events.length===0))));
  const recoverEmpty=input?.recoverEmpty===true&&current?.default_url===ORIGIN+'/api/printful-events'&&
    Array.isArray(current.events)&&current.events.length===0;
  if(!empty&&!recoverEmpty)return {outcome:'existing_webhook_configuration_preserved'};
  const response=await fetchImpl('https://api.printful.com/v2/webhooks',{...options,method:'POST',signal:AbortSignal.timeout(15000),
    body:JSON.stringify({default_url:ORIGIN+'/api/printful-events',expires_at:EXPIRY,events:[]})});
  if(!response.ok){await response.body?.cancel();return {outcome:'webhook_stage_write_failed',status:response.status};}
  const body=await response.json(),result=body.result??body.data;
  if(result?.default_url!==ORIGIN+'/api/printful-events'||!Array.isArray(result.events)||result.events.length!==0||
    !/^(?:[a-f\d]{2}){16,}$/i.test(result.secret_key||'')||typeof result.public_key!=='string'||!result.public_key){
    return {outcome:'webhook_stage_response_invalid'};
  }
  const plain=Buffer.from(JSON.stringify({PRINTFUL_WEBHOOK_SECRET:result.secret_key,PRINTFUL_WEBHOOK_PUBLIC_KEY:result.public_key}));
  const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  let data;
  try{data=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,plain);}finally{plain.fill(0);}
  const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},key,await crypto.subtle.exportKey('raw',aes));
  return {outcome:'webhook_staged_no_events',events:0,encrypted:{key:Buffer.from(wrapped).toString('base64'),
    iv:Buffer.from(iv).toString('base64'),data:Buffer.from(data).toString('base64')}};
}
module.exports={stage};
