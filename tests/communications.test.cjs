const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {Readable}=require('node:stream');
const {createContactHandler}=require('../lib/contact-handler.cjs');
const {challenge}=require('../lib/contact-security.cjs');
const {deliver}=require('../lib/communications-queue.cjs');
const {hash}=require('../lib/communications-store.cjs');
const {createReviewsHandler,reviewInput}=require('../lib/reviews-handler.cjs');
const {createService}=require('../lib/communications-service.cjs');
const {createPrintfulNotificationHandler}=require('../lib/printful-notification-handler.cjs');
const {STORE_ID}=require('../lib/commerce-policy.cjs');
const env={COMMUNICATIONS_ENABLED:'true',COMMUNICATIONS_SECRET:'fixture-only-'.repeat(4),DATABASE_URL:'fixture',VERCEL_ENV:'preview',VERCEL_URL:'preview.example.test'};
const quiet={info(){}};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const request=body=>({method:'POST',headers:{origin:'https://preview.example.test','content-type':'application/json'},socket:{remoteAddress:'192.0.2.1'},body});
const contact=()=>({requestId:crypto.randomUUID(),name:'Fixture',email:'fixture@example.com',topic:'other',message:'Synthetic verification message only.',website:'',challenge:challenge(env.COMMUNICATIONS_SECRET,Date.now()-3000)});
const forbidden=()=>assert.fail('Forbidden provider access');

