const Stripe = require('stripe');
const {createStore} = require('./communications-store.cjs');
const {deliver} = require('./communications-queue.cjs');
const {createService} = require('./communications-service.cjs');
const {isProduction} = require('./deployment.cjs');

async function runCommunications({env=process.env,storeFactory=createStore,serviceFactory=createService,
  dispatch=deliver,now=Date.now}={}) {
  if (!isProduction(env) || env.COMMUNICATIONS_ENABLED!=='true' || env.CUSTOMER_EMAIL_ENABLED!=='true') {
    return {outcome:'sending_disabled'};
  }
  const started=now();let reconciled=0,sent=0,held=0,failed=0;
  const store=storeFactory(env),service=serviceFactory({store,env,
    stripe:new Stripe(env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1})});
  const orders=await store.query(`SELECT reference FROM comm_orders WHERE printful_id IS NOT NULL
    AND updated_at>now()-interval '180 days' ORDER BY last_checked_at ASC NULLS FIRST LIMIT 20`);
  for (const order of orders) {
    if (now()-started>120000) break;
    try {await service.reconcile(order.reference);reconciled++;}
    catch {failed++;await store.query('UPDATE comm_orders SET last_checked_at=now() WHERE reference=$1',[order.reference]);}
  }
  for (let i=0;i<40&&now()-started<240000;i++) {
    const result=await dispatch(store,{env,beforeReview:service.beforeReview});
    if (result.outcome==='no_due_job') break;
    if (result.outcome==='sent') sent++;else held++;
  }
  await store.cleanup();
  return {reconciled,sent,deferred_or_held:held,reconciliation_failures:failed};
}

module.exports={runCommunications};
