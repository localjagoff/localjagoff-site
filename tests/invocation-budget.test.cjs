const {test}=require('node:test');
const assert=require('node:assert/strict');
const {installBudget,withBudget,MAX_SUBREQUESTS}=require('../lib/invocation-budget.cjs');
const Stripe=require('stripe');
const {createStore}=require('../lib/communications-store.cjs');
const quiet={info(){}};

test('budget permits 32 fetches and rejects every later call before transport',async()=>{
  let requests=0;const logs=[];
  const fetch=installBudget(async()=>{requests++;return new Response('fixture');});
  await withBudget(async()=>{
    for(let i=0;i<MAX_SUBREQUESTS;i++)await fetch('https://fixture.test');
    await assert.rejects(fetch('https://fixture.test'),/invocation_subrequest_budget/);
    await assert.rejects(fetch('https://fixture.test'),/invocation_subrequest_budget/);
  },{info:(name,data)=>logs.push(data)});
  assert.equal(requests,32);assert.deepEqual(logs,[{subrequests:32,limit:32,exceeded:true}]);
});

test('nested budgets cannot reset allowance and duplicate installation cannot double count',async()=>{
  let requests=0;const fetch=installBudget(async()=>{requests++;});
  assert.equal(installBudget(fetch),fetch);
  await withBudget(async()=>{
    for(let i=0;i<31;i++)await fetch('https://fixture.test');
    await withBudget(async()=>{await fetch('https://fixture.test');await assert.rejects(fetch('https://fixture.test'),/budget/);},quiet);
  },quiet);
  assert.equal(requests,32);
});

test('concurrent invocations have independent budgets, including asynchronous continuations',async()=>{
  let requests=0;const fetch=installBudget(async()=>{await Promise.resolve();requests++;});
  const results=await Promise.allSettled([1,2].map(()=>withBudget(async()=>{
    for(let i=0;i<32;i++)await fetch('https://fixture.test');
    await assert.rejects(fetch('https://fixture.test'),/budget/);
  },quiet)));
  for(const result of results)assert.equal(result.status,'fulfilled');
  assert.equal(requests,64);
});

test('concurrent fetch fanout and failed transports consume allowance',async()=>{
  let calls=0;const fetch=installBudget(async()=>{calls++;throw new Error('fixture transport failure');});
  await withBudget(async()=>{
    const results=await Promise.allSettled(Array.from({length:40},()=>fetch('https://fixture.test')));
    assert.equal(results.filter(r=>r.reason?.message==='fixture transport failure').length,32);
    assert.equal(results.filter(r=>r.reason?.message==='invocation_subrequest_budget').length,8);
  },quiet);
  assert.equal(calls,32);
});

test('redirect hops cannot bypass accounting; Request bodies and explicit manual redirects survive',async()=>{
  const seen=[];const fetch=installBudget(async(input,init)=>{seen.push({input,init});return new Response(null,{status:302});});
  const req=new Request('https://fixture.test',{method:'POST',body:'fixture',redirect:'follow'});
  await withBudget(async()=>{
    await assert.rejects(fetch(req),/invocation_redirect_blocked/);
    await assert.rejects(fetch('https://fixture.test',{redirect:'follow'}),/invocation_redirect_blocked/);
    assert.equal((await fetch('https://fixture.test',{redirect:'manual'})).status,302);
  },quiet);
  assert.equal(seen[0].input,req);assert.equal(await req.text(),'fixture');
  assert.deepEqual(seen.map(x=>x.init.redirect),['manual','manual','manual']);
});

test('Request and init redirect:error use Cloudflare manual transport and preserve normal responses',async()=>{
  for(const scoped of [false,true])for(const onRequest of [false,true]){
    const response=Response.json({ok:true});let calls=0;
    const fetch=installBudget(async(input,init)=>{
      calls++;assert.equal(init.redirect,'manual');
      assert.equal(new Request(input,init).headers.get('authorization'),'Bearer fixture');
      return response;
    });
    const input=onRequest?new Request('https://fixture.test',{redirect:'error',headers:{authorization:'Bearer fixture'}}):'https://fixture.test';
    const init=onRequest?undefined:{redirect:'error',headers:{authorization:'Bearer fixture'}};
    const run=()=>fetch(input,init);
    assert.equal(await (scoped?withBudget(run,quiet):run()),response);assert.equal(calls,1);
    if(onRequest)assert.equal(input.redirect,'error');else assert.equal(init.redirect,'error');
  }
});

