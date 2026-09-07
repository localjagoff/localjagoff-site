const {createHmac}=require('node:crypto');
const {equal}=require('./communications-auth.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const {verifyPrintfulSignature}=require('./customer-lifecycle.cjs');
const {withBudget,installBudget}=require('./invocation-budget.cjs');

const ORIGIN='https://localjagoff-review.localjagoff-site.workers.dev';
const PATH='/api/internal/cloudflare-review-verification';
const SESSION='cs_test_b1smOwWNyQvVoamURY1KIUlmMvtp6zSiUJZySdkb6Ps1rmVUyDHkd4MZzQ';
const EVENT='evt_1UDBgN2MvN1ioVod1lL0UPCW';
const TYPES=Object.freeze(['order_updated','order_failed','order_canceled','order_put_hold',
  'order_remove_hold','order_refunded','shipment_sent','shipment_delivered','shipment_returned']);
// Catalog fixtures must never be sent: this table is reserved for observed stock transport.
const STOCK_SQL=`WITH evidence AS (
  SELECT identity,occurred_at,age_seconds FROM comm_preview_events
  WHERE kind='catalog_stock_updated' AND store_id=${Number(STORE_ID)}
)
SELECT 'catalog_stock_updated' AS type,count(*)::text AS count,
  floor(extract(epoch FROM (now()-max(occurred_at))))::text AS newest_age_seconds,
  floor(extract(epoch FROM (now()-min(occurred_at))))::text AS oldest_age_seconds,
  min(age_seconds)::text AS min_arrival_age_seconds,max(age_seconds)::text AS max_arrival_age_seconds,
  (SELECT identity FROM evidence ORDER BY occurred_at DESC,identity LIMIT 1) AS latest_identity_hash
FROM evidence`;
const reply=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
const fail=(status,outcome)=>{throw Object.assign(new Error(outcome),{status,outcome});};

function verifyRequest(req,env,now){
  const until=Date.parse(env.CLOUDFLARE_REVIEW_VERIFY_UNTIL||'');
  if(env.CLOUDFLARE_WORKER_NAME!=='localjagoff-review'||env.COMMERCE_ENV!=='preview'||
    env.SITE_URL!==ORIGIN||req.url!==ORIGIN+PATH||env.CHECKOUT_PAUSED!=='true'||
    env.CUSTOMER_EMAIL_ENABLED!=='false'||!Number.isFinite(until)||until<=now||until>now+3600000){
    fail(404,'verification_closed');
  }
  if(req.method!=='POST'||typeof env.CRON_SECRET!=='string'||env.CRON_SECRET.length<32||
    !equal(/^Bearer (.+)$/.exec(req.headers.get('authorization')||'')?.[1],env.CRON_SECRET)){
    fail(401,'verification_unauthorized');
  }
}

function returnURL(value){
  try{
    const url=new URL(value);
    if(url.origin===ORIGIN&&!url.username&&!url.password&&['/success','/cart'].includes(url.pathname)){
      return ORIGIN+url.pathname;
    }
  }catch{}
  return null;
}
const choice=(value,allowed)=>allowed.includes(value)?value:null;
const integer=value=>typeof value==='number'&&Number.isSafeInteger(value)?value:null;
function sessionStatus(session){
  if(session?.id!==SESSION||session.object!=='checkout.session'||session.livemode!==false){
    fail(502,'stripe_evidence_invalid');
  }
  return {status:{checkout:choice(session.status,['open','complete','expired']),
    payment:choice(session.payment_status,['paid','unpaid','no_payment_required'])},
  amount:session.amount_total>=0?integer(session.amount_total):null,livemode:false,
  returnURL:{success:returnURL(session.success_url),cancel:returnURL(session.cancel_url),return:returnURL(session.return_url)}};
}
function stockStatus(rows){
  const row=rows?.[0];
  const number=value=>typeof value==='string'&&/^-?\d{1,15}$/.test(value)?integer(Number(value)):null;
  if(rows?.length!==1||row.type!=='catalog_stock_updated'||number(row.count)===null||number(row.count)<0){
    fail(502,'stock_evidence_invalid');
  }
  return {type:'catalog_stock_updated',count:number(row.count),newest_age_seconds:number(row.newest_age_seconds),
    oldest_age_seconds:number(row.oldest_age_seconds),min_arrival_age_seconds:number(row.min_arrival_age_seconds),
    max_arrival_age_seconds:number(row.max_arrival_age_seconds),
    latest_identity_hash:typeof row.latest_identity_hash==='string'&&/^[a-f0-9]{64}$/.test(row.latest_identity_hash)?row.latest_identity_hash:null};
}

async function providerStatus(env,check,send,sqlFactory){
  if(!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY||'')||!env.DATABASE_URL){
    fail(503,'verification_configuration_incomplete');
  }
  async function stripe(path){
    check();
    if(!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY||''))fail(503,'verification_configuration_incomplete');
    const response=await send('https://api.stripe.com/v1/'+path,{method:'GET',redirect:'error',
      headers:{authorization:`Bearer ${env.STRIPE_SECRET_KEY}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok){await response.body?.cancel();fail(502,'stripe_evidence_unavailable');}
    return response.json();
  }
  const session=sessionStatus(await stripe('checkout/sessions/'+SESSION));
  const event=await stripe('events/'+EVENT);
  if(event?.id!==EVENT||event.object!=='event'||event.livemode!==false||event.type!=='checkout.session.completed'){
    fail(502,'stripe_evidence_invalid');
  }
  const eventStatus={status:'checkout.session.completed',livemode:false,session:sessionStatus(event.data?.object)};
  const endpoints=await stripe('webhook_endpoints?limit=100');
  if(!Array.isArray(endpoints?.data)||endpoints.data.length>100)fail(502,'stripe_evidence_invalid');
  const matches=endpoints.data.filter(item=>item?.url===ORIGIN+'/api/webhook'&&item.livemode===false);
  const endpointstatus=matches.length===1?choice(matches[0].status,['enabled','disabled']):
    matches.length>1?'ambiguous':endpoints.has_more===false?'not_found':'unknown';
  check();
  const sql=(sqlFactory||require('@neondatabase/serverless').neon)(env.DATABASE_URL);
  // One read-only HTTP transaction, counted by the worker's shared invocation fetch budget.
  check();
  const [rows]=await sql.transaction([sql.query(STOCK_SQL)],{
    readOnly:true,fetchOptions:{redirect:'error',signal:AbortSignal.timeout(10000)},
  });
  return {outcome:'provider_status',stripe:{session,event:eventStatus,endpointstatus},stock:stockStatus(rows)};
}

async function fixtures(env,check,send,now){
  check();
  const secret=env.PRINTFUL_WEBHOOK_SECRET,publicKey=env.PRINTFUL_WEBHOOK_PUBLIC_KEY;
  if(!/^(?:[a-f\d]{2}){16,}$/i.test(secret||'')||typeof publicKey!=='string'||!publicKey||publicKey.length>1024||/[\r\n]/.test(publicKey)){
    fail(503,'verification_configuration_incomplete');
  }
  const make=(type,changes={})=>({type,store_id:Number(STORE_ID),occurred_at:new Date(now()).toISOString(),retries:0,
    data:{order:{id:123,store_id:Number(STORE_ID),external_id:'LJ'+'a'.repeat(24)},
      ...(type.startsWith('shipment_')?{shipment:{id:456}}:{})},...changes});
  const cases=TYPES.map(type=>({name:type,event:make(type),status:200}));
  cases.push({name:'repeat',event:cases[0].event,status:200},
    {name:'bad_signature',event:make('order_updated'),status:400},
    {name:'wrong_store',event:make('order_updated',{store_id:Number(STORE_ID)+1}),status:400},
    {name:'stale',event:make('order_updated',{occurred_at:new Date(now()-8*86400000).toISOString()}),status:400},
    {name:'body_tamper',event:make('order_updated'),status:400});
  if(cases.length>16)fail(503,'fixture_budget_exceeded');
  const checks=[];
  for(const item of cases){
    check();
    if(env.PRINTFUL_WEBHOOK_SECRET!==secret||env.PRINTFUL_WEBHOOK_PUBLIC_KEY!==publicKey)fail(404,'verification_closed');
    let body=JSON.stringify(item.event);
    const headers={'content-type':'application/json','x-pf-webhook-public-key':publicKey,
      'x-pf-webhook-signature':createHmac('sha256',Buffer.from(secret,'hex')).update(body).digest('hex')};
    if(!verifyPrintfulSignature(Buffer.from(body),headers,env))fail(503,'fixture_signing_failed');
    if(item.name==='bad_signature')headers['x-pf-webhook-signature']='0'.repeat(64);
    if(item.name==='body_tamper')body+=' ';
    // Always traverse the hosted endpoint and its source parser; no synthetic service shortcut.
    const response=await send(ORIGIN+'/api/printful-events',{method:'POST',redirect:'error',headers,body,
      signal:AbortSignal.timeout(10000)});
    const result=await response.json().catch(()=>null);
    const expected=item.status===200?result?.received===true&&result.outcome==='preview_no_provider_or_email':
      result?.error===(['bad_signature','body_tamper'].includes(item.name)?'Invalid signature':'Invalid event');
    const passed=response.status===item.status&&expected;
    checks.push({fixture:item.name,endpointstatus:response.status,passed});
    if(!passed)return {outcome:'fixture_verification_failed',checks};
  }
  return {outcome:'synthetic_order_shipment_verified',checks};
}

async function request(req,env,command,{fetchImpl=fetch,sqlFactory,now=Date.now}={}){
  try{
    const check=()=>verifyRequest(req,env,now());
    check();
    if(!['provider-status','fixtures'].includes(command))return reply(400,{outcome:'invalid_command'});
    const transport=installBudget(fetchImpl);
    const send=(input,init)=>{check();return transport(input,init);};
    return await withBudget(async()=>{
      const result=command==='fixtures'?await fixtures(env,check,send,now):await providerStatus(env,check,send,sqlFactory);
      return reply(result.outcome==='fixture_verification_failed'?502:200,result);
    });
  }catch(error){
    // Provider/database errors may contain credentials or customer data. Never echo them.
    const status=[401,404,503].includes(error.status)?error.status:502;
    const outcome=['verification_closed','verification_unauthorized','verification_configuration_incomplete'].includes(error.outcome)?
      error.outcome:'provider_verification_failed';
    return reply(status,{outcome});
  }
}
module.exports={request};