test('contact queues to fixed support inbox, escapes HTML and never sends in Preview',async()=>{
  let recorded;
  const handler=createContactHandler({env,storeFactory:()=>({contact:async(...args)=>{recorded=args;return 'queued';}}),dispatch:forbidden});
  const body={...contact(),message:'<script>alert(1)</script> synthetic content'};
  const res=response();await handler(request(body),res);
  assert.equal(res.code,202);assert.equal(res.body.preview,true);
  assert.deepEqual(recorded[4].to,['hello@localjagoff.com']);assert.equal(recorded[4].reply_to,body.email);
  assert.match(recorded[4].html,/&lt;script&gt;/);assert.doesNotMatch(recorded[4].html,/<script>/);
  assert.match(recorded[2],/^[a-f0-9]{64}$/);assert.doesNotMatch(recorded[2],/192\.0\.2/);
});
test('contact rejects CSRF, header injection, arbitrary recipient, oversized and malformed input before storage',async()=>{
  const handler=createContactHandler({env,storeFactory:forbidden});
  const cases=[
    [r=>r.headers.origin='https://attacker.test',403],
    [r=>r.body.email='a@example.com\r\nBcc: bad@example.com',400],
    [r=>r.body.to='bad@example.com',400],
    [r=>r.body.message='x'.repeat(21000),413],
    [r=>r.headers['content-type']='application/jsonjunk',415],
    [r=>r.body.challenge=challenge(env.COMMUNICATIONS_SECRET),400],
  ];
  for(const [mutate,status] of cases){const req=request(contact());mutate(req);const res=response();await handler(req,res);assert.equal(res.code,status);}
});
test('contact honeypot is acknowledged without storage; durable limits and conflict have useful status codes',async()=>{
  let res=response();await createContactHandler({env,storeFactory:forbidden})(request({...contact(),website:'spam'}),res);assert.equal(res.code,202);
  for(const [message,code] of [['contact_rate_limited',429],['contact_request_conflict',409],['database_unavailable',503]]){
    res=response();await createContactHandler({env,storeFactory:()=>({contact:async()=>{throw new Error(message);}})})(request(contact()),res);assert.equal(res.code,code);assert.doesNotMatch(JSON.stringify(res.body),/database_unavailable/);
  }
});
test('durably queued contact survives an immediate sender failure',async()=>{
  const res=response();await createContactHandler({env:{...env,VERCEL_ENV:'production',SITE_URL:'https://preview.example.test'},storeFactory:()=>({contact:async()=> 'queued'}),dispatch:async()=>{throw new Error('offline');}})(request(contact()),res);
  assert.equal(res.code,202);
});
test('client cannot spoof Vercel IP using ordinary forwarded-for',async()=>{
  const req=request(contact());req.headers['x-forwarded-for']='192.0.2.2';
  const res=response();await createContactHandler({env:{...env,VERCEL:'1'},storeFactory:forbidden})(req,res);assert.equal(res.code,503);
});
function queueFixture(changes={}){
  const payload={subject:'Fixture',nested:{z:1,a:2}};
  const job={key:'receipt/LJfixture',kind:'receipt',payload,payload_hash:hash(payload),attempts:1,claim_token:'fixture',...changes};
  const finishes=[];let marked=0;
  return {job,finishes,get marked(){return marked;},store:{claim:async()=>job,finish:async(...args)=>finishes.push(args),enqueue:async()=>{},prepareAttempt:async()=>{marked++;return 'ready';}},options:{env:{VERCEL_ENV:'production',CUSTOMER_EMAIL_ENABLED:'true'},logger:quiet,send:async()=>({id:'00000000-0000-4000-8000-000000000001'})}};
}
test('outbox integrity hash survives JSONB key ordering and sends with one stable identity',async()=>{
  const f=queueFixture();f.job.payload={nested:{a:2,z:1},subject:'Fixture'};let key;
  const result=await deliver(f.store,{...f.options,send:async(p,k)=>{key=k;return {id:'fixture'};}});
  assert.equal(result.outcome,'sent');assert.equal(key,f.job.key);assert.equal(f.marked,1);assert.equal(f.finishes[0][1],'sent');
});
test('Preview queue does not even claim a job',async()=>{
  assert.equal((await deliver({claim:forbidden},{env,send:forbidden})).outcome,'sending_disabled');
});
test('corrupt payload and expired provider idempotency window hold without sending',async()=>{
  for(const change of [{payload_hash:'wrong'},{first_attempt_at:new Date(Date.now()-24*3600000).toISOString()}]){
    const f=queueFixture(change);await deliver(f.store,{...f.options,send:forbidden});assert.equal(f.finishes[0][1],'held');assert.equal(f.marked,0);
  }
});
test('retry, terminal rejection and quota exhaustion remain durable without false sent state',async()=>{
  for(const [status,outcome,state] of [[500,'retry_scheduled','pending'],[429,'retry_scheduled','pending'],[422,'held','held']]){
    const f=queueFixture();const result=await deliver(f.store,{...f.options,send:async()=>{const error=new Error('failure');error.status=status;throw error;}});
    assert.equal(result.outcome,outcome);assert.equal(f.finishes[0][1],state);
  }
  const f=queueFixture();f.store.prepareAttempt=async()=> 'daily_mail_budget';
  assert.equal((await deliver(f.store,{...f.options,send:forbidden})).outcome,'daily_mail_budget');assert.equal(f.marked,0);
});
test('provider acceptance followed by database failure retains claim instead of retrying with a new key',async()=>{
  const f=queueFixture();let sends=0;f.store.finish=async()=>{throw new Error('db offline');};
  await assert.rejects(deliver(f.store,{...f.options,send:async()=>{sends++;return {id:'fixture'};}}));assert.equal(sends,1);
});
test('review mail rechecks live eligibility and suppresses refund or defers waiting/provider outage',async()=>{
  for(const [reason,status] of [['payment_not_clear','suppressed'],['waiting','pending']]){
    const f=queueFixture({kind:'review',order_ref:'fixture'});await deliver(f.store,{...f.options,send:forbidden,beforeReview:async()=>({eligible:false,reason})});assert.equal(f.finishes[0][1],status);
  }
  const f=queueFixture({kind:'review'});await deliver(f.store,{...f.options,send:forbidden,beforeReview:async()=>{throw new Error('offline');}});assert.equal(f.finishes[0][2].error,'review_check_unavailable');
});
test('review input binds numeric purchased products and rejects rating/name injection',()=>{
  const valid={productId:430697388,rating:1,displayName:'Fixture',text:'Honest negative review.'};
  assert.equal(reviewInput(valid).rating,1);
  for(const update of [{rating:0},{rating:6},{productId:'430697388'},{displayName:'<script>'},{displayName:'a\r\nb'},{text:'x'.repeat(2001)}])assert.throws(()=>reviewInput({...valid,...update}));
});
test('review link is private, purchase-bound, revoked on suppression, and always pending moderation',async()=>{
  const queries=[];let revoked=false;
  const store={query:async(sql,args)=>{queries.push(sql);
    if(sql.includes('comm_take_rate'))return [{allowed:true}];
    if(sql.includes('FROM comm_orders')){assert.match(sql,/suppress_reviews=false/);return revoked?[]:[{reference:'private-order',items:[{productId:430697388,name:'Fixture gear'}]}];}
    if(sql.startsWith('INSERT'))return [{id:'fixture'}];return [];
  }};
  const handler=createReviewsHandler({env,storeFactory:()=>store});
  let res=response();await handler(request({action:'open',token:'a'.repeat(64)}),res);assert.equal(res.code,200);assert.doesNotMatch(JSON.stringify(res.body),/private-order|email|token/);
  res=response();await handler(request({action:'submit',token:'a'.repeat(64),productId:1,rating:4,displayName:'Fixture',text:''}),res);assert.equal(res.code,403);
  res=response();await handler(request({action:'submit',token:'a'.repeat(64),productId:430697388,rating:1,displayName:'Fixture',text:''}),res);assert.equal(res.code,201);assert.equal(res.body.status,'pending_moderation');
  revoked=true;res=response();await handler(request({action:'open',token:'a'.repeat(64)}),res);assert.equal(res.code,410);
});
test('public reviews query approved rows only, rate limits apply, and CSRF cannot consume an invite',async()=>{
  let sql;const store={query:async q=>{if(q.includes('comm_take_rate'))return [{allowed:true}];sql=q;return [];}};
  let res=response();await createReviewsHandler({env,storeFactory:()=>store})({...request(),method:'GET',query:{productId:'430697388'}},res);assert.equal(res.code,200);assert.match(sql,/status='approved'/);assert.doesNotMatch(sql,/email|order_ref/);
  res=response();await createReviewsHandler({env,storeFactory:()=>({query:async()=>[{allowed:false}]})})(request({}),res);assert.equal(res.code,429);
  const req=request({});req.headers.origin='https://attacker.test';res=response();await createReviewsHandler({env,storeFactory:forbidden})(req,res);assert.equal(res.code,403);
});
test('raw signed Printful Preview fixture succeeds without database, email or fulfillment; tampering rejects',async()=>{
  const secret='a1'.repeat(32),publicKey='fixture-public';
  const body=JSON.stringify({type:'shipment_sent',store_id:Number(STORE_ID),occurred_at:new Date().toISOString(),data:{order:{id:123,store_id:Number(STORE_ID),external_id:'LJ'+'a'.repeat(24)},shipment:{id:456}}});
  const signature=crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(body).digest('hex');
  const handler=createPrintfulNotificationHandler({env:{...env,PRINTFUL_WEBHOOK_SECRET:secret,PRINTFUL_WEBHOOK_PUBLIC_KEY:publicKey},storeFactory:forbidden,serviceFactory:forbidden});
  for(const [raw,status] of [[body,200],[body+' ',400]]){
    const req=Readable.from([Buffer.from(raw)]);req.method='POST';req.headers={'x-pf-webhook-public-key':publicKey,'x-pf-webhook-signature':signature};const res=response();await handler(req,res);assert.equal(res.code,status);
    if(status===200)assert.equal(res.body.outcome,'preview_no_provider_or_email');
  }
});
function serviceFixture(){
  const reference='LJ'+'b'.repeat(24),queued=new Map(),dispatched=[],queries=[],gets=[];
  const saved={reference,session_id:'cs_live_fixture',printful_id:123,customer:{email:'fixture@example.com'},items:[{productId:430697388,name:'Fixture'}],unresolved:false,suppress_reviews:false,reconcile_generation:0};
  const session={id:saved.session_id,livemode:true,metadata:{store_id:STORE_ID},payment_status:'paid',payment_intent:{latest_charge:{refunded:false,amount_refunded:0,disputed:false}}};
  const order={id:123,store_id:Number(STORE_ID),external_id:reference,status:'fulfilled'};
  const shipment=id=>({id,shipment_status:'shipped',delivery_status:'delivered',shipped_at:new Date(Date.now()-20*86400000).toISOString(),delivered_at:new Date(Date.now()-10*86400000).toISOString(),shipment_items:[{order_item_id:1,quantity:1,order_item_name:'Fixture'}]});
  const shipments=[shipment(1),shipment(2)];
  const store={order:async()=>saved,enqueue:async(k,kind,ref,payload)=>{if(!queued.has(k))queued.set(k,{kind,payload});},query:async(sql,args)=>{queries.push({sql,args});if(sql.includes('jsonb_to_recordset'))for(const m of JSON.parse(args[1]))if(!queued.has(m.key))queued.set(m.key,m);return sql.startsWith('UPDATE comm_orders')?[{reference}]:[];}};
  const service=createService({env:{VERCEL_ENV:'production',STRIPE_SECRET_KEY:'sk_live_fixture',PRINTFUL_API_KEY:'fixture'},store,stripe:{checkout:{sessions:{retrieve:async()=>session}}},dispatch:async(s,{key})=>dispatched.push(key),fetchImpl:async(url,options)=>{
    assert.equal(options.method,'GET');gets.push(url);return {ok:true,json:async()=>({data:url.endsWith('/order-items')?[{id:1,quantity:2}]:url.endsWith('/shipments')?shipments:order,_links:{}})};
  }});
  return {service,reference,queued,dispatched,queries,gets,session,order,shipments,saved};
}
test('split shipment reconciliation is GET-only and bulk-queues packages with stable keys without inline sends',async()=>{
  const f=serviceFixture();await f.service.reconcile(f.reference);await f.service.reconcile(f.reference);
  assert.equal(f.queued.size,2);assert.equal(f.dispatched.length,0);
  for(const {payload} of f.queued.values())assert.match(payload.text,/package only/);
  assert.equal(f.gets.length,6);assert.ok(f.queries.some(q=>q.sql.includes('WITH queued')));
});
test('processing requires actual inprocess; refund/return suppresses reviews before new notifications',async()=>{
  const f=serviceFixture();f.order.status='inprocess';f.shipments.length=0;await f.service.reconcile(f.reference);assert.equal(f.queued.size,1);assert.equal([...f.queued.values()][0].kind,'processing');
  const g=serviceFixture();g.session.payment_intent.latest_charge.refunded=true;await g.service.reconcile(g.reference);assert.equal(g.queued.size,0);assert.ok(g.queries.some(q=>q.sql.includes("status='suppressed'")));
});
test('notification service refuses Preview before provider reads',async()=>{
  const service=createService({env:{VERCEL_ENV:'preview'},store:{order:forbidden},stripe:forbidden,fetchImpl:forbidden});await assert.rejects(service.reconcile('fixture'),/live_communication/);
});

