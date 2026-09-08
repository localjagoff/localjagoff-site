const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handoff,RECEIPT}=require('../lib/production-admin-handoff.cjs');
const {createPreparation}=require('../lib/production-preparation.cjs');
function fixture(){
  const records=new Map();
  const store={get:async k=>records.get(k),put:async(k,v)=>records.set(k,v),transaction:async fn=>fn(store)};
  const calls=[];
  const env={PROMO_ADMIN_USERNAME:'fixture-owner',PROMO_ADMIN_PASSWORD:'A'.repeat(43),RESEND_API_KEY:'re_fixture_only',
    CUSTOMER_EMAIL_ENABLED:'false',COMMUNICATIONS_ENABLED:'false',WORKER_SELF_REFERENCE:{fetch:async(url,opts)=>{
      calls.push(url);assert.equal(opts.method,'GET');
      const valid=opts.headers.authorization==='Basic '+Buffer.from('fixture-owner:'+env.PROMO_ADMIN_PASSWORD).toString('base64');
      return valid?(url.endsWith('/admin/reviews')?new Response('<h1>REVIEW QUEUE</h1>'):Response.json({reviews:[]})):
        new Response('Admin login required',{status:401});
    }}};
  return {env,store,records,calls};
}
test('owner handoff verifies both actual routes, sends once to fixed owner, and persists metadata only',async()=>{
  const {env,store,records,calls}=fixture();let sends=0;
  const send=async(payload,key,options)=>{
    sends++;assert.equal(calls.length,6);assert.deepEqual(payload.to,['hello@localjagoff.com']);
    assert.equal(key,RECEIPT);assert.ok(payload.text.includes(env.PROMO_ADMIN_PASSWORD));
    assert.equal(options.env.CUSTOMER_EMAIL_ENABLED,'true');assert.equal(env.CUSTOMER_EMAIL_ENABLED,'false');
    assert.equal(env.COMMUNICATIONS_ENABLED,'false');
    return {id:'11111111-1111-4111-8111-111111111111'};
  };
  const result=await handoff(env,store,{send});assert.equal(result.outcome,'admin_handoff_sent');
  assert.equal(result.checks.every(c=>c.pass),true);assert.equal(sends,1);
  assert.doesNotMatch(JSON.stringify([...records]),/AAAA|fixture-owner|Password|Authorization/);
  assert.doesNotMatch(JSON.stringify(result),/AAAA|fixture-owner/);
  assert.equal((await handoff(env,store,{send})).outcome,'admin_handoff_already_sent');assert.equal(sends,1);
});
test('failed authentication never sends; uncertain send is held instead of duplicated',async()=>{
  let f=fixture();f.env.WORKER_SELF_REFERENCE.fetch=async()=>new Response('unavailable',{status:503});
  assert.equal((await handoff(f.env,f.store,{send:()=>assert.fail('No send')})).outcome,'admin_authentication_failed');
  assert.equal(f.records.size,0);
  f=fixture();let sends=0;const send=async()=>{sends++;throw Error('private provider data');};
  assert.equal((await handoff(f.env,f.store,{send})).outcome,'admin_handoff_requires_review');
  assert.equal((await handoff(f.env,f.store,{send})).outcome,'admin_handoff_requires_review');assert.equal(sends,1);
});
test('owner handoff remains inaccessible outside the exact paused preparation environment',async()=>{
  const {env,store}=fixture();
  assert.equal((await createPreparation(env,{handoffStore:store}).run('admin-handoff')).outcome,'production_preparation_closed');
});
test('authorized moderation can read the queue while customer communications stay disabled',async()=>{
  const storage=require('../lib/communications-store.cjs');
  const original=storage.createStore;
  const names=['PROMO_ADMIN_USERNAME','PROMO_ADMIN_PASSWORD','COMMUNICATIONS_ENABLED'];
  const prior=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  try{
    process.env.PROMO_ADMIN_USERNAME='fixture-owner';process.env.PROMO_ADMIN_PASSWORD='fixture-password';process.env.COMMUNICATIONS_ENABLED='false';
    let reads=0;storage.createStore=env=>{assert.equal(env.COMMUNICATIONS_ENABLED,'true');return {query:async sql=>{assert.match(sql,/^SELECT .*comm_reviews.*status='pending'/);reads++;return [];}};};
    const handler=(await import('../pages/api/reviews/moderation.js')).default;
    const res={setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};
    await handler({method:'GET',headers:{authorization:'Basic '+Buffer.from('fixture-owner:fixture-password').toString('base64')}},res);
    assert.equal(res.code,200);assert.deepEqual(res.body,{reviews:[]});assert.equal(reads,1);
    assert.equal(process.env.COMMUNICATIONS_ENABLED,'false');
  }finally{storage.createStore=original;for(const name of names){if(prior[name]===undefined)delete process.env[name];else process.env[name]=prior[name];}}
});
