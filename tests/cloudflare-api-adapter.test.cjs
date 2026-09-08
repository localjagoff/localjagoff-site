const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const Stripe=require('stripe');
const budget=require('../lib/invocation-budget.cjs');
const {ROUTES,createApiAdapter}=require('../lib/cloudflare-api-adapter.cjs');
const {verifyChallenge}=require('../lib/contact-security.cjs');
const discovery=require('../lib/discovery.cjs');
const {metaRows,feedCsv}=require('../lib/catalog.cjs');
const originalFetch=globalThis.fetch,info=console.info,error=console.error;
let forbiddenCalls=0;
const forbidden=()=>{forbiddenCalls++;throw Error('No provider I/O permitted');};
before(()=>{globalThis.fetch=budget.installBudget(forbidden);console.info=()=>{};console.error=()=>{};});
after(()=>{globalThis.fetch=originalFetch;console.info=info;console.error=error;assert.equal(forbiddenCalls,0);});
const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',CHECKOUT_PAUSED:'true',
  CUSTOMER_EMAIL_ENABLED:'false',COMMUNICATIONS_ENABLED:'false',SITE_URL:'https://fixture.test',PRINTFUL_API_KEY:'fixture-catalog'};
const products=[{id:430964873,name:'Fixture tee',description:'A fixture tee',category:'tees',images:['/fixture.jpg'],
  variants:[{id:123,name:'M',price:'25.00',unit_amount:2500,currency:'USD',availability:'in stock',size:'M',color:'Black'}]}];
const req=(route,init={})=>new Request('https://fixture.test'+route,init);

test('only exact reviewed routes are intercepted; admin, scheduler, checkout and encoded variants fall through unread',async()=>{
  const adapter=createApiAdapter();
  for(const route of ['/api/reviews/moderation','/api/communications/run','/api/create-checkout-session','/admin/reviews',
    '/api/webhook/','/api/%77ebhook','/api/webhook-extra','/__proto__','/constructor']){
    const request=req(route,{method:'POST',body:'unread'});
    assert.equal(await adapter(request,env),null);assert.equal(request.bodyUsed,false);
  }
});

test('catalog, CSV, discovery formats and HEAD share a completed environment-scoped snapshot',async()=>{
  let reads=0;
  const adapter=createApiAdapter({loadCatalog:async options=>{assert.equal(options.apiKey,env.PRINTFUL_API_KEY);reads++;return products;}});
  const expected={'/api/get-products':JSON.stringify(products),'/api/meta-catalog':feedCsv(metaRows(products,env.SITE_URL)),
    '/feeds/products.tsv':discovery.googleTsv(products),'/feeds/openai-products.jsonl':discovery.openaiJsonl(products),
    '/sitemap.xml':discovery.sitemapXml(products)};
  for(const [route,body] of Object.entries(expected)){
    const response=await adapter(req(route),env);assert.equal(response.status,200);assert.equal(await response.text(),body);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  }
  assert.equal(reads,1);
  for(const route of ['/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml','/indexnow-key.txt']){
    const response=await adapter(req(route,{method:'HEAD'}),env);assert.equal(response.status,200);assert.equal(await response.text(),'');
  }
  for(const route of [...Object.keys(expected),'/indexnow-key.txt']){
    const response=await adapter(req(route,{method:'POST'}),env);assert.equal(response.status,405);await response.text();
  }
  assert.equal(reads,1);
});

test('preview Meta URLs follow SITE_URL while discovery feeds and sitemap remain canonical',async()=>{
  const adapter=createApiAdapter({loadCatalog:async()=>products});
  const preview={...env,SITE_URL:'https://review.example.test'};
  const meta=await adapter(req('/api/meta-catalog'),preview);
  assert.match(await meta.text(),/https:\/\/review\.example\.test\/product\/430964873/);
  for(const route of ['/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml']){
    const response=await adapter(req(route),preview),body=await response.text();
    assert.match(body,/https:\/\/www\.localjagoff\.com\/product\/430964873/);
    assert.doesNotMatch(body,/review\.example\.test/);
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  }
  const invalid=await adapter(req('/api/meta-catalog'),{...env,SITE_URL:'http://insecure.example.test'});
  assert.equal(invalid.status,503);
  const production=await adapter(req('/sitemap.xml'),{...env,COMMERCE_ENV:'production'});
  assert.equal(production.headers.get('x-robots-tag'),null);
});

