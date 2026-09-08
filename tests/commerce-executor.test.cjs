const {test}=require('node:test');
const assert=require('node:assert/strict');
const executor=require('../lib/commerce-executor.cjs');
const {withBudget}=require('../lib/invocation-budget.cjs');
const blocked=()=>assert.fail('No provider, database or sender access permitted');
const preview={COMMERCE_EXECUTOR_ENABLED:'true',CLOUDFLARE_WORKER_NAME:'localjagoff-review',
  COMMERCE_ENV:'preview',SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',
  CHECKOUT_PAUSED:'true',COMMUNICATIONS_ENABLED:'false',CUSTOMER_EMAIL_ENABLED:'false'};
const production={...preview,CLOUDFLARE_WORKER_NAME:'localjagoff-production',COMMERCE_ENV:'production',
  COMMERCE_PRODUCTION_WORKER:'localjagoff-production',
  SITE_URL:'https://www.localjagoff.com',COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true'};

test('executor mode and environment gates close before any work; binding absence never falls back',async()=>{
  for(const env of [preview,{...production,COMMERCE_EXECUTOR_ENABLED:'false'},
    {...production,COMMUNICATIONS_ENABLED:'false'},{...production,CUSTOMER_EMAIL_ENABLED:'false'}]){
    const object=executor.createExecutor(env,{run:blocked,storeFactory:blocked,wakeRun:blocked});
    assert.equal((await object.scheduled('fast')).outcome,'sending_disabled');
    await assert.rejects(object.scheduled('unknown'),/invalid_worker_mode/);
  }
  assert.throws(()=>executor.stub(production),/executor_unavailable/);
});

test('native executor preserves wake and bounded runner modes with runtime-only environment',async()=>{
  let wakes=0,runs=0;
  const storeFactory=()=>({});
  const object=executor.createExecutor(production,{storeFactory,
    wakeRun:async opts=>{wakes++;assert.equal(opts.env,production);assert.equal(opts.storeFactory,storeFactory);return opts.execute();},
    run:async opts=>{runs++;assert.equal(opts.env,production);return {outcome:opts.mode};}});
  for(const mode of ['fast','fallback','cleanup'])assert.equal((await object.scheduled(mode)).outcome,mode);
  assert.equal(wakes,3);assert.equal(runs,3);
});

test('capacity RPC accepts fixed phases only inside isolated paused expiring review',async()=>{
  const env={...preview,CLOUDFLARE_CAPACITY_VERIFY_UNTIL:new Date(Date.now()+600000).toISOString()};
  let calls=0;
  const object=executor.createExecutor(env,{capacityRun:async(e,opts)=>{calls++;assert.equal(e,env);return {outcome:opts.phase};}});
  for(const phase of [-1,11,{},'2',2.1])assert.equal((await object.verifyCapacity(phase)).outcome,'capacity_disabled');
  assert.equal((await object.verifyCapacity(2)).outcome,2);assert.equal(calls,1);
  for(const e of [preview,production,{...env,CHECKOUT_PAUSED:'false'},{...env,CUSTOMER_EMAIL_ENABLED:'true'}]){
    assert.equal((await executor.createExecutor(e,{capacityRun:blocked}).verifyCapacity(2)).outcome,'capacity_disabled');
  }
});

test('private HTTP executor retains exact raw bytes/signature and signals only successful live durable work',async()=>{
  const raw='{"exact":"signed bytes"}\n';let signals=0,requests=0;
  for(const [status,body,expected] of [[400,{error:'signature'},0],[200,{skipped:'test_mode_no_printful'},0],[200,{received:true},1]]){
    const object=executor.createExecutor(production,{apiRequest:async(req,env)=>{
      requests++;assert.equal(env,production);assert.equal(await req.text(),raw);
      assert.equal(req.headers.get('stripe-signature'),'fixture');return Response.json(body,{status});
    },signal:async env=>{assert.equal(env,production);signals++;}});
    const response=await object.fetch(new Request('https://www.localjagoff.com/api/webhook',{
      method:'POST',headers:{'stripe-signature':'fixture'},body:raw}));
    assert.equal(response.status,status);assert.deepEqual(await response.json(),body);assert.equal(signals,expected);
  }
  assert.equal(requests,3);
  const closed=executor.createExecutor(preview,{apiRequest:blocked,signal:blocked});
  for(const path of ['/api/communications/run','/api/webhook/','/api/%77ebhook','/arbitrary']){
    assert.equal((await closed.fetch(new Request('https://example.invalid'+path))).status,404);
  }
});

test('one named object binding call counts toward the parent invocation budget',async()=>{
  let ids=0,gets=0;const target={};const logs=[];
  const env={...preview,COMMERCE_EXECUTOR:{idFromName:name=>{ids++;assert.equal(name,'localjagoff-commerce');return 'fixed';},
    get:id=>{gets++;assert.equal(id,'fixed');return target;}}};
  assert.equal(await withBudget(()=>executor.stub(env),{info:(_,data)=>logs.push(data)}),target);
  assert.equal(ids,1);assert.equal(gets,1);assert.equal(logs[0].subrequests,1);
});

test('real SQLite-backed Durable Object RPC and raw webhook adapter execute with no external access',async()=>{
  const path=require('node:path'),{build}=require('esbuild'),{Miniflare,Log,LogLevel}=require('miniflare');
  const {outputFiles}=await build({stdin:{resolveDir:path.resolve(__dirname,'..'),sourcefile:'executor-fixture.js',contents:`
    export {CommerceExecutor} from './cloudflare-commerce-object.js';
    export default {async fetch(request,env){
      const object=env.COMMERCE_EXECUTOR.get(env.COMMERCE_EXECUTOR.idFromName('fixture'));
      if(new URL(request.url).pathname==='/scheduled')return Response.json(await object.scheduled('fast'));
      if(new URL(request.url).pathname==='/capacity')return Response.json(await object.verifyCapacity(2));
      return object.fetch(request);
    }};
  `},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['node:*','cloudflare:*'],
    banner:{js:"import {createRequire} from 'node:module';const require=createRequire('file:///worker.js');"}});
  let requests=0;
  const env=Object.fromEntries(Object.entries({...preview,STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'})
    .map(([key,value])=>[key,{type:'text',value}]));
  env.COMMERCE_EXECUTOR={type:'durable-object',worker:'executor-fixture',exportName:'CommerceExecutor'};
  const mf=new Miniflare({host:'127.0.0.1',port:0,cf:false,telemetry:{enabled:false},log:new Log(LogLevel.ERROR),workers:[{
    config:{name:'executor-fixture',type:'worker',compatibilityDate:'2026-09-07',compatibilityFlags:['nodejs_compat'],env,
      exports:{CommerceExecutor:{type:'durable-object',storage:'sqlite'}},
      manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:outputFiles[0].text}}}},
    dev:{outboundService:{type:'fetcher',handler:()=>{requests++;throw Error('External access forbidden');}}}}]});
  try{
    assert.equal((await (await mf.dispatchFetch('https://fixture.invalid/scheduled')).json()).outcome,'sending_disabled');
    assert.equal((await (await mf.dispatchFetch('https://fixture.invalid/capacity')).json()).outcome,'capacity_disabled');
    assert.equal((await mf.dispatchFetch('https://fixture.invalid/unknown')).status,404);
    assert.equal((await mf.dispatchFetch('https://fixture.invalid/api/webhook',{method:'POST',body:'{}',headers:{'stripe-signature':'altered'}})).status,400);
    assert.equal(requests,0);
  }finally{await mf.dispose();}
});
