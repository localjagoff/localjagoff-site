const Stripe=require('stripe');
const {createWebhookHandler}=require('../api/webhook.js');
const {createApiAdapter}=require('./cloudflare-api-adapter.cjs');
const {createService}=require('./communications-service.cjs');
const {deliver}=require('./communications-queue.cjs');
const {externalId}=require('./fulfillment.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const budget=require('./invocation-budget.cjs');
const EMAIL='paid-capacity@example.invalid';
const SECRET='whsec_fixed_synthetic_capacity_not_a_credential';
const ENV=Object.freeze({VERCEL_ENV:'production',COMMUNICATIONS_ENABLED:'true',CUSTOMER_EMAIL_ENABLED:'true',
  DATABASE_URL:'fixture',STRIPE_SECRET_KEY:'sk_live_fixed_synthetic_not_a_credential',PRINTFUL_API_KEY:'fixture'});

function fixture({replay=false,fail=false}={}){
  const session={id:fail?'cs_capacity_paid_failure':'cs_capacity_paid_success',livemode:true,mode:'payment',payment_status:'paid',
    currency:'usd',amount_subtotal:6000,amount_total:6599,total_details:{amount_discount:0,amount_shipping:599,amount_tax:0},
    metadata:{store_id:STORE_ID,commerce_version:'2',items:JSON.stringify([[430697388,123456,2,3000]])},
    shipping_details:{name:'Synthetic Capacity',address:{line1:'1 Fixture Street',city:'Pittsburgh',state:'PA',country:'US',postal_code:'15201'}},
    customer_details:{email:EMAIL}};
  const reference=externalId(session.id),order={id:90001,external_id:reference,store:Number(STORE_ID),status:'draft'};
  const lines={has_more:false,data:[{price:{unit_amount:3000},quantity:2,currency:'usd',description:'Synthetic capacity item',amount_subtotal:6000,amount_total:6000}]};
  const event={id:fail?'evt_capacity_failure':replay?'evt_capacity_replay':'evt_capacity_paid',type:'checkout.session.completed',livemode:true,data:{object:{id:session.id}}};
  const calls={stripe:0,printful:0,email:0},emails=[];
  const count=kind=>{budget.consume();calls[kind]++;};
  const stripe={webhooks:Stripe.webhooks,checkout:{sessions:{
    retrieve:async id=>{if(id!==session.id)throw Error('capacity_session_denied');count('stripe');return structuredClone(session);},
    listLineItems:async id=>{if(id!==session.id)throw Error('capacity_session_denied');count('stripe');return structuredClone(lines);},
    update:async(id,value)=>{if(id!==session.id||Object.keys(value).some(k=>k!=='metadata'))throw Error('capacity_update_denied');count('stripe');Object.assign(session.metadata,value.metadata);return structuredClone(session);},
  }}};
  const fetchImpl=async(url,init)=>{
    const u=new URL(url);
    if(u.origin!=='https://api.printful.com'||u.searchParams.get('store_id')!==STORE_ID)throw Error('capacity_provider_denied');
    if(init.method==='GET'&&u.pathname===`/orders/@${reference}`){
      count('printful');return Response.json({result:replay?order:null},{status:replay?200:404});
    }
    if(init.method==='POST'&&u.pathname==='/orders'&&u.searchParams.get('confirm')==='false'&&u.searchParams.get('update_existing')==='false'){
      const body=JSON.parse(init.body);
      if(body.confirm!==false||body.external_id!==reference||body.recipient?.email!==EMAIL)throw Error('capacity_draft_denied');
      count('printful');return Response.json({result:fail?null:order},{status:fail?503:200});
    }
    throw Error('capacity_provider_denied');
  };
  const send=async(payload,options)=>{
    if(payload.to?.length!==1||![EMAIL,'hello@localjagoff.com'].includes(payload.to[0]))throw Error('capacity_recipient_denied');
    count('email');emails.push({recipient:payload.to[0]===EMAIL?'synthetic_customer':'simulated_owner',subject:payload.subject});
    JSON.parse(JSON.stringify(payload));
    return {id:'00000000-0000-4000-8000-000000000002'};
  };
  return {reference,event,stripe,fetchImpl,send,calls,emails};
}

async function run(store,phase){
  const f=fixture({replay:phase===9,fail:phase===10});
  const service=createService({env:ENV,store,stripe:f.stripe,fetchImpl:f.fetchImpl,
    dispatch:(s,options)=>deliver(s,{...options,send:f.send,logger:{info(){}}})});
  // These callbacks use only the supplied isolated store. The real handler must not create a default store.
  const api=createApiAdapter({webhookFactory:()=>createWebhookHandler({env:{...ENV,COMMUNICATIONS_ENABLED:'false',STRIPE_WEBHOOK_SECRET:SECRET},
    stripe:f.stripe,fetchImpl:f.fetchImpl,recordPaid:service.recordPaid,recordLinked:service.recordLinked,recordFailed:service.recordFailed,
    sendEmail:()=>{throw Error('capacity_legacy_mail_denied');},logger:{info(){},error(){}}})});
  const payload=JSON.stringify(f.event),timestamp=Math.floor(Date.now()/1000);
  const digest=require('node:crypto').createHmac('sha256',SECRET).update(timestamp+'.'+payload).digest('hex');
  const signature=`t=${timestamp},v1=${digest}`;
  const response=await api(new Request('https://fixture.invalid/api/webhook',{method:'POST',
    headers:{'stripe-signature':signature,'content-type':'application/json'},body:payload}),ENV);
  const body=await response.json();
  const jobs=await store.query('SELECT kind,status,attempts FROM comm_outbox WHERE order_ref=$1 ORDER BY kind',[f.reference]);
  const expected=response.status===(phase===10?500:200)&&
    (phase===10?!body.printful_order_id:body.printful_order_id===90001)&&
    jobs.filter(j=>['receipt',phase===10?'owner_alert':'owner_order'].includes(j.kind)&&j.status==='sent'&&j.attempts===1).length===2&&
    (phase!==9||f.calls.email===0);
  return {scenario:phase===8?'paid-draft-simulated':phase===9?'paid-replay-simulated':'paid-failure-simulated',
    outcome:expected?'paid_capacity_pass':'paid_capacity_failed',status:response.status,
    simulated_provider_calls:f.calls,real_provider_calls:0,jobs};
}
module.exports={run,fixture};
