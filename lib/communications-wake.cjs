const budget=require('./invocation-budget.cjs');

// A disposable scheduling hint only. Durable jobs and recipients remain in Neon.
const SCHEMA=`CREATE TABLE IF NOT EXISTS communications_wake (
  id integer PRIMARY KEY CHECK(id=1), version integer NOT NULL DEFAULT 0,
  next_due integer NOT NULL DEFAULT 0
)`;
function enabled(env){return env.COMMUNICATIONS_IDLE_GATE==='true'&&Boolean(env.PUBLIC_CATALOG_DB);}
function createWake(env){
  const query=async(sql,params=[])=>{
    budget.consume();
    return (await env.PUBLIC_CATALOG_DB.prepare(sql).bind(...params).all()).results;
  };
  return {
    async read(){return (await query('SELECT version,next_due FROM communications_wake WHERE id=1'))[0];},
    async signal(){
      await query(`INSERT INTO communications_wake(id,version,next_due) VALUES(1,1,0)
        ON CONFLICT(id) DO UPDATE SET version=version+1,next_due=0`);
    },
    async settle(version,nextDue){
      const value=nextDue===null?Number.MAX_SAFE_INTEGER:Date.parse(nextDue);
      if(!Number.isFinite(value)||value<0)throw Error('invalid_communications_due_hint');
      return (await query(`UPDATE communications_wake SET next_due=?2,version=version+1
        WHERE id=1 AND version=?1 RETURNING id`,[version,value])).length===1;
    },
  };
}
async function signal(env){
  if(!enabled(env))return;
  try{await createWake(env).signal();}
  catch{console.error('communications_wake',{outcome:'hint_unavailable_hourly_recovery'});}
}
async function run({env,mode,execute,storeFactory,wake=enabled(env)?createWake(env):null,now=Date.now}){
  if(!wake||mode==='cleanup')return execute();
  let state;
  try{
    state=await wake.read();
    if(!state){await wake.signal();state=await wake.read();}
  }catch{ /* Hint failure cannot suppress durable queue processing. */ }
  if(mode==='fast'&&state&&Number.isSafeInteger(state.next_due)&&state.next_due>now()){
    return {outcome:'no_due_work_hint'};
  }
  const result=await execute();
  const active=['sent','retry_scheduled','reconciled','reconciled_partial','manual_review_required',
    'reconciliation_retry_scheduled','review_suppressed','review_check_unavailable','pending','suppressed','held',
    'daily_mail_budget','review_changed_before_send','payload_integrity_failed','idempotency_window_requires_review'];
  if(active.includes(result?.outcome)){
    // Work may have queued more work. Keep the hint due; the first empty tick computes the next due time.
    // Incrementing the generation also protects a concurrent writer or idle settle.
    try{await wake.signal();}catch{console.error('communications_wake',{outcome:'hint_refresh_failed_retry_preserved'});}
    return result;
  }
  if(state){
    try{
      const due=await storeFactory(env).nextFastDue();
      await wake.settle(state.version,due);
    }catch{console.error('communications_wake',{outcome:'hint_refresh_failed_retry_preserved'});}
  }
  return result;
}
module.exports={SCHEMA,enabled,createWake,signal,run};