test('every native Preview response retains noindex, including errors and unsupported methods',async()=>{
  const adapter=createApiAdapter({loadCatalog:async()=>{throw Error('fixture unavailable');}});
  for(const route of Object.keys(ROUTES)){
    for(const method of ['GET','HEAD','OPTIONS','POST']){
      const init=method==='POST'?{method,body:'{',headers:{'content-type':'application/json'}}:{method};
      const response=await adapter(req(route,init),env);
      assert.match(response.headers.get('x-robots-tag')||'',/\bnoindex\b/,method+' '+route+' status='+response.status);
      await response.text();
    }
  }
  const broken=createApiAdapter({webhookFactory:()=>async()=>{throw Error('fixture unexpected failure');}});
  const response=await broken(req('/api/webhook',{method:'POST'}),env);
  assert.equal(response.status,500);assert.match(response.headers.get('x-robots-tag'),/\bnoindex\b/);
  const production={...env,COMMERCE_ENV:'production'};
  for(const route of ['/api/get-products','/api/meta-catalog','/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml','/indexnow-key.txt']){
    const response=await adapter(req(route),production);
    assert.equal(response.headers.get('x-robots-tag'),null,route);await response.text();
  }
});

test('snapshot TTL, key rotation, environment isolation and failed refreshes cannot return stale or partial feeds',async()=>{
  let clock=1000,fail=false;
  const keys=[];
  const adapter=createApiAdapter({now:()=>clock,loadCatalog:async({apiKey})=>{keys.push(apiKey);if(fail)throw Error('fixture partial read');return products;}});
  const a={...env,PRINTFUL_API_KEY:'a'},b={...env,PRINTFUL_API_KEY:'b'};
  for(const current of [a,a,b])assert.equal((await adapter(req('/api/get-products'),current)).status,200);
  a.PRINTFUL_API_KEY='rotated';assert.equal((await adapter(req('/sitemap.xml'),a)).status,200);
  assert.deepEqual(keys,['a','b','rotated']);
  clock+=60000;fail=true;
  const unavailable=await adapter(req('/sitemap.xml'),a);
  assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('retry-after'),'60');
  assert.doesNotMatch(await unavailable.text(),/<urlset/);
  fail=false;assert.equal((await adapter(req('/sitemap.xml'),a)).status,200);
  assert.deepEqual(keys,['a','b','rotated','rotated','rotated']);
});

test('concurrent cold requests do not share an invocation-owned I/O promise',async()=>{
  const pending=[];
  const adapter=createApiAdapter({loadCatalog:()=>new Promise(resolve=>pending.push(resolve))});
  const a=adapter(req('/api/get-products'),env),b=adapter(req('/sitemap.xml'),env);
  assert.equal(pending.length,2);pending.forEach(resolve=>resolve(products));
  for(const response of await Promise.all([a,b]))assert.equal(response.status,200);
});

test('Stripe raw signatures use each supplied environment and reject altered or oversized bytes',async()=>{
  const adapter=createApiAdapter();
  const payload=JSON.stringify({id:'evt_fixture',type:'adapter.fixture',livemode:false,data:{object:{label:'\u2603'}}});
  for(const secret of ['whsec_fixture_a','whsec_fixture_b']){
    const current={...env,STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:secret};
    const headers={'stripe-signature':Stripe.webhooks.generateTestHeaderString({payload,secret})};
    const bytes=Buffer.from(payload),stream=new ReadableStream({start(controller){
      for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();
    }});
    assert.equal((await adapter(req('/api/webhook',{method:'POST',headers,body:stream,duplex:'half'}),current)).status,200);
    assert.equal((await adapter(req('/api/webhook',{method:'POST',headers,body:payload+' '}),current)).status,400);
    assert.equal((await adapter(req('/api/webhook',{method:'POST',headers,body:'x'.repeat(1048577)}),current)).status,400);
  }
  assert.equal((await adapter(req('/api/webhook'),env)).status,405);
});

test('signed test payments and live payments in Preview cannot enter provider work',async()=>{
  const adapter=createApiAdapter(),secret='whsec_fixture';
  for(const livemode of [false,true]){
    const payload=JSON.stringify({id:'evt_fixture',type:'checkout.session.completed',livemode,data:{object:{id:'cs_test_fixture'}}});
    const current={...env,STRIPE_SECRET_KEY:livemode?'sk_live_fixture':'sk_test_fixture',STRIPE_WEBHOOK_SECRET:secret};
    const headers={'stripe-signature':Stripe.webhooks.generateTestHeaderString({payload,secret})};
    const response=await adapter(req('/api/webhook',{method:'POST',headers,body:payload}),current);
    assert.equal(response.status,livemode?500:200);await response.text();
  }
  assert.equal(forbiddenCalls,0);
});

