const {verifyPrintfulSignature,printfulEventIdentity}=require('./customer-lifecycle.cjs');
const {createStore,hash}=require('./communications-store.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const {isProduction}=require('./deployment.cjs');
// Printful v2 catalog events have an array payload, independent of order lifecycle events.
function catalogPreviewIdentity(event,now=Date.now()) {
  const occurred=Date.parse(event?.occurred_at);
  if(event?.type!=='catalog_stock_updated'||event.store_id!==Number(STORE_ID)||
    typeof event.occurred_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(event.occurred_at)||
    !Number.isFinite(occurred)||occurred>now+300000||occurred<now-7*86400000||
    !Number.isSafeInteger(event.retries)||event.retries<0||!Array.isArray(event.data)||!event.data.length||
    event.data.some(item=>!Number.isSafeInteger(item?.catalog_product_id)||item.catalog_product_id<=0||
      !Number.isSafeInteger(item.catalog_variant_id)||item.catalog_variant_id<=0||
      !Array.isArray(item.techniques)||item.techniques.some(t=>typeof t!=='string'||!t)||
      typeof item.availability!=='string'||!item.availability))throw new Error('invalid_catalog_event');
  return {identity:hash({type:event.type,store_id:event.store_id,occurred_at:event.occurred_at,data:event.data}),
    ageSeconds:Math.floor((now-occurred)/1000)};
}
function createPrintfulNotificationHandler({env=process.env,storeFactory=createStore,serviceFactory}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    let raw;
    try{const parts=[];let size=0;for await(const chunk of req){const part=Buffer.from(chunk);size+=part.length;if(size>262144)return res.status(413).json({error:'Payload too large'});parts.push(part);}raw=Buffer.concat(parts);}catch{return res.status(400).json({error:'Invalid payload'});}
    if(!verifyPrintfulSignature(raw,req.headers,env))return res.status(400).json({error:'Invalid signature'});
    let event,identity;
    try{
      event=JSON.parse(raw.toString());
      if(event?.type==='catalog_stock_updated'){
        const preview=env.CLOUDFLARE_WORKER_NAME||env.SITE_ID?env.COMMERCE_ENV==='preview':env.VERCEL_ENV==='preview';
        if(isProduction(env)||!preview)return res.status(400).json({error:'Catalog transport is Preview only'});
        identity=catalogPreviewIdentity(event);
      }else identity=printfulEventIdentity(event,STORE_ID);
    }catch{return res.status(400).json({error:'Invalid event'});}
    if(event.type==='catalog_stock_updated'){
      try{
        // This signed Preview branch only writes transport evidence, never outbox/order state.
        const store=storeFactory({...env,COMMUNICATIONS_ENABLED:'true'});
        await store.query(`INSERT INTO comm_preview_events(identity,kind,store_id,occurred_at,age_seconds)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [identity.identity,event.type,event.store_id,event.occurred_at,identity.ageSeconds]);
        return res.status(200).json({received:true,outcome:'preview_catalog_transport_persisted'});
      }catch{return res.status(503).json({error:'Preview transport persistence unavailable'});}
    }
    // Signed synthetic Preview requests may prove signature handling, never fulfillment access.
    if(!isProduction(env))return res.status(200).json({received:true,outcome:'preview_no_provider_or_email'});
    if(env.COMMUNICATIONS_ENABLED!=='true')return res.status(503).json({error:'Notifications unavailable'});
    try{
      const store=storeFactory(env),reference=event.data.order.external_id;
      const order=await store.order(reference);
      if(!order||String(order.printful_id)!==String(event.data.order.id))return res.status(409).json({error:'Order requires reconciliation'});
      await store.query(`WITH inserted AS (
        INSERT INTO comm_events(identity,order_ref,kind) VALUES($1,$2,$3)
        ON CONFLICT DO NOTHING RETURNING order_ref)
        UPDATE comm_orders SET next_due_at=now(),lifecycle_complete=false,reconcile_reason='event',
        reconcile_generation=reconcile_generation+1,suppress_reviews=suppress_reviews OR $4
        WHERE reference IN(SELECT order_ref FROM inserted)`,[identity,reference,event.type,
        ['shipment_returned','order_refunded','order_canceled','order_failed'].includes(event.type)]);
      console.info('printful_notification_queued',{event_id:identity,external_id:reference});
      return res.status(200).json({received:true});
    }catch{return res.status(503).json({error:'Notification reconciliation pending'});}
  };
}
module.exports={createPrintfulNotificationHandler,catalogPreviewIdentity};
