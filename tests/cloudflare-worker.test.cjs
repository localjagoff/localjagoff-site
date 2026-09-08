const {test}=require('node:test');
const assert=require('node:assert/strict');
const {registerHooks}=require('node:module');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

test('worker eagerly loads native modules without startup I/O or constructing clients',()=>{
  execFileSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    const require=createRequire(import.meta.url);
    let requests=0;
    globalThis.fetch=()=>{requests++;throw Error('startup network forbidden');};
    await import('./cloudflare-worker.js');
    for(const module of ['./lib/communications-store.cjs','./lib/communications-runner.cjs',
      '@neondatabase/serverless','stripe','./lib/cloudflare-provider-bootstrap.cjs','./lib/cloudflare-api-adapter.cjs']){
      assert.ok(require.cache[require.resolve(module)]?.loaded,module+' must initialize at startup');
    }
    assert.equal(requests,0);
  `],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
});

test('worker guards avoid Next and provider I/O; eager native and lazy HTTP paths remain budgeted',async()=>{
  const original=globalThis.fetch,info=console.info;
  const trace={nextLoads:0,runnerLoads:0,requests:0,modes:[]};
  globalThis.__cloudflareTestTrace=trace;
  globalThis.fetch=async()=>{trace.requests++;return new Response('fixture');};
  console.info=()=>{};
  const hooks=registerHooks({load(url,context,nextLoad){
    if(url.endsWith('/.open-next/worker.js')){
      trace.nextLoads++;return {format:'module',shortCircuit:true,source:`export default {async fetch(){
        for(let i=0;i<32;i++)await globalThis.fetch('https://fixture.test');
        try{await globalThis.fetch('https://fixture.test');throw Error('budget bypass');}
        catch(error){if(error.message!=='invocation_subrequest_budget')throw error;}
        return new Response('next fixture');
      }};`};
    }
    if(url.endsWith('/lib/communications-runner.cjs')){
      trace.runnerLoads++;return {format:'commonjs',shortCircuit:true,source:`module.exports={async runCommunications({mode}){
        globalThis.__cloudflareTestTrace.modes.push(mode);
        for(let i=0;i<32;i++)await globalThis.fetch('https://fixture.test');
        try{await globalThis.fetch('https://fixture.test');throw Error('budget bypass');}
        catch(error){if(error.message!=='invocation_subrequest_budget')throw error;}
        return {outcome:'fixture'};
      }};`};
    }
    return nextLoad(url,context);
  }});
  try{
    const {default:worker}=await import(pathToFileURL(path.resolve(__dirname,'../cloudflare-worker.js')).href);
    assert.deepEqual([trace.nextLoads,trace.runnerLoads,trace.requests],[0,1,0]);
    for(const route of ['/api/create-checkout-session','/api/create-checkout-session/','/api/%63reate-checkout-session?fixture=1']){
      const result=await worker.fetch(new Request('https://review.example.test'+route,{method:'POST'}),{CHECKOUT_PAUSED:'true'},{});
      assert.equal(result.status,503);assert.equal(result.headers.get('cache-control'),'no-store');
    }
    assert.equal((await worker.fetch(new Request('https://review.example.test/%ZZ'),{},{})).status,400);
    await worker.scheduled({cron:'*/5 * * * *'},{CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview'});
    const bootstrapUrl='https://review.example.test/api/internal/cloudflare-provider-bootstrap';
    assert.equal((await worker.fetch(new Request(bootstrapUrl,{method:'POST'}),{},{})).status,404);
    const setup={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',CHECKOUT_PAUSED:'true',
      CUSTOMER_EMAIL_ENABLED:'false',SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',
      CLOUDFLARE_PROVIDER_SETUP_UNTIL:new Date(Date.now()+600000).toISOString(),CRON_SECRET:'s'.repeat(32)};
    assert.equal((await worker.fetch(new Request(bootstrapUrl,{method:'POST'}),setup,{})).status,401);
    assert.equal((await worker.fetch(new Request(bootstrapUrl,{method:'POST',headers:{authorization:'Bearer '+setup.CRON_SECRET}}),setup,{})).status,503);
    assert.deepEqual([trace.nextLoads,trace.runnerLoads,trace.requests],[0,1,0]);
    assert.deepEqual(trace.modes,[]);
    for(const [route,status] of [['/api/contact',503],['/api/printful-events',405],['/api/webhook',405],['/indexnow-key.txt',200]]){
      const response=await worker.fetch(new Request('https://review.example.test'+route),{},{});
      assert.equal(response.status,status);await response.text();
    }
    assert.deepEqual([trace.nextLoads,trace.runnerLoads,trace.requests],[0,1,0]);
    assert.equal(await (await worker.fetch(new Request('https://review.example.test/api/fixture'),{},{})).text(),'next fixture');
    assert.deepEqual([trace.nextLoads,trace.requests],[1,32]);
    const live={CLOUDFLARE_WORKER_NAME:'localjagoff-production',COMMERCE_PRODUCTION_WORKER:'localjagoff-production',
      SITE_URL:'https://www.localjagoff.com',COMMERCE_ENV:'production',COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true'};
    for(const cron of ['*/5 * * * *','2 * * * *','17 4 * * *'])await worker.scheduled({cron},live);
    assert.deepEqual(trace.modes,['fast','fallback','cleanup']);assert.equal(trace.runnerLoads,1);assert.equal(trace.requests,128);
    for(const cron of ['unexpected','__proto__','constructor'])await assert.rejects(worker.scheduled({cron},live),/invalid_worker_schedule/);
    const review=require('../lib/cloudflare-review-verification.cjs'),scheduled=review.scheduled;
    const verification={...setup,CLOUDFLARE_REVIEW_VERIFY_UNTIL:new Date(Date.now()+600000).toISOString()};
    try{
      review.scheduled=async env=>{
        assert.equal(env,verification);
        await globalThis.fetch('https://fixture.test');
        return {outcome:'review fixture'};
      };
      await worker.scheduled({cron:'*/5 * * * *'},verification);
      assert.deepEqual(trace.modes,['fast','fallback','cleanup']);
      assert.equal(trace.requests,129);
    }finally{review.scheduled=scheduled;}
    const bootstrap=require('../lib/cloudflare-provider-bootstrap.cjs'),bootstrapRequest=bootstrap.request;
    const request=new Request(bootstrapUrl+'?fixture=1',{method:'POST'});
    try{
      bootstrap.request=async(req,env)=>{
        assert.equal(req,request);assert.equal(env,setup);
        for(let i=0;i<32;i++)await globalThis.fetch('https://fixture.test');
        await assert.rejects(globalThis.fetch('https://fixture.test'),/invocation_subrequest_budget/);
        return new Response('bootstrap fixture');
      };
      assert.equal(await (await worker.fetch(request,setup,{})).text(),'bootstrap fixture');
      assert.equal(trace.requests,161);
      // Only the exact pathname may enter the native setup handler.
      for(const suffix of ['/', '-extra']){
        assert.equal(await (await worker.fetch(new Request(bootstrapUrl+suffix),setup,{})).text(),'next fixture');
      }
      assert.equal(trace.requests,225);
      assert.deepEqual([trace.nextLoads,trace.runnerLoads],[1,1]);
    }finally{bootstrap.request=bootstrapRequest;}
    const api=require('../lib/cloudflare-api-adapter.cjs'),apiRequest=api.request;
    try{
      let calls=0;
      api.request=async()=>{calls++;throw Error('adapter must stay behind native guards');};
      assert.equal((await worker.fetch(new Request('https://review.example.test/api/create-checkout-session'),{CHECKOUT_PAUSED:'true'},{})).status,503);
      assert.equal((await worker.fetch(new Request('https://review.example.test/%ZZ'),{},{})).status,400);
      assert.equal((await worker.fetch(new Request(bootstrapUrl),{},{})).status,404);
      assert.equal((await worker.fetch(new Request('https://review.example.test/api/internal/cloudflare-review-verification'),{},{})).status,404);
      assert.equal(calls,0);
      api.request=async(request,currentEnv)=>{
        calls++;assert.equal(currentEnv,setup);
        for(let i=0;i<32;i++)await globalThis.fetch('https://fixture.test');
        await assert.rejects(globalThis.fetch('https://fixture.test'),/invocation_subrequest_budget/);
        return new Response('native fixture');
      };
      const response=await worker.fetch(new Request('https://review.example.test/api/get-products'),setup,{});
      assert.equal(await response.text(),'native fixture');assert.equal(calls,1);
      assert.equal(trace.requests,257);assert.equal(trace.nextLoads,1);
    }finally{api.request=apiRequest;}
    const wake=require('../lib/communications-wake.cjs'),signal=wake.signal;
    try{
      let signals=0;
      wake.signal=async()=>{signals++;};
      for(const [status,body,currentEnv,expected] of [
        [400,{error:'bad_signature'},live,0],
        [200,{received:true,skipped:'test_mode_no_printful'},live,0],
        [200,{received:true},setup,0],
        [200,{received:true},live,1],
      ]){
        api.request=async()=>Response.json(body,{status});
        await worker.fetch(new Request('https://www.localjagoff.com/api/webhook',{method:'POST'}),currentEnv,{});
        assert.equal(signals,expected);
      }
    }finally{api.request=apiRequest;wake.signal=signal;}
    const checkout=await worker.fetch(new Request('https://review.example.test/api/create-checkout-session',{method:'POST'}),{CHECKOUT_PAUSED:'false'},{});
    assert.equal(checkout.status,400);assert.deepEqual(await checkout.json(),{error:'Invalid items'});
    assert.equal(trace.requests,257,'native invalid checkout never loads Next or fetches a provider');
    const fallback=await worker.fetch(new Request('https://review.example.test/unhandled'),setup,{});
    assert.equal(await fallback.text(),'next fixture');assert.equal(trace.requests,289);
  }finally{hooks.deregister();globalThis.fetch=original;console.info=info;delete globalThis.__cloudflareTestTrace;}
});
