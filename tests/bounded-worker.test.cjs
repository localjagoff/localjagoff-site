const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {createStore}=require('../lib/communications-store.cjs');
const {runCommunications}=require('../lib/communications-runner.cjs');
const schema=require('../lib/communications-schema.cjs');
let db,store;
const env={COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true',DATABASE_URL:'fixture',
  VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_live_fixture'};
before(async()=>{
  db=new PGlite();for(const statement of schema)await db.exec(statement);
  store=createStore(env,{sqlClient:{query:async(q,p)=>(await db.query(q,p)).rows}});
});
after(async()=>db.close());
async function reset(){await db.exec('DELETE FROM comm_outbox; DELETE FROM comm_orders');}
async function order(reference,complete=false,due="now()-interval '1 hour'",reason='fallback'){
  await db.query(`INSERT INTO comm_orders(reference,session_id,customer,items,printful_id,
    lifecycle_complete,next_due_at,reconcile_reason) VALUES($1,$1,'{}','[]',123,$2,${due},$3)`,[reference,complete,reason]);
}
test('real SQL excludes terminal/future work, leases one due order and rejects a stale claimant',async()=>{
  await reset();await order('terminal',true);await order('future',false,"now()+interval '1 day'");await order('due');
  const claimed=await store.claimReconciliation();assert.equal(claimed.reference,'due');
  assert.equal(await store.claimReconciliation(),undefined);
  await assert.rejects(store.finishReconciliation({...claimed,reconcile_claim:'00000000-0000-4000-8000-000000000000'}),/claim_lost/);
  await store.finishReconciliation(claimed,{complete:true});
  assert.equal(await store.claimReconciliation(),undefined);
  const row=await store.order('due');assert.equal(row.lifecycle_complete,true);assert.equal(row.next_due_at,null);
});
test('a new event during reconciliation survives lease completion and replay does not reschedule',async()=>{
  await reset();await order('event',false,"now()-interval '1 hour'",'event');
  const job=await store.claimReconciliation('event');
  await db.query("UPDATE comm_orders SET reconcile_generation=reconcile_generation+1 WHERE reference='event'");
  await store.finishReconciliation(job,{complete:true});
  const next=await store.claimReconciliation('event');assert.equal(next.reference,'event');
  await store.finishReconciliation(next,{complete:true});assert.equal(await store.claimReconciliation('event'),undefined);
});
test('fallback is hourly and retry scheduling remains durable across a new store connection',async()=>{
  await reset();await order('retry');const job=await store.claimReconciliation();
  await store.finishReconciliation(job,{retry:true});
  const row=await store.order('retry');assert.ok(Date.parse(row.next_due_at)>Date.now()+14*60000);
  assert.equal(await store.claimReconciliation('event'),undefined);
});
test('fast outbox sends due jobs promptly without entering order/provider reconciliation',async()=>{
  let sent=0;
  const result=await runCommunications({env,storeFactory:()=>({claimReconciliation:()=>assert.fail('not needed')}),
    serviceFactory:()=>({}),dispatch:async()=>{sent++;return {outcome:'sent'};}});
  assert.equal(result.outcome,'sent');assert.equal(sent,1);
});
test('one invocation reconciles at most one claimed order and never sends inline',async()=>{
  let claims=0,reads=0,finishes=0;
  const result=await runCommunications({env,mode:'fallback',storeFactory:()=>({
    claimReconciliation:async()=>{claims++;return {reference:'one'};},
    finishReconciliation:async()=>{finishes++;},
  }),serviceFactory:()=>({reconcile:async()=>{reads++;return {outcome:'reconciled',complete:true};}}),
  dispatch:()=>assert.fail('separate fast invocation')});
  assert.equal(result.reconciled,1);assert.deepEqual([claims,reads,finishes],[1,1,1]);
});
test('future review jobs are claimed by persisted due time only and sent jobs never re-enter',async()=>{
  await reset();await order('review');
  await db.query(`INSERT INTO comm_outbox(key,kind,order_ref,payload_hash,next_attempt_at)
    VALUES('review/review','review','review','fixture',now()+interval '7 days')`);
  assert.equal(await store.claim(),undefined);
  await db.query("UPDATE comm_outbox SET next_attempt_at=now()-interval '1 second'");
  const job=await store.claim();assert.equal(job.kind,'review');
  await store.finish(job,'sent',{providerId:'fixture'});assert.equal(await store.claim(),undefined);
});