test('paid receipt uses authoritative totals; historical uncertain receipts are held and known sent receipts skipped',async()=>{
  const session={id:'cs_live_fixture',livemode:true,payment_status:'paid',currency:'usd',amount_subtotal:3000,amount_total:3599,total_details:{amount_shipping:599},metadata:{store_id:STORE_ID,commerce_version:'2',items:JSON.stringify([[430697388,123,1,3000]])},shipping_details:{name:'Fixture',address:{line1:'1 Synthetic Street',city:'Pittsburgh',state:'PA',country:'US',postal_code:'15201'}},customer_details:{email:'fixture@example.com'}};
  const records=[];const service=createService({env:{VERCEL_ENV:'production'},store:{order:async()=>null,hasJob:async()=>false,startOwner:async()=>{},recordPaid:async data=>records.push(data)},stripe:{checkout:{sessions:{listLineItems:async()=>({has_more:false,data:[{description:'Fixture tee',quantity:1,amount_subtotal:3000,amount_total:3000}]})}}},dispatch:async()=>{}});
  await service.recordPaid({session,event:{livemode:true},reference:'LJfixture'});assert.equal(records[0].receiptUncertain,false);assert.match(records[0].payload.text,/Total paid: \$35\.99/);
  session.metadata.printful_order_id='123';await service.recordPaid({session,event:{livemode:true},reference:'LJfixture'});assert.equal(records[1].receiptUncertain,true);
  session.metadata.order_email_sent='true';await service.recordPaid({session,event:{livemode:true},reference:'LJfixture'});assert.equal(records.length,2);
});

