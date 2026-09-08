const {createLifecycleStripe} = require('./lifecycle-stripe-reader.cjs');
const {createStore,alertOwner} = require('./communications-store.cjs');
const {deliver} = require('./communications-queue.cjs');
const {createService} = require('./communications-service.cjs');
const {isProduction} = require('./deployment.cjs');

async function runCommunications({env=process.env,storeFactory=createStore,serviceFactory=createService,
  stripeFactory=createLifecycleStripe,dispatch=deliver,mode='fast'}={}) {
  if (!isProduction(env) || env.COMMUNICATIONS_ENABLED!=='true' || env.CUSTOMER_EMAIL_ENABLED!=='true') {
    return {outcome:'sending_disabled'};
  }
  if(!['fast','fallback','cleanup'].includes(mode))throw new Error('invalid_worker_mode');
  const store=storeFactory(env);
  if(mode==='cleanup'){await store.cleanup();return {outcome:'cleanup_complete'};}
  let service;
  // Transactional mail and empty queues do not need a Stripe client or lifecycle service.
  const lifecycle=()=>service??=serviceFactory({store,env,
    stripe:stripeFactory(env)});
  // One send OR one order per invocation; a review send includes its fresh read.
  if(mode==='fast') {
    const sent=await dispatch(store,{env,beforeReview:(...args)=>lifecycle().beforeReview(...args)});
    if(sent.outcome!=='no_due_job')return sent;
  }
  const job=await store.claimReconciliation(mode==='fast'?'event':'fallback');
  if(!job)return {outcome:'no_due_order'};
  try {
    const result=await lifecycle().reconcile(job.reference,job);
    await store.finishReconciliation(job,{complete:result.complete===true,continuation:result.continuation===true});
    return {outcome:result.outcome,reconciled:1};
  } catch {
    await alertOwner(store,job.reference,'lifecycle verification failed or exceeded the bounded provider read allowance');
    await store.finishReconciliation(job,{retry:true});
    return {outcome:'reconciliation_retry_scheduled',reconciled:0};
  }
}

module.exports={runCommunications};
