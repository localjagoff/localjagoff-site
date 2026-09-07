const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {Readable}=require('node:stream');
const {PGlite}=require('@electric-sql/pglite');
const {createStore,hash}=require('../lib/communications-store.cjs');
const {createService}=require('../lib/communications-service.cjs');
const {deliver}=require('../lib/communications-queue.cjs');
const {runCommunications}=require('../lib/communications-runner.cjs');
const {createPrintfulNotificationHandler,catalogPreviewIdentity}=require('../lib/printful-notification-handler.cjs');
const {printfulEventIdentity}=require('../lib/customer-lifecycle.cjs');
const {STORE_ID}=require('../lib/commerce-policy.cjs');
const schema=require('../lib/communications-schema.cjs');
const DAY=86400000,reference='LJ'+'c'.repeat(24);
const env={VERCEL_ENV:'production',COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true',
  DATABASE_URL:'fixture',STRIPE_SECRET_KEY:'sk_live_fixture',PRINTFUL_API_KEY:'fixture',
  PRINTFUL_WEBHOOK_SECRET:'b2'.repeat(32),PRINTFUL_WEBHOOK_PUBLIC_KEY:'fixture-public'};
const forbidden=()=>assert.fail('No real network or provider sends permitted');
const logger={info(){}};
let db,store,queries;
before(async()=>{
  db=new PGlite();for(const statement of schema)await db.exec(statement);
  store=createStore(env,{sqlClient:{query:async(q,p)=>{queries.push(q);return (await db.query(q,p)).rows;}}});
});
after(async()=>db.close());
async function fixture(){
  await db.exec('DELETE FROM comm_outbox; DELETE FROM comm_orders; DELETE FROM comm_events; DELETE FROM comm_preview_events; DELETE FROM comm_rate');
  queries=[];
  await db.query(`INSERT INTO comm_orders(reference,session_id,customer,items,printful_id,unresolved,reconcile_reason)
    VALUES($1,'cs_fixture',$2,$3,123,false,'event')`,[reference,JSON.stringify({email:'fixture@example.com'}),JSON.stringify([{productId:430697388,name:'Fixture'}])]);
  const f={gets:[],stripeReads:0,order:{id:123,store_id:Number(STORE_ID),external_id:reference,status:'fulfilled'},
    items:[{id:1,quantity:1}],shipments:[{id:456,shipment_status:'shipped',delivery_status:'delivered',
      shipped_at:new Date(Date.now()-4*DAY).toISOString(),delivered_at:new Date(Date.now()-DAY).toISOString(),
      shipment_items:[{order_item_id:1,quantity:1}]}],
    session:{id:'cs_fixture',livemode:true,metadata:{store_id:STORE_ID},payment_status:'paid',
      payment_intent:{latest_charge:{refunded:false,amount_refunded:0,disputed:false}}}};
  f.service=createService({env,store,dispatch:forbidden,
    stripe:{checkout:{sessions:{retrieve:async()=>{f.stripeReads++;return f.session;}}}},
    fetchImpl:async(url,options)=>{
      assert.equal(options.method,'GET');assert.equal(new URL(url).origin,'https://api.printful.com');f.gets.push(url);
      const path=new URL(url).pathname;
      if(f.onRead)await f.onRead(path);
      if(f.page)return {ok:true,json:async()=>f.page(new URL(url))};
      return {ok:true,json:async()=>({data:path.endsWith('/order-items')?f.items:path.endsWith('/shipments')?f.shipments:f.order,_links:{}})};
    }});
  f.run=()=>runCommunications({env,mode:'fallback',storeFactory:()=>store,serviceFactory:()=>f.service,dispatch:forbidden});
  return f;
}
async function row(key){return (await db.query('SELECT * FROM comm_outbox WHERE key=$1',[key])).rows[0];}
async function dueReview(f){
  f.shipments[0].shipped_at=new Date(Date.now()-20*DAY).toISOString();
  f.shipments[0].delivered_at=new Date(Date.now()-10*DAY).toISOString();
  await f.run();
}
function lifecycle(type='order_updated'){
  return {type,store_id:Number(STORE_ID),occurred_at:new Date().toISOString(),retries:0,
    data:{order:{id:123,store_id:Number(STORE_ID),external_id:reference},shipment:{id:456}}};
}
async function notify(event,{preview=false,tamper=false,storeFactory=()=>store}={}){
  const body=JSON.stringify(event),raw=body+(tamper?' ':'');
  const req=Readable.from([Buffer.from(raw)]);req.method='POST';req.headers={
    'x-pf-webhook-public-key':env.PRINTFUL_WEBHOOK_PUBLIC_KEY,
    'x-pf-webhook-signature':crypto.createHmac('sha256',Buffer.from(env.PRINTFUL_WEBHOOK_SECRET,'hex')).update(body).digest('hex')};
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await createPrintfulNotificationHandler({env:{...env,VERCEL_ENV:preview?'preview':'production'},storeFactory,serviceFactory:forbidden})(req,res);
  return res;
}
function catalog(){return {type:'catalog_stock_updated',occurred_at:new Date(Date.now()-3000).toISOString(),
  retries:0,store_id:Number(STORE_ID),data:[{catalog_product_id:71,catalog_variant_id:4011,techniques:['dtg'],availability:'in stock'}]};}

