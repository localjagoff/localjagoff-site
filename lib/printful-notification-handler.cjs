const {verifyPrintfulSignature,printfulEventIdentity}=require('./customer-lifecycle.cjs');
const {createStore}=require('./communications-store.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
function createPrintfulNotificationHandler({env=process.env,storeFactory=createStore,serviceFactory}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    let raw;
    try{const parts=[];let size=0;for await(const chunk of req){const part=Buffer.from(chunk);size+=part.length;if(size>262144)return res.status(413).json({error:'Payload too large'});parts.push(part);}raw=Buffer.concat(parts);}catch{return res.status(400).json({error:'Invalid payload'});}
    if(!verifyPrintfulSignature(raw,req.headers,env))return res.status(400).json({error:'Invalid signature'});
    let event,identity;
    try{event=JSON.parse(raw.toString());identity=printfulEventIdentity(event,STORE_ID);}catch{return res.status(400).json({error:'Invalid event'});}
    // Signed synthetic Preview requests may prove signature handling, never fulfillment access.
    if(!require('./deployment.cjs').isProduction(env))return res.status(200).json({received:true,outcome:'preview_no_provider_or_email'});
    if(env.COMMUNICATIONS_ENABLED!=='true')return res.status(503).json({error:'Notifications unavailable'});
    try{
      const store=storeFactory(env),reference=event.data.order.external_id;
      const order=await store.order(reference);
      if(!order||String(order.printful_id)!==String(event.data.order.id))return res.status(409).json({error:'Order requires reconciliation'});
      await store.query('INSERT INTO comm_events(identity,order_ref,kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[identity,reference,event.type]);
      if(['shipment_returned','order_refunded','order_canceled','order_failed'].includes(event.type))await store.query('UPDATE comm_orders SET suppress_reviews=true WHERE reference=$1',[reference]);
      await serviceFactory(store).reconcile(reference);
      console.info('printful_notification_reconciled',{event_id:identity,external_id:reference});
      return res.status(200).json({received:true});
    }catch{return res.status(503).json({error:'Notification reconciliation pending'});}
  };
}
module.exports={createPrintfulNotificationHandler};