test('Printful raw signatures and Preview restrictions survive the bridge without provider access',async()=>{
  const adapter=createApiAdapter();
  const payload=JSON.stringify({type:'order_updated',store_id:18032822,occurred_at:new Date().toISOString(),retries:0,
    data:{order:{id:123,store_id:18032822,external_id:'LJ'+'c'.repeat(24)}}});
  for(const secret of ['a1'.repeat(32),'b2'.repeat(32)]){
    const current={...env,PRINTFUL_WEBHOOK_SECRET:secret,PRINTFUL_WEBHOOK_PUBLIC_KEY:'fixture-public'};
    const headers={'x-pf-webhook-public-key':'fixture-public',
      'x-pf-webhook-signature':crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(payload).digest('hex')};
    const response=await adapter(req('/api/printful-events',{method:'POST',headers,body:payload}),current);
    assert.equal(response.status,200);assert.equal((await response.json()).outcome,'preview_no_provider_or_email');
    assert.equal((await adapter(req('/api/printful-events',{method:'POST',headers,body:payload+' '}),current)).status,400);
    assert.equal((await adapter(req('/api/printful-events',{method:'POST',headers,body:'x'.repeat(262145)}),current)).status,413);
  }
});

test('contact/reviews retain Next parsing limits, origin checks and request-time secrets',async()=>{
  const adapter=createApiAdapter();
  for(const secret of ['a'.repeat(32),'b'.repeat(32)]){
    const current={...env,COMMUNICATIONS_ENABLED:'true',COMMUNICATIONS_SECRET:secret,DATABASE_URL:'fixture'};
    const challenge=await (await adapter(req('/api/contact'),current)).json();
    assert.equal(verifyChallenge(challenge.challenge,secret,Number(challenge.challenge.split('.')[0])+2000),true);
    const malformed=await adapter(req('/api/contact',{method:'POST',body:'{',headers:{'content-type':'application/json'}}),current);
    assert.equal(malformed.status,400);
    for(const [route,limit] of [['/api/contact',20480],['/api/reviews',10240]]){
      const response=await adapter(req(route,{method:'POST',body:'x'.repeat(limit+1),headers:{'content-type':'application/json'}}),current);
      assert.equal(response.status,413);
    }
    const crossOrigin=await adapter(req('/api/reviews',{method:'POST',body:'{}',headers:{'content-type':'application/json',origin:'https://attacker.test'}}),current);
    assert.equal(crossOrigin.status,403);
    const wrongType=await adapter(req('/api/contact',{method:'POST',body:'{}',headers:{'content-type':'text/plain',origin:env.SITE_URL}}),current);
    assert.equal(wrongType.status,415);
  }
});

test('request mapping preserves repeated queries and CF connection headers without global environment mutation',async()=>{
  const before=process.env.SITE_URL;
  const adapter=createApiAdapter({reviewsFactory:({env:current})=>async(req,res)=>{
    assert.equal(current,env);assert.equal(req.headers['cf-connecting-ip'],'203.0.113.1');
    assert.deepEqual(req.query.productId,['123','456']);assert.equal(Object.getPrototypeOf(req.query),null);
    assert.equal(req.query.__proto__,'fixture');res.status(201).json({received:true});
  }});
  const response=await adapter(req('/api/reviews?productId=123&productId=456&__proto__=fixture',
    {headers:{'cf-connecting-ip':'203.0.113.1'}}),env);
  assert.equal(response.status,201);assert.equal(process.env.SITE_URL,before);
});

test('native parsing matches Next for JSON, empty bodies, forms, text and charset handling',async()=>{
  const {Readable}=require('node:stream');
  const {parseBody}=require('next/dist/server/api-utils/node/parse-body.js');
  let parsed;
  const adapter=createApiAdapter({contactFactory:()=>async(req,res)=>{parsed=req.body;res.json({ok:true});}});
  for(const [type,body] of [['application/json','{"name":"fixture"}'],['application/json',''],
    ['application/ld+json','[1,2]'],['application/x-www-form-urlencoded','a=1&a=2&__proto__=safe'],
    ['text/plain','fixture'],['invalid type','fixture'],['text/plain; charset=iso-8859-1',Buffer.from([233])],
    ['application/json; charset=UTF-8',Buffer.concat([Buffer.from([239,187,191]),Buffer.from('{"v":1}')])],
    ['application/json; charset=utf8',Buffer.from([34,255,34])],
    ['application/json; charset=iso-8859-1',Buffer.from([34,233,34])]]){
    const nodeReq=Readable.from([Buffer.from(body)]);nodeReq.headers={'content-type':type};
    const expected=await parseBody(nodeReq,'20kb');
    const response=await adapter(req('/api/contact',{method:'POST',headers:{'content-type':type},body}),env);
    assert.equal(response.status,200);assert.deepEqual(parsed,expected);
  }
});

