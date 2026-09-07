const {test}=require('node:test');
const assert=require('node:assert/strict');
const {paidSummary,ownerEmail}=require('../lib/owner-alerts.cjs');
const {createService}=require('../lib/communications-service.cjs');
const {STORE_ID}=require('../lib/commerce-policy.cjs');
const forbidden=()=>assert.fail('Unexpected provider or storage access');
function session() {
  return {id:'cs_live_fixture',livemode:true,payment_status:'paid',currency:'usd',amount_subtotal:6000,amount_total:6599,
    total_details:{amount_shipping:599},metadata:{store_id:STORE_ID,commerce_version:'2',items:JSON.stringify([[430697388,123,2,3000]])},
    customer_details:{name:'<Customer>',email:'fixture@example.test'},
    shipping_details:{name:'Recipient',address:{line1:'1 Synthetic Street',city:'Pittsburgh',state:'PA',postal_code:'15201',country:'US'}}};
}
test('owner alerts have a fixed owner recipient, complete paid facts and escaped customer content',()=>{
  const summary=paidSummary(session(),'LJfixture');
  const urgent=ownerEmail(summary),normal=ownerEmail(summary,{id:123,status:'draft'});
  for(const payload of [urgent,normal]) {
    assert.deepEqual(payload.to,['hello@localjagoff.com']);assert.equal(payload.reply_to,'hello@localjagoff.com');
    assert.match(payload.from,/orders@localjagoff.com/);assert.match(payload.text,/\$65\.99 USD/);
    assert.match(payload.text,/Qty 2/);assert.match(payload.text,/1 Synthetic Street/);assert.match(payload.text,/Stripe payment status: PAID/);
    assert.match(payload.html,/&lt;Customer&gt;/);assert.doesNotMatch(payload.html,/<Customer>/);
  }
  assert.match(urgent.subject,/HIGH PRIORITY/);assert.match(urgent.text,/4 business hours/);
  assert.match(normal.text,/Printful order 123: draft/);assert.doesNotMatch(normal.subject,/HIGH PRIORITY/);
});
test('owner summary refuses TEST, unpaid or wrong-store sessions and never invents missing facts',()=>{
  for(const change of [{livemode:false},{payment_status:'unpaid'},{currency:'eur'},{metadata:{store_id:'wrong'}}]) {
    assert.throws(()=>paidSummary({...session(),...change},'LJfixture'));
  }
  const incomplete=session();delete incomplete.shipping_details;incomplete.metadata.items='bad';
  const payload=ownerEmail(paidSummary(incomplete,'LJfixture'));
  assert.match(payload.text,/Item details unavailable/);assert.match(payload.text,/Shipping destination: Unavailable/);
});
test('paid owner warning is durable before receipt validation or Printful access',async()=>{
  const saved=session();delete saved.shipping_details;const operations=[];
  const service=createService({env:{VERCEL_ENV:'production'},stripe:forbidden,fetchImpl:forbidden,dispatch:forbidden,
    store:{order:async()=>null,hasJob:async()=>false,startOwner:async(data)=>{operations.push(data);},recordPaid:forbidden}});
  await assert.rejects(service.recordPaid({session:saved,event:{livemode:true},reference:'LJfixture'}),/shipping address/);
  assert.equal(operations.length,1);assert.match(operations[0].payload.subject,/HIGH PRIORITY/);
});
test('duplicate paid callback does not recreate receipts or owner jobs',async()=>{
  const saved=session();const summary=paidSummary(saved,'LJfixture');
  const service=createService({env:{VERCEL_ENV:'production'},stripe:forbidden,dispatch:forbidden,
    store:{order:async()=>({owner_summary:summary}),hasJob:async()=>true,startOwner:forbidden,recordPaid:forbidden}});
  await service.recordPaid({session:saved,event:{livemode:true},reference:'LJfixture'});
});
test('owner outcome dispatch uses stable order keys and remains durable during sender failure',async()=>{
  const saved=session(),summary=paidSummary(saved,'LJfixture'),calls=[];
  const service=createService({env:{VERCEL_ENV:'production'},stripe:forbidden,fetchImpl:forbidden,
    dispatch:async(s,{key})=>{calls.push(key);throw new Error('sender offline');},
    store:{order:async()=>({owner_summary:summary}),hasJob:async()=>true,
      link:async()=>calls.push('linked'),resolveOwner:async(ref,normal,recovery)=>{
        assert.match(normal.subject,/PAID ORDER/);assert.match(recovery.subject,/RECOVERED/);calls.push('resolved');
      },expediteOwner:async()=>calls.push('expedited')}});
  await service.recordLinked({reference:'LJfixture',order:{id:123,status:'draft'}});
  await service.recordFailed({reference:'LJfixture',session:saved,event:{livemode:true}});
  assert.deepEqual(calls,['linked','resolved','owner/LJfixture','owner-recovery/LJfixture','expedited','owner/LJfixture']);
});
test('Preview and TEST owner callbacks refuse before durable storage',async()=>{
  const saved=session();
  for(const [env,event] of [[{VERCEL_ENV:'preview'},{livemode:true}],[{VERCEL_ENV:'production'},{livemode:false}]]) {
    const service=createService({env,store:{order:forbidden},stripe:forbidden,dispatch:forbidden});
    for(const method of ['recordPaid','recordFailed'])await assert.rejects(service[method]({session:saved,event,reference:'LJfixture'}),/live_communication/);
  }
});