test('real SQL persists seven-day delivery review, excludes terminal polling, and preserves token on replay',async()=>{
  const f=await fixture();await f.run();
  const saved=await store.order(reference),job=await row(`review/${reference}`);
  const due=Date.parse(f.shipments[0].delivered_at)+7*DAY;
  assert.equal(saved.review_due_at.getTime(),due);assert.equal(job.next_attempt_at.getTime(),due);
  assert.equal(saved.lifecycle_complete,true);assert.equal(saved.next_due_at,null);
  assert.equal(await store.claimReconciliation('fallback'),undefined);
  assert.equal(await store.claim(`review/${reference}`),undefined);
  await f.service.reconcile(reference);
  assert.equal((await store.order(reference)).review_token_hash,saved.review_token_hash);
  assert.equal((await row(job.key)).payload_hash,job.payload_hash);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM comm_outbox WHERE kind='review'")).rows[0].n,1);
});

test('real SQL persists conservative final-package ETA plus seven days',async()=>{
  const f=await fixture();f.shipments[0].delivery_status='in_transit';delete f.shipments[0].delivered_at;
  const date=new Date(Date.now()+2*DAY).toISOString().slice(0,10);
  f.shipments[0].estimated_delivery={to_date:date};await f.run();
  const due=Date.parse(date+'T23:59:59.999Z')+12*3600000+7*DAY;
  assert.equal((await store.order(reference)).review_due_at.getTime(),due);
  assert.equal((await row(`review/${reference}`)).next_attempt_at.getTime(),due);
});

test('removed hold resumes processing and shipment mail while keeping reviews suppressed',async()=>{
  const f=await fixture(),shipments=f.shipments;
  f.order.status='onhold';f.shipments=[];
  await f.run();
  assert.equal((await store.order(reference)).suppress_reviews,true);
  assert.equal((await store.order(reference)).lifecycle_complete,false);
  assert.equal(await store.claim(),undefined);

  f.order.status='inprocess';await notify(lifecycle('order_remove_hold'));
  assert.equal((await f.run()).outcome,'reconciled');
  assert.equal((await row(`processing/${reference}`)).status,'pending');
  assert.equal((await store.order(reference)).suppress_reviews,true);
  assert.equal((await store.order(reference)).lifecycle_complete,false);

  f.order.status='fulfilled';f.shipments=shipments;await notify(lifecycle('shipment_sent'));
  await f.run();await f.service.reconcile(reference);
  assert.equal((await row(`shipment/${reference}/456`)).status,'pending');
  assert.equal(await row(`review/${reference}`),undefined);
  assert.equal((await store.order(reference)).suppress_reviews,true);
  assert.equal((await store.order(reference)).lifecycle_complete,true);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM comm_outbox')).rows[0].n,2);
});