test('UTF-8 JSON fast path preserves multibyte chunk boundaries and rejects actual byte overflow before handlers',async()=>{
  let parsed,calls=0,cancelled=false;
  const adapter=createApiAdapter({contactFactory:()=>async(req,res)=>{calls++;parsed=req.body;res.json({ok:true});}});
  const bytes=Buffer.from([34,240,159,152,128,34]);let cursor=0;
  const chunked=new Request(env.SITE_URL+'/api/contact',{method:'POST',headers:{'content-type':'application/json'},
    body:new ReadableStream({pull(controller){
      if(cursor===bytes.length)controller.close();else controller.enqueue(bytes.subarray(cursor,++cursor));
    }}),duplex:'half'});
  assert.equal((await adapter(chunked,env)).status,200);assert.equal(parsed,String.fromCodePoint(128512));
  const oversized=new Request(env.SITE_URL+'/api/contact',{method:'POST',headers:{'content-type':'application/json'},
    body:new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(20481));},
      cancel(){cancelled=true;}}),duplex:'half'});
  assert.equal((await adapter(oversized,env)).status,413);assert.equal(cancelled,true);assert.equal(calls,1);
  const broken=new Request(env.SITE_URL+'/api/contact',{method:'POST',headers:{'content-type':'application/json'},
    body:new ReadableStream({pull(controller){controller.error(Error('fixture stream failure'));}}),duplex:'half'});
  assert.equal((await adapter(broken,env)).status,400);assert.equal(calls,1);
});

test('adapter work remains inside one invocation budget and each request gets a fresh allowance',async()=>{
  let calls=0;
  globalThis.fetch=budget.installBudget(async()=>{calls++;return new Response('fixture');});
  try{
    const adapter=createApiAdapter({loadCatalog:async()=>{
      for(let i=0;i<33;i++)await globalThis.fetch('https://fixture.invalid');return products;
    }});
    for(let i=0;i<2;i++)assert.equal((await adapter(req('/api/get-products'),env)).status,503);
    assert.equal(calls,64);
  }finally{globalThis.fetch=budget.installBudget(forbidden);}
});

