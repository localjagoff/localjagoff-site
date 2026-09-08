const crypto=require('node:crypto');
const {isProduction}=require('./deployment.cjs');
const {createStore,hash,alertOwner}=require('./communications-store.cjs');
const {recipientFrom}=require('./fulfillment.cjs');
const mail=require('./customer-mail.cjs');
const {deliver}=require('./communications-queue.cjs');
const {reviewEligibility,isProcessing}=require('./customer-lifecycle.cjs');
const {STORE_ID,getDisplayProductName,HIDDEN_PRODUCT_IDS}=require('./commerce-policy.cjs');
const {paidSummary,ownerEmail}=require('./owner-alerts.cjs');

function live(env) {
  if(!isProduction(env)||!/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'')||!env.PRINTFUL_API_KEY)throw new Error('live_communication_environment_required');
}
function createService({stripe,env=process.env,store=createStore(env),fetchImpl=fetch,dispatch=deliver}={}) {
  async function get(url) {
    live(env);
    const u=new URL(url,'https://api.printful.com');
    if(u.origin!=='https://api.printful.com'||u.username||u.password||!u.pathname.startsWith('/v2/orders/'))throw new Error('invalid_provider_path');
    const r=await fetchImpl(u.href,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${env.PRINTFUL_API_KEY}`,'X-PF-Store-Id':STORE_ID},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('fulfillment_read_unavailable');
    const body=await r.json().catch(()=>null);if(!body?.data)throw new Error('invalid_provider_response');return body;
  }
  async function collection(path) {
    let next=path,all=[],total;const visited=new Set();
    for(let page=0;page<2&&next;page++) {
      const parsed=new URL(next,'https://api.printful.com');
      if(parsed.pathname!==path||visited.has(parsed.href))throw new Error('invalid_provider_pagination');
      visited.add(parsed.href);
      const data=await get(next);
      if(!Array.isArray(data.data)||!data._links)throw new Error('incomplete_provider_pagination');
      if(data.paging){if(!Number.isSafeInteger(data.paging.total)||data.paging.total<0||data.paging.total>200||
        (total!==undefined&&total!==data.paging.total))throw new Error('invalid_provider_pagination');total=data.paging.total;}
      all.push(...data.data);if(all.length>200)throw new Error('provider_read_budget');next=data._links.next?.href||null;
    }
    if(next||(total!==undefined&&total!==all.length))throw new Error('incomplete_provider_pagination');
    return all;
  }
  async function snapshot(reference,claimed,lifecycleOnly=false) {
    live(env);const checkedAt=Date.now(),saved=claimed?.reference===reference&&claimed.reconcile_claim?claimed:await store.order(reference,{lifecycleOnly});
    if(!saved||!saved.printful_id)throw new Error('unlinked_order');
    const session=await stripe.checkout.sessions.retrieve(saved.session_id,{expand:['payment_intent.latest_charge']});
    if(session.id!==saved.session_id||session.livemode!==true||session.metadata?.store_id!==STORE_ID)throw new Error('payment_identity_mismatch');
    const charge=session.payment_intent?.latest_charge;
    const payment={paid:session.payment_status==='paid',refunded:charge&&typeof charge==='object'?(charge.refunded||charge.amount_refunded>0):undefined,disputed:charge&&typeof charge==='object'?charge.disputed:undefined};
    const path=`/v2/orders/${saved.printful_id}`;
    const order=(await get(path)).data;
    if(String(order.id)!==String(saved.printful_id)||String(order.store_id)!==STORE_ID||order.external_id!==reference)throw new Error('fulfillment_identity_mismatch');
    let shipments;
    try {
      order.order_items=await collection(`${path}/order-items`);
      shipments=await collection(`${path}/shipments`);
      if(order.order_items.some(i=>!i||typeof i!=='object')||shipments.some(s=>!s||typeof s!=='object'))throw new Error('invalid_provider_response');
    } catch(error) {
      if(order.status==='fulfilled'&&/^(invalid_provider_|incomplete_provider_|provider_read_budget)/.test(error.message))error.terminalOrder=saved;
      throw error;
    }
    const state={payment,order,shipments,allPagesLoaded:true,knownReturned:saved.suppress_reviews,unresolved:saved.unresolved,checkedAt};
    const eligibility=shipments.some(s=>s.reshipment===true)?{eligible:false,reason:'replacement_requires_review'}:reviewEligibility(state);
    return {saved,state,eligibility};
  }
  async function beforeReview(reference){
    let result;
    try{result=await snapshot(reference,undefined,true);}catch(error){
      if(!error.terminalOrder)throw error;
      const manual=await manualReview(error.terminalOrder,'terminal_fulfillment_payload_requires_review');
      return {eligible:false,reason:manual.complete?'manual_review_required':'event_during_review_check'};
    }
    const {saved,state,eligibility}=result;
    if(saved.review_manual_reason)return {eligible:false,reason:'manual_review_required'};
    if(saved.suppress_reviews||saved.unresolved||eligibility.reason==='fresh_provider_check_required')return eligibility;
    if(state.order.status==='fulfilled'&&!eligibility.dueAt&&
      !['payment_not_clear','manual_review_required','shipment_problem'].includes(eligibility.reason)) {
      const manual=await manualReview(saved,eligibility.reason);
      return manual.complete?eligibility:{eligible:false,reason:'event_during_review_check'};
    }
    const rows=await store.query(`UPDATE comm_orders SET review_due_at=$2,last_checked_at=now()
      WHERE reference=$1 AND reconcile_generation=$3 AND suppress_reviews=false AND unresolved=false
      RETURNING reference`,[reference,eligibility.dueAt||null,saved.reconcile_generation]);
    if(!rows.length)return {eligible:false,reason:'event_during_review_check'};
    return {...eligibility,generation:saved.reconcile_generation,checkedAt:state.checkedAt};
  }
  async function manualReview(saved,reason) {
    const rows=await store.query(`WITH stopped AS (
      UPDATE comm_orders SET review_manual_reason=$2,review_due_at=NULL
      WHERE reference=$1 AND reconcile_generation=$3 RETURNING reference), suppressed AS (
      UPDATE comm_outbox SET status='suppressed' WHERE order_ref IN(SELECT reference FROM stopped)
      AND kind='review' AND status='pending' RETURNING key)
      SELECT reference FROM stopped`,[saved.reference,reason,saved.reconcile_generation]);
    if(!rows.length)return {outcome:'event_during_reconciliation',complete:false};
    await alertOwner(store,saved.reference,reason);
    return {outcome:'manual_review_required',complete:true};
  }
  async function ownerContext({session,event,reference}) {
    if(!isProduction(env)||session.livemode!==true||event.livemode!==true)throw new Error('live_communication_environment_required');
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
  async function reconcile(reference,claimed) {
    let result;
    try{result=await snapshot(reference,claimed);}catch(error){
      if(error.terminalOrder)return manualReview(error.terminalOrder,'terminal_fulfillment_payload_requires_review');
      throw error;
    }
    const {saved,state,eligibility}=result;
    if(eligibility.reason==='fresh_provider_check_required')throw new Error('fresh_provider_check_required');
    const orderMail={reference,email:saved.customer?.email};
    const blocked=state.payment.paid!==true||state.payment.refunded!==false||state.payment.disputed!==false||
      ['failed','canceled','onhold'].includes(state.order.status)||
      state.shipments.some(s=>/return|fail|exception/i.test(`${s.delivery_status} ${s.shipment_status}`)||s.shipment_status==='canceled'||s.is_reshipment===true||s.reshipment===true);
    const delivery=state.shipments.map(s=>({id:s.id,delivery_status:s.delivery_status,delivered_at:s.delivered_at||null,estimated_delivery:s.estimated_delivery||null}));
    const updated=await store.query(`UPDATE comm_orders o SET delivery=$2,review_due_at=$3,last_checked_at=now(),
      review_manual_reason=NULL,suppress_reviews=suppress_reviews OR $4 WHERE reference=$1 AND reconcile_generation=$5
      RETURNING reference,(SELECT coalesce(array_agg(j.key),ARRAY[]::text[]) FROM comm_outbox j
        WHERE j.order_ref=o.reference AND j.kind IN ('processing','shipment')) AS queued_keys`,
      [reference,JSON.stringify(delivery),eligibility.dueAt||null,blocked,saved.reconcile_generation]);
    if(!updated.length)return {outcome:'event_during_reconciliation',complete:false};
    if(blocked) {await store.query("UPDATE comm_outbox SET status='suppressed' WHERE order_ref=$1 AND kind='review' AND status='pending'",[reference]);return {outcome:'review_suppressed',complete:state.order.status!=='onhold'};}
    const missingReviewDate=eligibility.reason==='no_trustworthy_delivery_date';
    if(state.order.status==='fulfilled'&&((!eligibility.dueAt&&!saved.suppress_reviews&&!missingReviewDate)||
      !Array.isArray(saved.items)||!saved.items.length||!mail.validEmail(orderMail.email))) {
      return manualReview(saved,eligibility.dueAt?'missing_review_recipient_or_items':eligibility.reason);
    }
    const messages=[];
    if(isProcessing(state.order)) {
      const key=`processing/${reference}`;
      messages.push({key,kind:'processing'});
    }
    for(const shipment of state.shipments) {
      if(!Number.isSafeInteger(shipment.id)||shipment.id<1||!Number.isFinite(Date.parse(shipment.shipped_at))||Date.parse(shipment.shipped_at)>Date.now())continue;
      if(!['shipped','delivered'].includes(shipment.shipment_status))continue;
      const key=`shipment/${reference}/${shipment.id}`;
      messages.push({key,kind:'shipment',shipment});
    }
    // Persisted keys form the cursor: replays cannot replace immutable payloads or lose a package.
    const existing=new Set(updated[0].queued_keys||[]);
    const pending=messages.filter(m=>!existing.has(m.key)),continuation=pending.length>4;
    const batch=pending.slice(0,4).map(m=>({key:m.key,kind:m.kind,
      payload:m.kind==='processing'?mail.processingEmail(orderMail):mail.shipmentEmail(orderMail,m.shipment)}));
    if(batch.length)await store.query(`INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash)
      SELECT x.key,x.kind,$1,x.payload,x.payload_hash FROM jsonb_to_recordset($2::jsonb)
      AS x(key text,kind text,payload jsonb,payload_hash text)
      WHERE EXISTS(SELECT 1 FROM comm_orders WHERE reference=$1 AND reconcile_generation=$3 AND unresolved=false)
      ON CONFLICT DO NOTHING`,
      [reference,JSON.stringify(batch.map(m=>({...m,payload_hash:hash(m.payload)}))),saved.reconcile_generation]);
    // Review timing must not discard independently valid shipment notifications.
    if(missingReviewDate&&!saved.suppress_reviews){
      if(continuation){
        await alertOwner(store,reference,eligibility.reason);
        return {outcome:'reconciled_partial',complete:false,continuation:true};
      }
      return manualReview(saved,eligibility.reason);
    }
    if(eligibility.dueAt&&!saved.suppress_reviews&&saved.items.length) {
      const token=crypto.randomBytes(32).toString('hex');
      const payload=mail.reviewEmail(orderMail,`https://www.localjagoff.com/review#${token}`);
      await store.query(`WITH queued AS(INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash,next_attempt_at)
        SELECT $1,'review',$2,$3,$4,$6::timestamptz FROM comm_orders
        WHERE reference=$2 AND reconcile_generation=$7 AND suppress_reviews=false AND review_manual_reason IS NULL
        ON CONFLICT DO NOTHING RETURNING order_ref)
        UPDATE comm_orders SET review_token_hash=$5,review_expires_at=$6::timestamptz+interval '90 days',review_invited_at=$6
        WHERE reference IN(SELECT order_ref FROM queued)`,[`review/${reference}`,reference,JSON.stringify(payload),hash(payload),hash(token),eligibility.dueAt,saved.reconcile_generation]);
    }
    // The fast outbox sends separately; no provider sends inside reconciliation.
    return {outcome:continuation?'reconciled_partial':'reconciled',continuation,
      complete:!continuation&&(Boolean(eligibility.dueAt)||(state.order.status==='fulfilled'&&saved.suppress_reviews))};
  }
  return {recordPaid,recordLinked,recordFailed,reconcile,beforeReview};
}
module.exports={createService};
