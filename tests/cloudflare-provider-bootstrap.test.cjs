const {test}=require('node:test'),assert=require('node:assert/strict');
const {generateKeyPairSync,privateDecrypt,createDecipheriv}=require('node:crypto');
const setup=require('../lib/cloudflare-provider-bootstrap.cjs');
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',CHECKOUT_PAUSED:'true',CUSTOMER_EMAIL_ENABLED:'false',CRON_SECRET:'fixture-auth-'.repeat(4),PRINTFUL_WEBHOOK_API_KEY:'fixture-webhook-only',PRINTFUL_API_KEY:'fixture-read-only',CLOUDFLARE_PROVIDER_SETUP_UNTIL:new Date(Date.now()+600000).toISOString(),CLOUDFLARE_PROVIDER_SETUP_PUBLIC_KEY:publicKey.export({type:'spki',format:'der'}).toString('base64')};
const req=()=>new Request(env.SITE_URL,{method:'POST',headers:{authorization:`Bearer ${env.CRON_SECRET}`}});
test('provider setup fails closed before I/O outside paused expiring review',async()=>{
  for(const change of [{COMMERCE_ENV:'production'},{CHECKOUT_PAUSED:'false'},{CUSTOMER_EMAIL_ENABLED:'true'},{CLOUDFLARE_PROVIDER_SETUP_UNTIL:'1970-01-01'}]){
    assert.equal((await setup.request(req(),{...env,...change},{fetchImpl:()=>{throw Error('must not fetch');}})).status,404);
  }
  assert.equal((await setup.request(new Request(env.SITE_URL,{method:'POST'}),env)).status,401);
});
test('existing token configuration is never replaced',async()=>{
  let count=0;const r=await setup.request(req(),env,{fetchImpl:async()=>{count++;return Response.json({result:{default_url:'https://example.com/webhook',events:[{type:'shipment_sent'}]}});}});
  assert.equal(r.status,409);assert.equal(count,1);
});
test('only stock configuration mutates provider; signing material encrypted for pinned key',async()=>{
  const calls=[];const signing='aa'.repeat(32);
  const r=await setup.request(req(),env,{fetchImpl:async(url,init)=>{
    calls.push({url,init});
    if(calls.length===1)return new Response(null,{status:404});
    if(calls.length===2)return Response.json({result:{sync_variants:[{product:{product_id:71}}]}});
    return Response.json({result:{default_url:env.SITE_URL+'/api/printful-events',public_key:'fixture-public',secret_key:signing}});
  }});
  assert.equal(r.status,200);const data=await r.json();assert.equal(JSON.stringify(data).includes(signing),false);
  assert.equal(calls.length,3);assert.deepEqual(JSON.parse(calls[2].init.body).events,[{type:'catalog_stock_updated',params:[{name:'products',value:[{id:71}]}]}]);
  assert.equal(calls.every(c=>!c.url.includes('/orders')),true);
  const aes=privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(data.encrypted.key,'base64'));
  const bytes=Buffer.from(data.encrypted.data,'base64'),d=createDecipheriv('aes-256-gcm',aes,Buffer.from(data.encrypted.iv,'base64'));d.setAuthTag(bytes.subarray(-16));
  assert.equal(JSON.parse(Buffer.concat([d.update(bytes.subarray(0,-16)),d.final()])).PRINTFUL_WEBHOOK_SECRET,signing);
});