test('missing review ETA still queues valid shipment mail once and alerts only for review timing',async()=>{
  const f=await fixture();f.shipments[0].delivery_status='in_transit';delete f.shipments[0].delivered_at;
  f.shipments[0].tracking_url='https://example.com/tracking';
  assert.equal((await f.run()).outcome,'manual_review_required');
  const shipment=await row(`shipment/${reference}/456`);
  assert.equal(shipment.status,'pending');
  assert.deepEqual(shipment.payload.to,['fixture@example.com']);
  assert.match(shipment.payload.text,/https:\/\/example.com\/tracking/);
  assert.equal(await row(`review/${reference}`),undefined);
  const saved=await store.order(reference);
  assert.equal(saved.review_manual_reason,'no_trustworthy_delivery_date');
  assert.equal(saved.lifecycle_complete,true);
  assert.equal((await row(`lifecycle-alert/${reference}`)).kind,'owner_alert');
  await f.service.reconcile(reference);
  assert.equal((await row(shipment.key)).payload_hash,shipment.payload_hash);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM comm_outbox')).rows[0].n,2);
});

test('transactional insert still rejects a cancellation arriving after the trusted snapshot',async()=>{
  const f=await fixture();f.order.status='inprocess';
  const query=store.query;let injected=false;
  store.query=async(q,p)=>{
    if(q.includes('jsonb_to_recordset')&&!injected){injected=true;await notify(lifecycle('order_canceled'));}
    return query(q,p);
  };
  try{await f.run();}finally{store.query=query;}
  assert.equal(injected,true);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM comm_outbox')).rows[0].n,0);
  assert.equal((await store.order(reference)).suppress_reviews,true);
  assert.equal((await store.order(reference)).lifecycle_complete,false);
});

test('fulfilled missing shipment payload, purchased items or email stops polling with one durable priority alert',async()=>{
  for(const change of [
    async f=>{f.shipments=[];},
    async()=>db.query("UPDATE comm_orders SET items='[]'"),
    async()=>db.query("UPDATE comm_orders SET customer='{}'"),
    async f=>{f.page=url=>url.pathname.endsWith('/shipments')?{data:null}:{data:url.pathname.endsWith('/order-items')?f.items:f.order,_links:{}};},
  ]){
    const f=await fixture();await change(f);assert.equal((await f.run()).outcome,'manual_review_required');
    const saved=await store.order(reference);assert.ok(saved.review_manual_reason);assert.equal(saved.next_due_at,null);
    assert.equal(await store.claimReconciliation(),undefined);assert.equal(await row(`review/${reference}`),undefined);
    const alert=await store.claim();assert.equal(alert.kind,'owner_alert');assert.match(alert.payload.subject,/HIGH PRIORITY/);
    await store.finish(alert,'sent',{providerId:'fixture-alert'});await f.service.reconcile(reference);
    assert.equal((await row(alert.key)).status,'sent');assert.equal(await store.claim(),undefined);
  }
});

