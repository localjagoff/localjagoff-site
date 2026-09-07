import Stripe from 'stripe';
import storage from '../../../lib/communications-store.cjs';
import queue from '../../../lib/communications-queue.cjs';
import communications from '../../../lib/communications-service.cjs';
import auth from '../../../lib/communications-auth.cjs';
export const config={maxDuration:300};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  const supplied=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
  if(!auth.equal(supplied,process.env.CRON_SECRET))return res.status(401).json({error:'Unauthorized'});
  if(process.env.VERCEL_ENV!=='production'||process.env.COMMUNICATIONS_ENABLED!=='true'||process.env.CUSTOMER_EMAIL_ENABLED!=='true')return res.status(200).json({outcome:'sending_disabled'});
  const started=Date.now();let reconciled=0,sent=0,held=0,failed=0;
  try{
    const store=storage.createStore(),service=communications.createService({store,stripe:new Stripe(process.env.STRIPE_SECRET_KEY)});
    const orders=await store.query(`SELECT reference FROM comm_orders WHERE printful_id IS NOT NULL
      AND updated_at>now()-interval '180 days' ORDER BY last_checked_at ASC NULLS FIRST LIMIT 20`);
    for(const order of orders){if(Date.now()-started>120000)break;try{await service.reconcile(order.reference);reconciled++;}catch{failed++;await store.query('UPDATE comm_orders SET last_checked_at=now() WHERE reference=$1',[order.reference]);}}
    for(let i=0;i<40&&Date.now()-started<240000;i++){
      const result=await queue.deliver(store,{beforeReview:service.beforeReview});
      if(result.outcome==='no_due_job')break;
      if(result.outcome==='sent')sent++;else held++;
    }
    await store.cleanup();
    return res.status(200).json({reconciled,sent,deferred_or_held:held,reconciliation_failures:failed});
  }catch{return res.status(503).json({error:'Communications check incomplete',reconciled,sent});}
}