test('every 3xx is rejected with body cancellation and no second credential-bearing request',async()=>{
  for(const status of [300,301,302,303,304,305,307,308,399])for(const onRequest of [false,true]){
    let calls=0,canceled=0;
    const fetch=installBudget(async(input,init)=>{
      calls++;assert.equal(init.redirect,'manual');
      return {status,headers:new Headers({location:'https://attacker.test'}),body:{async cancel(){canceled++;}}};
    });
    const input=onRequest?new Request('https://fixture.test',{redirect:'error',headers:{authorization:'Bearer fixture'}}):'https://fixture.test';
    const init=onRequest?undefined:{redirect:'error',headers:{authorization:'Bearer fixture'}};
    await assert.rejects(withBudget(()=>fetch(input,init),quiet),/invocation_redirect_blocked/);
    assert.equal(calls,1);assert.equal(canceled,1);
  }
});

test('redirect rejection survives absent bodies or a failed cancellation',async()=>{
  for(const body of [null,{async cancel(){throw new Error('fixture cancel failed');}}]){
    const fetch=installBudget(async()=>({status:302,body}));
    await assert.rejects(fetch('https://fixture.test',{redirect:'error'}),/invocation_redirect_blocked/);
  }
});

test('budget logging cannot turn accepted work into a retryable error',async()=>{
  assert.equal(await withBudget(async()=> 'accepted',{info(){throw new Error('fixture logger offline');}}),'accepted');
});

test('actual Neon HTTP queries, transaction batches, Stripe fetch client and ordinary fetch share one 32-call allowance',async()=>{
  const original=globalThis.fetch,transports=[];
  globalThis.fetch=installBudget(async(url,options)=>{
    assert.equal(options.redirect,'manual');
    const host=new URL(url).hostname;transports.push(host);
    if(host==='api.stripe.com')return Response.json({id:'cs_fixture',object:'checkout.session'});
    if(host==='api.neon.tech'){
      const body=JSON.parse(options.body),result={fields:[{name:'value',dataTypeID:23}],rows:[['1']],rowCount:1,command:'SELECT'};
      return Response.json(body.queries?{results:body.queries.map(()=>result)}:result);
    }
    assert.equal(host,'fixture.test');return new Response('fixture');
  });
  try{
    const store=createStore({COMMUNICATIONS_ENABLED:'true',DATABASE_URL:'postgresql://fixture:fixture@fixture.neon.tech/fixture'});
    const stripe=new Stripe('sk_test_fixture',{maxNetworkRetries:0,httpClient:Stripe.createFetchHttpClient()});
    await withBudget(async()=>{
      for(let i=0;i<15;i++){
        assert.equal((await store.query('SELECT 1 AS value'))[0].value,1);
        assert.equal((await stripe.checkout.sessions.retrieve('cs_fixture')).id,'cs_fixture');
      }
      await store.sql.transaction([store.sql.query('SELECT 1'),store.sql.query('SELECT 1')]);
      await globalThis.fetch('https://fixture.test');
      await assert.rejects(store.query('SELECT 1'),/invocation_subrequest_budget/);
      await assert.rejects(stripe.checkout.sessions.retrieve('cs_fixture'),error=>error.raw?.detail?.message==='invocation_subrequest_budget'||/connection|budget/i.test(error.message));
    },quiet);
    assert.equal(transports.length,32);assert.equal(transports.filter(h=>h==='api.neon.tech').length,16);
    assert.equal(transports.filter(h=>h==='api.stripe.com').length,15);
  }finally{globalThis.fetch=original;}
});