test('pagination stops after two pages per collection and bulk shipment enqueue is one SQL statement',async()=>{
  const f=await fixture();f.order.status='inprocess';
  f.page=url=>{
    const collection=url.pathname.endsWith('/order-items')?'items':url.pathname.endsWith('/shipments')?'shipments':null;
    if(!collection)return {data:f.order};
    const second=url.searchParams.has('offset');
    return {data:collection==='items'?[{id:second?2:1,quantity:1}]:[{...f.shipments[0],id:second?457:456}],
      paging:{total:2},_links:second?{}:{next:{href:url.pathname+'?offset=1'}}};
  };
  await f.run();assert.equal(f.gets.length,5);assert.equal(f.stripeReads,1);
  assert.equal(queries.filter(q=>q.includes('jsonb_to_recordset')).length,1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM comm_outbox WHERE kind='shipment'")).rows[0].n,2);
});

test('third-page requirement fails closed with durable alert and no partial shipment or review queue',async()=>{
  const f=await fixture();f.order.status='inprocess';
  f.page=url=>url.pathname.endsWith('/order-items')?{data:[{id:Number(url.searchParams.get('offset')||0)+1,quantity:1}],
    paging:{total:3},_links:{next:{href:url.pathname+'?offset='+((Number(url.searchParams.get('offset'))||0)+1)}}}:{data:f.order};
  assert.equal((await f.run()).outcome,'reconciliation_retry_scheduled');assert.equal(f.gets.length,3);
  assert.equal((await store.claim()).kind,'owner_alert');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM comm_outbox WHERE kind<>'owner_alert'")).rows[0].n,0);
});

test('pagination rejects foreign origins, repeated pages, changed paths and inconsistent totals before sends',async()=>{
  for(const next of ['https://attacker.test/v2/orders/123/order-items','/v2/orders/123/order-items','/v2/orders/999/order-items']){
    const f=await fixture();f.order.status='inprocess';
    f.page=url=>url.pathname.endsWith('/order-items')?{data:f.items,_links:{next:{href:next}}}:{data:f.order};
    assert.equal((await f.run()).outcome,'reconciliation_retry_scheduled');assert.equal(f.gets.length,2);
  }
  const f=await fixture();f.order.status='inprocess';f.page=url=>url.pathname.endsWith('/order-items')?
    {data:f.items,paging:{total:url.search?3:2},_links:url.search?{}:{next:{href:url.pathname+'?offset=1'}}}:{data:f.order};
  assert.equal((await f.run()).outcome,'reconciliation_retry_scheduled');assert.equal(f.gets.length,3);
});

test('signed event during real SQL lease survives stale snapshot; replay cannot wake completed order',async()=>{
  const f=await fixture(),event=lifecycle();let injected=false;
  f.onRead=async()=>{if(!injected){injected=true;assert.equal((await notify(event)).code,200);}};
  assert.equal((await f.run()).outcome,'event_during_reconciliation');assert.equal(await row(`review/${reference}`),undefined);
  assert.equal((await store.order(reference)).lifecycle_complete,false);
  delete f.onRead;await f.run();assert.equal((await store.order(reference)).lifecycle_complete,true);
  assert.equal((await notify({...event,retries:4})).code,200);assert.equal(await store.claimReconciliation(),undefined);
  assert.equal(Number((await store.order(reference)).reconcile_generation),1);
});

test('review final SQL fence prevents a refund event arriving during quota check from sending',async()=>{
  const f=await fixture();await dueReview(f);
  const original=store.mailQuota;store.mailQuota=async()=>{assert.equal((await notify(lifecycle('order_refunded'))).code,200);return true;};
  try{
    const result=await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger});
    assert.equal(result.outcome,'review_changed_before_send');assert.equal((await row(`review/${reference}`)).first_attempt_at,null);
  }finally{store.mailQuota=original;}
  const result=await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger});
  assert.equal(result.outcome,'no_due_job');
  await db.query("UPDATE comm_outbox SET next_attempt_at=now()-interval '1 second' WHERE kind='review'");
  assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'suppressed');
});

test('review event arriving during provider reads defers without first attempt',async()=>{
  const f=await fixture();await dueReview(f);let injected=false;
  f.onRead=async()=>{if(!injected){injected=true;await notify(lifecycle());}};
  assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'pending');
  assert.equal((await row(`review/${reference}`)).first_attempt_at,null);
});

test('new event racing a terminal manual-review write preserves the queued review for fresh reconciliation',async()=>{
  const f=await fixture();await dueReview(f);f.shipments=[];
  const query=store.query;let injected=false;
  store.query=async(q,p)=>{
    if(q.startsWith('WITH stopped')&&!injected){injected=true;await notify(lifecycle());}
    return query(q,p);
  };
  try{
    assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'pending');
    assert.equal((await store.order(reference)).review_manual_reason,null);
    assert.equal(await row(`lifecycle-alert/${reference}`),undefined);
  }finally{store.query=query;}
});

test('review freshness fence rejects stale checks and expired leases in actual SQL',async()=>{
  const f=await fixture();await dueReview(f);const job=await store.claim(`review/${reference}`);
  assert.equal(await store.markAttempt(job,{generation:0,checkedAt:Date.now()-61000}),null);
  await db.query("UPDATE comm_outbox SET lease_until=now()-interval '1 second' WHERE key=$1",[job.key]);
  assert.equal(await store.markAttempt(job,{generation:0,checkedAt:Date.now()}),null);
  assert.equal((await row(job.key)).first_attempt_at,null);
});

