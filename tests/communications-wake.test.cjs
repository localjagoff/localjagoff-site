const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {PGlite}=require('@electric-sql/pglite');
const wake=require('../lib/communications-wake.cjs');
const {createStore}=require('../lib/communications-store.cjs');

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec(wake.SCHEMA);
  const database={prepare(sql){return {bind(...args){return {all:async()=>({results:db.prepare(sql).all(...args)})};}};}};
  const env={COMMUNICATIONS_IDLE_GATE:'true',PUBLIC_CATALOG_DB:database};
  return {db,env,wake:wake.createWake(env)};
}
test('idle ticks use D1 only; new signal wakes immediately and hourly fallback always executes',async()=>{
  const f=fixture();let executions=0,queries=0;
  const args={env:f.env,execute:async()=>{executions++;return {outcome:'no_due_order'};},
    storeFactory:()=>({nextFastDue:async()=>{queries++;return null;}})};
  try{
    await wake.run({...args,mode:'fast'});
    assert.equal(executions,1);assert.equal(queries,1);
    for(let i=0;i<12;i++)assert.equal((await wake.run({...args,mode:'fast'})).outcome,'no_due_work_hint');
    assert.equal(executions,1);assert.equal(queries,1);
    await wake.run({...args,mode:'fallback'});assert.equal(executions,2);
    await f.wake.signal();await wake.run({...args,mode:'fast'});assert.equal(executions,3);
  }finally{f.db.close();}
});
test('future retries wake at due time; concurrent durable writer signal cannot be cleared',async()=>{
  const f=fixture();const due=Date.now()+600000;let executions=0;
  const args={env:f.env,execute:async()=>{executions++;return {};},
    storeFactory:()=>({nextFastDue:async()=>new Date(due).toISOString()})};
  try{
    await wake.run({...args,mode:'fast'});
    assert.equal((await wake.run({...args,mode:'fast',now:()=>due-1})).outcome,'no_due_work_hint');
    await wake.run({...args,mode:'fast',now:()=>due});assert.equal(executions,2);
    await wake.run({...args,mode:'fallback',storeFactory:()=>({nextFastDue:async()=>{
      await f.wake.signal();return null;
    }})});
    assert.equal((await f.wake.read()).next_due,0);
  }finally{f.db.close();}
});
test('lost hint, failed hint read and failed drain cannot lose durable work',async()=>{
  let calls=0;
  const args={env:{},mode:'fast',execute:async()=>{calls++;return {};},storeFactory:()=>{throw Error('unused');}};
  await wake.run({...args,wake:{read:async()=>{throw Error('D1 unavailable');}}});
  assert.equal(calls,1);
  const f=fixture();
  try{
    await f.wake.signal();
    await assert.rejects(wake.run({...args,env:f.env,execute:async()=>{throw Error('crash');}}),/crash/);
    assert.equal((await f.wake.read()).next_due,0);
    await assert.rejects(f.wake.settle(1,'bad-date'),/invalid_communications_due_hint/);
  }finally{f.db.close();}
});
test('disabled hint and cleanup preserve existing runner behavior without accessing D1',async()=>{
  let calls=0;
  const database={prepare(){throw Error('D1 must not run');}};
  await wake.run({env:{PUBLIC_CATALOG_DB:database},mode:'fast',execute:async()=>calls++});
  await wake.run({env:{PUBLIC_CATALOG_DB:database,COMMUNICATIONS_IDLE_GATE:'true'},mode:'cleanup',execute:async()=>calls++});
  assert.equal(calls,2);
});
test('Neon next-due query includes future jobs, expired send leases and event work only',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`SET timezone='UTC';
      CREATE TABLE comm_outbox(status text,next_attempt_at timestamptz,lease_until timestamptz);
      CREATE TABLE comm_orders(printful_id bigint,lifecycle_complete boolean,reconcile_reason text,
        next_due_at timestamptz,reconcile_lease_until timestamptz);`);
    const sqlClient={query:async(sql,args)=>(await db.query(sql,args)).rows};
    const store=createStore({COMMUNICATIONS_ENABLED:'true',DATABASE_URL:'fixture'},{sqlClient});
    assert.equal(await store.nextFastDue(),null);
    await db.exec(`INSERT INTO comm_outbox VALUES ('pending','2030-01-01',NULL),('sent','2000-01-01',NULL),
      ('held','2000-01-01',NULL),('sending',NULL,'2029-01-01');
      INSERT INTO comm_orders VALUES (1,true,'event','2000-01-01',NULL),
      (2,false,'fallback','2000-01-01',NULL),(3,false,'event','2028-01-01','2031-01-01');`);
    assert.equal(new Date(await store.nextFastDue()).toISOString(),'2029-01-01T00:00:00.000Z');
    await db.exec("UPDATE comm_orders SET reconcile_lease_until=NULL WHERE printful_id=3");
    assert.equal(new Date(await store.nextFastDue()).toISOString(),'2028-01-01T00:00:00.000Z');
  }finally{await db.close();}
});