test('moderation and scheduler independently reject unauthenticated requests before storage/provider access',async()=>{
  const moderation=(await import('../pages/api/reviews/moderation.js')).default;
  const cron=(await import('../pages/api/communications/run.js')).default;
  const old={...process.env};
  try{
    delete process.env.CRON_SECRET;delete process.env.PROMO_ADMIN_USERNAME;delete process.env.PROMO_ADMIN_PASSWORD;
    let res=response();await moderation(request({}),res);assert.equal(res.code,401);
    res=response();await cron({...request(),method:'GET'},res);assert.equal(res.code,401);
    process.env.PROMO_ADMIN_USERNAME='fixture';process.env.PROMO_ADMIN_PASSWORD='fixture-password';process.env.SITE_URL='https://preview.example.test';process.env.VERCEL_ENV='production';
    const req=request({});req.headers.authorization='Basic '+Buffer.from('fixture:fixture-password').toString('base64');req.headers.origin='https://attacker.test';
    res=response();await moderation(req,res);assert.equal(res.code,403);
    process.env.CRON_SECRET='fixture-cron';process.env.VERCEL_ENV='preview';
    res=response();await cron({method:'GET',headers:{authorization:'Bearer fixture-cron'}},res);assert.equal(res.body.outcome,'sending_disabled');
    res=response();await cron({method:'GET',headers:{authorization:'fixture-cron'}},res);assert.equal(res.code,401);
  }finally{for(const key of ['CRON_SECRET','PROMO_ADMIN_USERNAME','PROMO_ADMIN_PASSWORD','SITE_URL','VERCEL_ENV']){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