test('review due time moves to fresh delivery plus seven days without changing immutable payload',async()=>{
  const f=await fixture();await dueReview(f);const before=await row(`review/${reference}`);
  f.shipments[0].delivered_at=new Date(Date.now()-DAY).toISOString();
  assert.equal((await deliver(store,{key:before.key,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'pending');
  const after=await row(before.key),due=Date.parse(f.shipments[0].delivered_at)+7*DAY;
  assert.equal((await store.order(reference)).review_due_at.getTime(),due);
  assert.ok(Math.abs(after.next_attempt_at.getTime()-due)<1100);assert.equal(after.payload_hash,before.payload_hash);
});

test('refund, cancel, return and both replacement flags prevent review sending',async()=>{
  for(const change of [f=>{f.session.payment_intent.latest_charge.refunded=true;},f=>{f.order.status='canceled';},
    f=>{f.shipments[0].delivery_status='returned';},f=>{f.shipments[0].is_reshipment=true;},f=>{f.shipments[0].reshipment=true;}]){
    const f=await fixture();await dueReview(f);change(f);
    assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'suppressed');
    assert.equal((await row(`review/${reference}`)).first_attempt_at,null);
  }
});

test('future provider parse failure durably alerts owner before review is deferred',async()=>{
  const f=await fixture();await dueReview(f);f.page=()=>({future_provider_shape:[]});
  assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send:forbidden,logger})).outcome,'review_check_unavailable');
  assert.equal((await row(`lifecycle-alert/${reference}`)).kind,'owner_alert');
  assert.equal((await store.claim()).kind,'owner_alert');
});

test('accepted review whose persistence failed replays the same provider key and never creates a second invitation',async()=>{
  const f=await fixture();await dueReview(f);const accepted=new Set(),keys=[];
  const send=async(payload,key)=>{keys.push(key);accepted.add(key);return {id:'fixture-provider-id'};};
  const original=store.finish;let failed=false;
  store.finish=async(job,status,options)=>{if(status==='sent'&&!failed){failed=true;throw new Error('fixture persistence outage');}return original(job,status,options);};
  try{await assert.rejects(deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send,logger}),/persistence outage/);}
  finally{store.finish=original;}
  await db.query("UPDATE comm_outbox SET lease_until=now()-interval '1 second' WHERE kind='review'");
  assert.equal((await deliver(store,{key:`review/${reference}`,env,beforeReview:f.service.beforeReview,send,logger})).outcome,'sent');
  assert.equal(keys.length,2);assert.equal(accepted.size,1);await f.service.reconcile(reference);
  assert.equal(await store.claim(`review/${reference}`),undefined);
});

test('signed real-shaped catalog Preview persists identity, age and store once with no order/outbox mutation',async()=>{
  await fixture();const before=await store.order(reference),event=catalog();
  assert.throws(()=>printfulEventIdentity(event,STORE_ID),/invalid_printful_event/);
  assert.equal((await notify(event,{preview:true,storeFactory:config=>{
    assert.equal(config.COMMUNICATIONS_ENABLED,'true');return store;
  }})).body.outcome,'preview_catalog_transport_persisted');
  assert.equal((await notify({...event,retries:3},{preview:true})).code,200);
  const rows=(await db.query('SELECT * FROM comm_preview_events')).rows;assert.equal(rows.length,1);
  assert.equal(rows[0].identity,catalogPreviewIdentity(event).identity);assert.equal(Number(rows[0].store_id),Number(STORE_ID));
  assert.ok(rows[0].age_seconds>=3);assert.equal(rows[0].occurred_at.getTime(),Date.parse(event.occurred_at));
  assert.deepEqual(await store.order(reference),before);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM comm_outbox')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM comm_events')).rows[0].n,0);
});

test('catalog Preview rejects tampering, wrong store, age, malformed data and production before storage',async()=>{
  await fixture();
  for(const event of [{...catalog(),store_id:0},{...catalog(),occurred_at:new Date(Date.now()-8*DAY).toISOString()},
    {...catalog(),occurred_at:new Date(Date.now()+6*60000).toISOString()},{...catalog(),data:{order:{id:123}}},
    {...catalog(),data:[{catalog_product_id:71}]},{...catalog(),retries:-1}]){
    assert.equal((await notify(event,{preview:true,storeFactory:forbidden})).code,400);
  }
  assert.equal((await notify(catalog(),{preview:true,tamper:true,storeFactory:forbidden})).code,400);
  assert.equal((await notify(catalog(),{storeFactory:forbidden})).code,400);
  assert.equal((await notify(catalog(),{preview:true,storeFactory:()=>({query:async()=>{throw new Error('fixture offline');}})})).code,503);
});
