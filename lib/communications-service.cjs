const crypto=require('node:crypto');
const {createStore,hash}=require('./communications-store.cjs');
const {recipientFrom}=require('./fulfillment.cjs');
const mail=require('./customer-mail.cjs');
const {deliver}=require('./communications-queue.cjs');
const {reviewEligibility,isProcessing}=require('./customer-lifecycle.cjs');
const {STORE_ID,getDisplayProductName,HIDDEN_PRODUCT_IDS}=require('./commerce-policy.cjs');
const {paidSummary,ownerEmail}=require('./owner-alerts.cjs');

function live(env) {
  if(env.VERCEL_ENV!=='production'||!/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'')||!env.PRINTFUL_API_KEY)throw new Error('live_communication_environment_required');
}
function createService({stripe,env=process.env,store=createStore(env),fetchImpl=fetch,dispatch=deliver}={}) {
  async function get(url) {
    live(env);
    const u=new URL(url,'https://api.printful.com');
    if(u.origin!=='https://api.printful.com'||u.username||u.password||!u.pathname.startsWith('/v2/orders/'))throw new Error('invalid_provider_path');
    const r=await fetchImpl(u.href,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${env.PRINTFUL_API_KEY}`,'X-PF-Store-Id':STORE_ID},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('fulfillment_read_unavailable');
    const body=await r.json();if(!body.data)throw new Error('invalid_provider_response');return body;
  }
  async function collection(path) {
    let next=path,all=[],total;
    for(let page=0;page<20&&next;page++) {
      const parsed=new URL(next,'https://api.printful.com');
      if(parsed.pathname!==path)throw new Error('invalid_provider_pagination');
      const data=await get(next);
      if(!Array.isArray(data.data)||!data._links)throw new Error('incomplete_provider_pagination');
      if(data.paging){if(!Number.isSafeInteger(data.paging.total)||data.paging.total>2000)throw new Error('invalid_provider_pagination');total=data.paging.total;}
      all.push(...data.data);next=data._links.next?.href||null;
    }
    if(next||(total!==undefined&&total!==all.length))throw new Error('incomplete_provider_pagination');
    return all;
  }
  async function snapshot(reference) {
    live(env);const saved=await store.order(reference);
    if(!saved||!saved.printful_id)throw new Error('unlinked_order');
    const session=await stripe.checkout.sessions.retrieve(saved.session_id,{expand:['payment_intent.latest_charge']});
    if(session.id!==saved.session_id||session.livemode!==true||session.metadata?.store_id!==STORE_ID)throw new Error('payment_identity_mismatch');
    const charge=session.payment_intent?.latest_charge;
    const payment={paid:session.payment_status==='paid',refunded:charge&&typeof charge==='object'?(charge.refunded||charge.amount_refunded>0):undefined,disputed:charge&&typeof charge==='object'?charge.disputed:undefined};
    const path=`/v2/orders/${saved.printful_id}`;
    const order=(await get(path)).data;
    if(String(order.id)!==String(saved.printful_id)||String(order.store_id)!==STORE_ID||order.external_id!==reference)throw new Error('fulfillment_identity_mismatch');
    order.order_items=await collection(`${path}/order-items`);
    const shipments=await collection(`${path}/shipments`);
    const checkedAt=Date.now();
    const state={payment,order,shipments,allPagesLoaded:true,knownReturned:saved.suppress_reviews,unresolved:saved.unresolved,checkedAt};
    const eligibility=reviewEligibility(state,checkedAt);
    return {saved,state,eligibility};
  }
  async function beforeReview(reference){return (await snapshot(reference)).eligibility;}
  async function ownerContext({session,event,reference}) {
    if(env.VERCEL_ENV!=='production'||session.livemode!==true||event.livemode!==true)throw new Error('live_communication_environment_required');
    const saved=await store.order(reference);
    // Never re-send a historical receipt merely because the new database is empty.
    if(!saved&&session.metadata.order_email_sent==='true')return null;
    if(saved&&await store.hasJob(`owner/${reference}`))return saved.owner_summary;
    const summary=paidSummary(session,reference);
    const products=summary.items.filter(i=>!HIDDEN_PRODUCT_IDS.has(i.productId)).map(i=>({productId:i.productId,name:i.name}));
    await store.startOwner({reference,session,customer:{email:session.customer_details?.email||session.customer_email||''},
      items:products,summary,payload:ownerEmail(summary)});
    return summary;
  }
  async function recordPaid({session,event,reference}) {
    const summary=await ownerContext({session,event,reference});
    if(!summary||await store.hasJob(`receipt/${reference}`))return;
    const recipient=recipientFrom(session);
    const lines=await stripe.checkout.sessions.listLineItems(session.id,{limit:100});
    if(lines.has_more)throw new Error('incomplete_receipt');
    const payload=mail.orderConfirmation({session,recipient,orderId:reference,lineItems:lines.data.map(i=>({name:i.description||'Local Jagoff item',quantity:i.quantity,amount_subtotal:i.amount_subtotal,amount_total:i.amount_total}))});
    let products=[];
    if(session.metadata.commerce_version==='2') {
      const encoded=JSON.parse(session.metadata.items);
      products=[...new Set(encoded.map(i=>i[0]))].filter(id=>Number.isSafeInteger(id)&&!HIDDEN_PRODUCT_IDS.has(id))
        .map(id=>({productId:id,name:getDisplayProductName({id})}));
    }
    await store.recordPaid({reference,session,customer:{email:recipient.email},items:products,payload,alreadySent:false,
      receiptUncertain:Boolean(session.metadata.printful_order_id)});
    try{await dispatch(store,{key:`receipt/${reference}`,env,beforeReview});}catch{}
  }
  async function recordLinked({reference,order}) {
    const saved=await store.order(reference);
    if(!saved)return;
    await store.link(reference,order.id);
    if(!saved.owner_summary)return;
    await store.resolveOwner(reference,ownerEmail(saved.owner_summary,order),ownerEmail(saved.owner_summary,order,true));
    for(const key of [`owner/${reference}`,`owner-recovery/${reference}`]) {
      try{await dispatch(store,{key,env,beforeReview});}catch{}
    }
  }
  async function recordFailed({session,event,reference}) {
    const summary=await ownerContext({session,event,reference});
    if(!summary)return;
    await store.expediteOwner(reference);
    try{await dispatch(store,{key:`owner/${reference}`,env,beforeReview});}catch{}
  }
  async function reconcile(reference) {
    const {saved,state,eligibility}=await snapshot(reference);
    const orderMail={reference,email:saved.customer.email};
    const blocked=state.payment.paid!==true||state.payment.refunded!==false||state.payment.disputed!==false||
      ['failed','canceled','onhold'].includes(state.order.status)||state.shipments.some(s=>/return|fail|exception/i.test(`${s.delivery_status} ${s.shipment_status}`));
    const delivery=state.shipments.map(s=>({id:s.id,delivery_status:s.delivery_status,delivered_at:s.delivered_at||null,estimated_delivery:s.estimated_delivery||null}));
    await store.query(`UPDATE comm_orders SET delivery=$2,review_due_at=$3,last_checked_at=now(),
      suppress_reviews=suppress_reviews OR $4 WHERE reference=$1`,[reference,JSON.stringify(delivery),eligibility.dueAt||null,blocked]);
    if(blocked) {await store.query("UPDATE comm_outbox SET status='suppressed' WHERE order_ref=$1 AND kind='review' AND status='pending'",[reference]);return {outcome:'review_suppressed'};}
    const readyKeys=[];
    if(isProcessing(state.order)) {
      const key=`processing/${reference}`;
      await store.enqueue(key,'processing',reference,mail.processingEmail(orderMail));readyKeys.push(key);
    }
    for(const shipment of state.shipments) {
      if(!Number.isSafeInteger(shipment.id)||shipment.id<1||!shipment.shipped_at||Date.parse(shipment.shipped_at)>Date.now())continue;
      if(!['shipped','delivered'].includes(shipment.shipment_status))continue;
      const key=`shipment/${reference}/${shipment.id}`;
      await store.enqueue(key,'shipment',reference,mail.shipmentEmail(orderMail,shipment));readyKeys.push(key);
    }
    if(eligibility.eligible&&!saved.suppress_reviews&&saved.items.length) {
      const token=crypto.randomBytes(32).toString('hex');
      const payload=mail.reviewEmail(orderMail,`https://www.localjagoff.com/review#${token}`);
      await store.query(`WITH queued AS(INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash)
        VALUES($1,'review',$2,$3,$4) ON CONFLICT DO NOTHING RETURNING order_ref)
        UPDATE comm_orders SET review_token_hash=$5,review_expires_at=now()+interval '90 days',review_invited_at=now()
        WHERE reference IN(SELECT order_ref FROM queued)`,[`review/${reference}`,reference,JSON.stringify(payload),hash(payload),hash(token)]);
    }
    // Bound webhook work; the durable catch-up job handles unusually large split orders.
    for(const key of readyKeys.slice(0,5)) {try{await dispatch(store,{key,env,beforeReview});}catch{}}
    return {outcome:'reconciled'};
  }
  return {recordPaid,recordLinked,recordFailed,reconcile,beforeReview};
}
module.exports={createService};
