const {isProduction}=require('./deployment.cjs');
const API_VERSION='2023-10-16';
function createLifecycleStripe(env,{fetchImpl=fetch}={}){
  return {checkout:{sessions:{async retrieve(id,options){
    if(!isProduction(env)||! /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||''))throw Error('live_communication_environment_required');
    if(!/^cs_[a-zA-Z0-9_]{1,240}$/.test(id||'')||options?.expand?.length!==1||
      options.expand[0]!=='payment_intent.latest_charge')throw Error('invalid_lifecycle_session_read');
    const url=new URL('https://api.stripe.com/v1/checkout/sessions/'+id);
    url.searchParams.set('expand[0]','payment_intent.latest_charge');
    const response=await fetchImpl(url.href,{method:'GET',redirect:'error',
      headers:{authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'stripe-version':API_VERSION},
      signal:AbortSignal.timeout(10000)});
    if(!response.ok){await response.body?.cancel();throw Error('payment_read_unavailable');}
    const reader=response.body?.getReader();
    if(!reader)throw Error('payment_read_unavailable');
    let bytes=0,text='';const decoder=new TextDecoder();
    try{
      for(;;){const {done,value}=await reader.read();if(done)break;
        bytes+=value.byteLength;if(bytes>262144){await reader.cancel();throw Error('payment_read_unavailable');}
        text+=decoder.decode(value,{stream:true});
      }
      text+=decoder.decode();return JSON.parse(text);
    }catch{throw Error('payment_read_unavailable');}finally{reader.releaseLock();}
  }}}};
}
module.exports={createLifecycleStripe,API_VERSION};