test('native adapter initializes without I/O, authenticates and shares public snapshots in real workerd', {timeout:45000},async()=>{
  const {build}=require('esbuild'),{Miniflare}=require('miniflare');
  const root=path.resolve(__dirname,'..');
  const {outputFiles,metafile}=await build({stdin:{resolveDir:root,contents:`
    import budget from './lib/invocation-budget.cjs';
    import Stripe from 'stripe';
    let started=false,attempts=0;const transport=globalThis.fetch;
    globalThis.fetch=budget.installBudget((...args)=>{if(!started){attempts++;throw Error('startup fetch forbidden')}return transport(...args)});
    const {default:api}=await import('./lib/cloudflare-api-adapter.cjs');
    if(attempts)throw Error('startup I/O attempted');started=true;
    export default {async fetch(request,env){
      if(new URL(request.url).pathname==='/__stripe-crypto-fixture'){
        const payload=await request.text(),signature=request.headers.get('stripe-signature');
        const stripe=new Stripe(env.STRIPE_SECRET_KEY,{httpClient:Stripe.createFetchHttpClient()});
        let syncError;
        try{stripe.webhooks.constructEvent(payload,signature,env.STRIPE_WEBHOOK_SECRET)}
        catch(error){syncError=error.message}
        const event=await stripe.webhooks.constructEventAsync(payload,signature,env.STRIPE_WEBHOOK_SECRET);
        return Response.json({syncError,eventId:event.id});
      }
      return api.request(request,env);
    }};
  `},bundle:true,write:false,metafile:true,format:'esm',platform:'node',conditions:['workerd','worker','browser'],target:'es2022',external:['node:*','cloudflare:*'],
    banner:{js:"import {createRequire} from 'node:module';const require=createRequire('file:///worker.js');"}});
  assert.ok(Object.keys(metafile.inputs).some(file=>file.endsWith('stripe.esm.worker.js')),'resolve the same Stripe export as Wrangler');
  assert.ok(!Object.keys(metafile.inputs).some(file=>/stripe\.(?:esm|cjs)\.node\.js$/.test(file)),'do not silently test Node crypto');
  const current={...env,STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_workerd_fixture',
    COMMUNICATIONS_ENABLED:'true',COMMUNICATIONS_SECRET:'c'.repeat(32),DATABASE_URL:'fixture'};
  let reads=0;
  const mf=new Miniflare({workers:[{config:{name:'native-api-fixture',type:'worker',compatibilityDate:'2026-09-07',
    compatibilityFlags:['nodejs_compat'],env:Object.fromEntries(Object.entries(current).map(([key,value])=>[key,{type:'text',value}])),
    manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:outputFiles[0].text}}}},
    dev:{outboundService:{type:'fetcher',handler:request=>{
      const url=new URL(request.url);assert.equal(url.origin,'https://api.printful.com');assert.equal(request.method,'GET');
      assert.equal(request.headers.get('authorization'),'Bearer '+current.PRINTFUL_API_KEY);reads++;
      if(url.pathname==='/sync/products')return Response.json({code:200,result:[{id:430964873}],paging:{offset:0,total:1}});
      assert.equal(url.pathname,'/sync/products/430964873');
      return Response.json({code:200,result:{sync_product:{id:430964873,name:'Fixture',is_ignored:false},
        sync_variants:[{id:5292830954,sync_product_id:430964873,name:'Fixture / S',synced:true,is_ignored:false,
          availability_status:'active',retail_price:'30.00',currency:'USD',size:'S',color:'Black'}]}});
    }}}}]});
  try{
    await mf.ready;
    const payload=JSON.stringify({id:'evt_workerd_fixture',type:'checkout.session.completed',livemode:false,
      data:{object:{id:'cs_test_fixture',label:'\u2603'}}},null,2)+'\n';
    const signature=Stripe.webhooks.generateTestHeaderString({payload,secret:current.STRIPE_WEBHOOK_SECRET});
    const probe=await mf.dispatchFetch('https://fixture.test/__stripe-crypto-fixture',
      {method:'POST',headers:{'stripe-signature':signature},body:payload});
    assert.equal(probe.status,200);
    const diagnosis=await probe.json();
    assert.match(diagnosis.syncError,/SubtleCryptoProvider cannot be used in a synchronous context/);
    assert.equal(diagnosis.eventId,'evt_workerd_fixture');
    const valid=await mf.dispatchFetch('https://fixture.test/api/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload});
    assert.equal(valid.status,200);await valid.text();
    const invalid=await mf.dispatchFetch('https://fixture.test/api/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload+' '});
    assert.equal(invalid.status,400);await invalid.text();
    for(const header of [undefined,'invalid',Stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_wrong'}),
      Stripe.webhooks.generateTestHeaderString({payload,secret:current.STRIPE_WEBHOOK_SECRET,timestamp:Math.floor(Date.now()/1000)-600})]){
      const response=await mf.dispatchFetch('https://fixture.test/api/webhook',
        {method:'POST',headers:header?{'stripe-signature':header}:{},body:payload});
      assert.equal(response.status,400);await response.text();
    }
    const oversized=await mf.dispatchFetch('https://fixture.test/api/webhook',
      {method:'POST',headers:{'stripe-signature':signature},body:'x'.repeat(1048577)});
    assert.equal(oversized.status,400);await oversized.text();assert.equal(reads,0);
    const printful=await mf.dispatchFetch('https://fixture.test/api/printful-events',{method:'POST',body:'{}'});
    assert.equal(printful.status,400);await printful.text();
    const contact=await mf.dispatchFetch('https://fixture.test/api/contact');assert.equal(contact.status,200);
    const challenge=(await contact.json()).challenge;
    assert.equal(verifyChallenge(challenge,current.COMMUNICATIONS_SECRET,Number(challenge.split('.')[0])+2000),true);
    const badJson=await mf.dispatchFetch('https://fixture.test/api/contact',{method:'POST',body:'{',headers:{'content-type':'application/json'}});
    assert.equal(badJson.status,400);await badJson.text();assert.equal(reads,0);
    for(const route of ['/api/get-products','/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml','/api/meta-catalog']){
      const response=await mf.dispatchFetch('https://fixture.test'+route);assert.equal(response.status,200);
      assert.match(await response.text(),/430964873/);
    }
    assert.equal(reads,2,'one catalog list/detail fetch should cover all five public formats');
  }finally{await mf.dispose();}
});
