const {STORE_ID}=require('./commerce-policy.cjs');
const {EVENTS}=require('./customer-lifecycle.cjs');
const TARGET='https://www.localjagoff.com/api/printful-events';
const EXPIRY='2027-09-07T00:00:00Z';

async function subscriptions(env,eventType,{fetchImpl=fetch}={}){
  if(eventType!==undefined&&!EVENTS.has(eventType))return {outcome:'unsupported_lifecycle_event'};
  if(!env.PRINTFUL_WEBHOOK_API_KEY||!env.PRINTFUL_WEBHOOK_PUBLIC_KEY||
    !/^(?:[a-f\d]{2}){16,}$/i.test(env.PRINTFUL_WEBHOOK_SECRET||''))return {outcome:'missing_signing_configuration'};
  const headers={authorization:`Bearer ${env.PRINTFUL_WEBHOOK_API_KEY}`,'X-PF-Store-Id':STORE_ID,'content-type':'application/json'};
  async function read(){
    const response=await fetchImpl('https://api.printful.com/v2/webhooks',
      {method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.status!==200){await response.body?.cancel();throw Error('subscription_read_failed');}
    const body=await response.json();return body.result??body.data;
  }
  function valid(config){
    return config?.default_url===TARGET&&config.public_key===env.PRINTFUL_WEBHOOK_PUBLIC_KEY&&
      Date.parse(config.expires_at)===Date.parse(EXPIRY)&&Array.isArray(config.events)&&
      new Set(config.events.map(event=>event.type)).size===config.events.length&&
      config.events.every(event=>EVENTS.has(event.type)&&(!event.url||event.url===TARGET)&&
        Array.isArray(event.params)&&event.params.length===0);
  }
  function status(config,changed){
    const events=config.events.map(event=>event.type).sort();
    return {outcome:events.length===EVENTS.size?'lifecycle_subscriptions_ready':'lifecycle_subscriptions_partial',
      events,missing:[...EVENTS].filter(type=>!events.includes(type)),signingKeyPreserved:true,
      providerMutations:changed?1:0};
  }
  const before=await read();
  if(!valid(before))return {outcome:'subscription_configuration_mismatch',providerMutations:0};
  if(eventType===undefined||before.events.some(event=>event.type===eventType))return status(before,false);
  // Per-event writes retain the existing signing pair. Never replace /v2/webhooks.
  const response=await fetchImpl('https://api.printful.com/v2/webhooks/'+eventType,
    {method:'POST',headers,redirect:'manual',signal:AbortSignal.timeout(15000),
      body:JSON.stringify({type:eventType,url:TARGET,params:[]})});
  await response.body?.cancel();
  if(response.status!==200)return {outcome:'subscription_write_uncertain',eventType,status:response.status};
  const after=await read();
  if(!valid(after)||!after.events.some(event=>event.type===eventType)||
    before.events.some(event=>!after.events.some(next=>next.type===event.type))){
    return {outcome:'subscription_verification_failed',eventType,providerMutations:1};
  }
  return status(after,true);
}
module.exports={subscriptions};
