const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {VERSIONS,MARKER,SERVER_IMPORT,ENTRY,ROUTE_CONFIG,WARM_ROUTE_CONFIG,PAGE_PRELOAD,STRICT_PAGE_PRELOAD,
  APP_PRELOAD,STRICT_APP_PRELOAD,patchRoutes,patchWorker,planPrewarm,applyPrewarm}=require('../scripts/cloudflare-prewarm.cjs');
const originalServer=[ROUTE_CONFIG,PAGE_PRELOAD,APP_PRELOAD,'var handler2=await createMainHandler();export{handler2 as handler};\n'].join('\n');
const root=path.resolve(__dirname,'..');
const original=`import {runWithCloudflareRequestContext} from './cloudflare/init.js';
export default {
    async fetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {
            const reqOrResp = request;
            // @ts-expect-error: resolved by wrangler build
            ${SERVER_IMPORT}
            return handler(reqOrResp, env, ctx, request.signal);
        });
    },
};
`;

test('prewarm moves only the server import, preserves request context and is idempotent for LF/CRLF',()=>{
  for(const source of [original,original.replaceAll('\n','\r\n')]){
    const patched=patchWorker(source);
    assert.equal(patchWorker(patched),patched);
    assert.ok(patched.indexOf(SERVER_IMPORT)<patched.indexOf('export default {'));
    assert.ok(patched.indexOf(SERVER_IMPORT)>patched.indexOf("from './cloudflare/init.js'"));
    assert.match(patched,/return runWithCloudflareRequestContext\(request, env, ctx, async \(\) =>/);
    assert.match(patched,/return handler\(reqOrResp, env, ctx, request.signal\)/);
    assert.equal(patched.includes('\r\n'),source.includes('\r\n'));
  }
});

test('prewarm rejects changed, duplicate, and partially patched server imports',()=>{
  for(const source of [original.replace(SERVER_IMPORT,''),original+SERVER_IMPORT,
    original.replace('default/handler.mjs','other/handler.mjs'),original.replace('reqOrResp, env, ctx, request.signal','request'),
    MARKER+'\n'+original,original.replace('            '+SERVER_IMPORT,'        '+SERVER_IMPORT)]){
    assert.throws(()=>patchWorker(source),/changed|Incomplete/);
  }
});

test('route prewarming awaits onStart and surfaces every route failure; changes fail closed',()=>{
  const patched=patchRoutes(originalServer);
  assert.ok(patched.includes(WARM_ROUTE_CONFIG));assert.ok(patched.includes(STRICT_PAGE_PRELOAD));
  assert.ok(patched.includes(STRICT_APP_PRELOAD));assert.equal(patchRoutes(patched),patched);
  for(const source of [originalServer.replace(PAGE_PRELOAD,''),originalServer+APP_PRELOAD,
    originalServer.replace(ROUTE_CONFIG,WARM_ROUTE_CONFIG)])assert.throws(()=>patchRoutes(source),/route preloader changed/);
});

function fixture(t){
  const temporary=fs.realpathSync(os.tmpdir());
  const dir=fs.mkdtempSync(path.join(temporary,'localjagoff-prewarm-test-'));
  t.after(()=>{
    assert.equal(path.dirname(fs.realpathSync(dir)),temporary);
    assert.ok(path.basename(dir).startsWith('localjagoff-prewarm-test-'));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const write=(file,body)=>{const target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);};
  for(const [name,version] of Object.entries(VERSIONS))write('node_modules/'+name+'/package.json',JSON.stringify({version}));
  write('.open-next/worker.js',original);
  write('.open-next/server-functions/default/open-next.config.mjs','routePreloadingBehavior = "none"; var open_next_config_default = defineCloudflareConfig({});');
  write('.open-next/server-functions/default/handler.mjs',originalServer);
  write('cloudflare-worker.js','wrapper fixture');
  return {dir,write};
}

test('planning is read-only; applying touches only generated output and can repeat after rebuild',t=>{
  const {dir,write}=fixture(t),plan=planPrewarm(dir);
  assert.equal(fs.readFileSync(plan.workerPath,'utf8'),original);
  assert.equal(fs.existsSync(plan.entryPath),false);
  assert.equal(applyPrewarm(plan),plan.entryPath);
  assert.equal(fs.readFileSync(plan.entryPath,'utf8'),ENTRY);
  assert.equal(fs.readFileSync(path.join(dir,'cloudflare-worker.js'),'utf8'),'wrapper fixture');
  applyPrewarm(planPrewarm(dir));
  write('.open-next/worker.js',original);
  write('.open-next/server-functions/default/handler.mjs',originalServer);
  applyPrewarm(planPrewarm(dir));
  assert.equal(fs.readFileSync(plan.workerPath,'utf8'),plan.worker);
});

test('unaudited versions/configuration/exports and concurrent rebuilds fail before writing',t=>{
  const {dir,write}=fixture(t),plan=planPrewarm(dir);
  write('.open-next/worker.js',original+'// rebuilt\n');
  assert.throws(()=>applyPrewarm(plan),/build changed/);
  assert.equal(fs.existsSync(plan.entryPath),false);
  write('.open-next/worker.js',original);
  write('.open-next/server-functions/default/handler.mjs','// rebuilt server\nvar handler2=await createMainHandler();export{handler2 as handler};\n');
  assert.throws(()=>applyPrewarm(plan),/build changed/);
  assert.equal(fs.existsSync(plan.entryPath),false);
  write('node_modules/next/package.json','{"version":"99.0.0"}');
  assert.throws(()=>planPrewarm(dir),/Unaudited/);
  write('node_modules/next/package.json',JSON.stringify({version:VERSIONS.next}));
  write('.open-next/server-functions/default/open-next.config.mjs','defineCloudflareConfig({routePreloadingBehavior:"onStart"})');
  assert.throws(()=>planPrewarm(dir),/default OpenNext configuration/);
  write('.open-next/server-functions/default/open-next.config.mjs','routePreloadingBehavior = "none"; var open_next_config_default = defineCloudflareConfig({});');
  write('.open-next/server-functions/default/handler.mjs','export const handler=()=>{};');
  assert.throws(()=>planPrewarm(dir),/server export changed/);
  assert.equal(fs.existsSync(plan.entryPath),false);
});

test('real generated OpenNext prewarms in workerd with guarded routes, request env and captured fetch budgets',{
  skip:!fs.existsSync(path.join(root,'.open-next/server-functions/default/handler.mjs')),
  timeout:45000,
},async()=>{
  const {build}=require('esbuild');
  const {Miniflare}=require('miniflare');
  const {verifyChallenge}=require('../lib/contact-security.cjs');
  const plan=planPrewarm(root);
  const harness=`import budget from '../lib/invocation-budget.cjs';
    globalThis.__prewarmLoaded=[];
    const transport=globalThis.fetch;
    let started=false,startupCalls=0;
    globalThis.fetch=(...args)=>{
      if(!started){startupCalls++;throw Error('startup fetch is forbidden');}
      return transport(...args);
    };
    const {default:worker}=await import('./prewarm-worker.js');
    const {default:next}=await import('./worker.js');
    if(startupCalls)throw Error('startup fetch was attempted');
    started=true;
    const startupFetch=globalThis.internalFetch;
    const startupBinding=process.env.PREWARM_STARTUP_FIXTURE;
    if(typeof startupFetch!=='function')throw Error('Next did not initialize');
    export default {async fetch(request,env,ctx){
      const pathname=new URL(request.url).pathname;
      if(pathname==='/__prewarm-test/routes')return Response.json({routes:globalThis.__prewarmLoaded,startupBinding});
      if(pathname==='/__prewarm-test/budget')return budget.withBudget(async()=>{
        let blocked=false;
        for(let i=0;i<32;i++)await startupFetch('https://prewarm-transport.invalid');
        try{await startupFetch('https://prewarm-transport.invalid');}
        catch(error){if(error.message!=='invocation_subrequest_budget')throw error;blocked=true;}
        return Response.json({blocked});
      });
      const invocationEnv=JSON.parse(request.headers.get('x-prewarm-fixture-env')||'{}');
      if(pathname==='/__prewarm-test/cron'){
        await worker.scheduled({cron:request.headers.get('x-fixture-cron')},invocationEnv);
        return new Response('scheduled');
      }
      return request.headers.get('x-prewarm-next-only')==='true'
        ? budget.withBudget(()=>next.fetch(request,invocationEnv,ctx)) : worker.fetch(request,invocationEnv,ctx);
    }};`;
  const {outputFiles}=await build({stdin:{contents:harness,resolveDir:path.join(root,'.open-next'),sourcefile:'prewarm-test.js'},
    bundle:true,write:false,format:'esm',platform:'node',conditions:['workerd','worker','browser'],target:'es2022',external:['node:*','cloudflare:*'],
    banner:{js:"import {createRequire} from 'node:module';const require=createRequire('file:///worker.js');"},
    plugins:[{name:'prewarm-candidate',setup(build){
      build.onResolve({filter:/^\.\/prewarm-worker\.js$/},()=>({path:plan.entryPath,namespace:'prewarm'}));
      build.onLoad({filter:/.*/,namespace:'prewarm'},()=>({contents:plan.entry,resolveDir:path.dirname(plan.entryPath),loader:'js'}));
      build.onLoad({filter:/[\\/]\.open-next[\\/]worker\.js$/},()=>({contents:plan.worker,resolveDir:path.dirname(plan.workerPath),loader:'js'}));
      build.onLoad({filter:/[\\/]server-functions[\\/]default[\\/]handler\.mjs$/},()=>({
        contents:plan.server.replace(STRICT_PAGE_PRELOAD,STRICT_PAGE_PRELOAD.replace('}).catch(',
          '}).then(()=>globalThis.__prewarmLoaded.push(page)).catch(')),resolveDir:path.dirname(plan.serverPath),loader:'js'}));
    }}]});
  let transports=0,productReads=0;
  const mf=new Miniflare({workers:[{config:{name:'prewarm-fixture',type:'worker',compatibilityDate:'2026-09-07',
    compatibilityFlags:['nodejs_compat'],env:{PREWARM_STARTUP_FIXTURE:{type:'text',value:'bound-before-request'}},
    manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:outputFiles[0].text}}}},
    dev:{outboundService:{type:'fetcher',handler:request=>{
      const url=new URL(request.url);
      if(url.origin==='https://api.printful.com'){
        assert.equal(request.method,'GET');assert.equal(request.headers.get('authorization'),'Bearer fixture-product');productReads++;
        if(url.pathname==='/sync/products')return Response.json({code:200,result:[{id:430964873}],paging:{offset:0,total:1}});
        assert.equal(url.pathname,'/sync/products/430964873');
        return Response.json({code:200,result:{sync_product:{id:430964873,name:'Fixture',is_ignored:false},
          sync_variants:[{id:5292830954,sync_product_id:430964873,name:'Fixture / S',synced:true,is_ignored:false,
            availability_status:'active',retail_price:'30.00',currency:'USD',size:'S',color:'Black'}]}});
      }
      assert.equal(new URL(request.url).hostname,'prewarm-transport.invalid','provider I/O is forbidden');
      transports++;return new Response('fixture');
    }}}}]});
  const env={CHECKOUT_PAUSED:'true',COMMERCE_ENV:'preview',CLOUDFLARE_WORKER_NAME:'localjagoff-review',
    CUSTOMER_EMAIL_ENABLED:'false',COMMUNICATIONS_ENABLED:'false',SITE_URL:'https://fixture.test',
    PROMO_ADMIN_USERNAME:'fixture',PROMO_ADMIN_PASSWORD:'fixture-password'};
  const request=(route,{method='GET',headers={},body,invocationEnv=env}={})=>mf.dispatchFetch('https://fixture.test'+route,
    {method,body,headers:{'x-prewarm-fixture-env':JSON.stringify(invocationEnv),...headers}});
  try{
    await mf.ready;
    assert.equal(transports,0);
    assert.equal(productReads,0);
    const startup=await (await request('/__prewarm-test/routes')).json();
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'.next/server/pages-manifest.json'),'utf8'));
    assert.deepEqual(startup.routes.sort(),Object.keys(manifest).sort());
    assert.equal(startup.startupBinding,'bound-before-request');
    for(const route of ['/api/create-checkout-session','/api/create-checkout-session/','/api/%63reate-checkout-session']){
      const response=await request(route,{method:'POST'});
      assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');await response.text();
    }
    for(const route of ['/api/internal/cloudflare-provider-bootstrap','/api/internal/cloudflare-review-verification']){
      const response=await request(route,{method:'POST'});assert.equal(response.status,404);await response.text();
    }
    for(const cron of ['*/5 * * * *','2 * * * *','17 4 * * *']){
      const response=await request('/__prewarm-test/cron',{headers:{'x-fixture-cron':cron}});
      assert.equal(response.status,200);await response.text();
    }
    const unavailable=await request('/api/contact');assert.equal(unavailable.status,503);await unavailable.text();
    for(const secret of ['a'.repeat(32),'b'.repeat(32)]){
      const response=await request('/api/contact',{invocationEnv:{...env,COMMUNICATIONS_ENABLED:'true',
        COMMUNICATIONS_SECRET:secret,DATABASE_URL:'postgresql://fixture:fixture@fixture.invalid/db'}});
      assert.equal(response.status,200);
      const {challenge,preview}=await response.json();
      const verifyAt=Number(challenge.split('.')[0])+2000;
      assert.equal(preview,true);assert.equal(verifyChallenge(challenge,secret,verifyAt),true);
      assert.equal(verifyChallenge(challenge,'wrong'.repeat(8),verifyAt),false);
    }
    const unauthorized=await request('/api/reviews/moderation');assert.equal(unauthorized.status,401);await unauthorized.text();
    const authorized=await request('/api/reviews/moderation',{method:'PATCH',
      headers:{authorization:'Basic '+Buffer.from('fixture:fixture-password').toString('base64')}});
    assert.equal(authorized.status,405);await authorized.text();
    const events=await request('/api/printful-events');assert.equal(events.status,405);await events.text();
    const Stripe=require('stripe'),crypto=require('node:crypto');
    const stripePayload=JSON.stringify({id:'evt_fixture',type:'prewarm.fixture',livemode:false,data:{object:{}}});
    for(const secret of ['whsec_fixture_a','whsec_fixture_b']){
      const headers={'stripe-signature':Stripe.webhooks.generateTestHeaderString({payload:stripePayload,secret})};
      const invocationEnv={...env,STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:secret};
      const valid=await request('/api/webhook',{method:'POST',headers,body:stripePayload,invocationEnv});
      assert.equal(valid.status,200);await valid.text();
      const invalid=await request('/api/webhook',{method:'POST',headers,body:stripePayload+' ',invocationEnv});
      assert.equal(invalid.status,400);await invalid.text();
    }
    const printfulPayload=JSON.stringify({type:'order_updated',store_id:18032822,occurred_at:new Date().toISOString(),
      retries:0,data:{order:{id:123,store_id:18032822,external_id:'LJ'+'c'.repeat(24)}}});
    for(const secret of ['a1'.repeat(32),'b2'.repeat(32)]){
      const headers={'x-pf-webhook-public-key':'fixture-public',
        'x-pf-webhook-signature':crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(printfulPayload).digest('hex')};
      const invocationEnv={...env,PRINTFUL_WEBHOOK_SECRET:secret,PRINTFUL_WEBHOOK_PUBLIC_KEY:'fixture-public'};
      const valid=await request('/api/printful-events',{method:'POST',headers,body:printfulPayload,invocationEnv});
      assert.equal(valid.status,200);assert.equal((await valid.json()).outcome,'preview_no_provider_or_email');
      const invalid=await request('/api/printful-events',{method:'POST',headers,body:printfulPayload+' ',invocationEnv});
      assert.equal(invalid.status,400);await invalid.text();
    }
    const checkout=await request('/checkout');assert.equal(checkout.status,503);
    assert.match(await checkout.text(),/Checkout \| Local Jagoff/);
    const unpaused=await request('/checkout',{invocationEnv:{...env,CHECKOUT_PAUSED:'false'}});
    assert.equal(unpaused.status,400);assert.match(await unpaused.text(),/Checkout \| Local Jagoff/);
    assert.equal(transports,0);
    const publicEnv={...env,PRINTFUL_API_KEY:'fixture-product'};
    const product=await request('/product/430964873',{invocationEnv:publicEnv});
    assert.equal(product.status,200);const productHtml=await product.text();
    assert.match(productHtml,/Local Jagoff Keystone 724 Tee/);assert.match(productHtml,/ProductGroup/);
    assert.equal(productReads,1);
    const parityDifferences=[];
    for(const method of ['HEAD','OPTIONS']){
      for(const route of ['/api/get-products','/api/meta-catalog','/api/webhook','/api/printful-events',
        '/api/contact','/api/reviews','/feeds/products.tsv','/feeds/openai-products.jsonl','/sitemap.xml','/indexnow-key.txt']){
        const direct=await request(route,{method,invocationEnv:publicEnv});
        const baseline=await request(route,{method,invocationEnv:publicEnv,headers:{'x-prewarm-next-only':'true'}});
        const label=method+' '+route;
        if(direct.status!==baseline.status)parityDifferences.push([label+' status',direct.status,baseline.status]);
        for(const header of ['allow','content-type','cache-control','x-robots-tag']){
          // The adapter deliberately makes otherwise unspecified caching more restrictive.
          if(header==='cache-control'&&baseline.headers.get(header)===null){
            assert.equal(direct.headers.get(header),'no-store',label+' conservative cache policy');continue;
          }
          if(direct.headers.get(header)!==baseline.headers.get(header))parityDifferences.push([label+' '+header,direct.headers.get(header),baseline.headers.get(header)]);
        }
        const directBody=await direct.text(),baselineBody=await baseline.text();
        if(directBody!==baselineBody)parityDifferences.push([label+' body',directBody,baselineBody]);
      }
    }
    assert.deepEqual(parityDifferences,[]);
    for(let i=0;i<2;i++){
      const response=await request('/__prewarm-test/budget');assert.deepEqual(await response.json(),{blocked:true});
    }
    assert.equal(transports,64);
    assert.equal(fs.readFileSync(plan.workerPath,'utf8'),plan.source,'the shared generated worker must not be patched by tests');
    assert.equal(fs.readFileSync(plan.serverPath,'utf8'),plan.sources.get(plan.serverPath));
  }finally{await mf.dispose();}
});
