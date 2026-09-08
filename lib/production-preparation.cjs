const {neon}=require('@neondatabase/serverless');
const {isProduction}=require('./deployment.cjs');
const {STORE_ID}=require('./commerce-policy.cjs');
const catalog=require('./catalog-snapshot.cjs');
const budget=require('./invocation-budget.cjs');
const webhookStage=require('./production-webhook-stage.cjs');

function enabled(env){
  return isProduction(env)&&env.COMMERCE_EXECUTOR_ENABLED==='true'&&env.CHECKOUT_PAUSED==='true'&&
    env.COMMUNICATIONS_ENABLED==='false'&&env.CUSTOMER_EMAIL_ENABLED==='false';
}
async function requestJSON(url,key,fetchImpl){
  const response=await fetchImpl(url,{method:'GET',redirect:'manual',
    headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
  if(response.status!==200){await response.body?.cancel();throw Error('provider_read_failed');}
  return response.json();
}
function expectedScopes(body,wanted){
  const scopes=body?.result?.scopes?.map(item=>item.scope);
  return Array.isArray(scopes)&&scopes.length===wanted.length&&wanted.every(value=>scopes.includes(value));
}
function expectedStore(body){return Array.isArray(body?.result)&&body.result.length===1&&String(body.result[0].id)===String(STORE_ID);}
function createPreparation(env,{fetchImpl=fetch,query,refresh=catalog.refreshStep,read=catalog.readSnapshot}={}){
  return {async run(action,input){
    if(!enabled(env))return {outcome:'production_preparation_closed'};
    if(!['preflight','catalog-step','catalog-status','webhook-stage','signing-status'].includes(action))return {outcome:'unsupported_preparation_action'};
    return budget.withBudget(async()=>{
      try{
        if(action==='webhook-stage')return await webhookStage.stage(env,input,{fetchImpl});
        if(action==='signing-status'){
          const envelope=await requestJSON('https://api.printful.com/v2/webhooks',env.PRINTFUL_WEBHOOK_API_KEY,fetchImpl);
          const current=envelope.result??envelope.data;
          const validSecret=/^(?:[a-f\d]{2}){16,}$/i.test(env.PRINTFUL_WEBHOOK_SECRET||'');
          const publicKeyMatches=Boolean(env.PRINTFUL_WEBHOOK_PUBLIC_KEY)&&current?.public_key===env.PRINTFUL_WEBHOOK_PUBLIC_KEY;
          const targetMatches=current?.default_url==='https://www.localjagoff.com/api/printful-events';
          const noEvents=Array.isArray(current?.events)&&current.events.length===0;
          return {outcome:validSecret&&publicKeyMatches&&targetMatches&&noEvents?'signing_staged_pass':'signing_staged_incomplete',
            validSecret,publicKeyMatches,targetMatches,noEvents,providerMutations:0};
        }
        if(action==='catalog-step')return await refresh(env);
        if(action==='catalog-status'){
          const products=await read(env);
          return {outcome:'catalog_ready',products:products.length,variants:products.reduce((n,p)=>n+(p.variants?.length||0),0)};
        }
        const keys=['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PRINTFUL_API_KEY',
          'PRINTFUL_WEBHOOK_API_KEY','RESEND_API_KEY','COMMUNICATIONS_SECRET','CRON_SECRET'];
        if(keys.some(name=>typeof env[name]!=='string'||env[name].length<20))return {outcome:'missing_production_configuration'};
        const orderStore=await requestJSON('https://api.printful.com/stores',env.PRINTFUL_API_KEY,fetchImpl);
        const orderScopes=await requestJSON('https://api.printful.com/oauth/scopes',env.PRINTFUL_API_KEY,fetchImpl);
        const webhookStore=await requestJSON('https://api.printful.com/stores',env.PRINTFUL_WEBHOOK_API_KEY,fetchImpl);
        const webhookScopes=await requestJSON('https://api.printful.com/oauth/scopes',env.PRINTFUL_WEBHOOK_API_KEY,fetchImpl);
        const envelope=await requestJSON('https://api.printful.com/v2/webhooks',env.PRINTFUL_WEBHOOK_API_KEY,fetchImpl);
        const webhook=envelope.result??envelope.data;
        const stripe=await requestJSON('https://api.stripe.com/v1/account',env.STRIPE_SECRET_KEY,fetchImpl);
        const sql=query||((statement)=>neon(env.DATABASE_URL).query(statement,[],{fetchOptions:{signal:AbortSignal.timeout(15000)}}));
        const [schema]=await sql(`SELECT
          (SELECT count(*)::int FROM information_schema.tables WHERE table_schema=current_schema() AND table_name LIKE 'comm_%') AS tables,
          (SELECT count(*)::int FROM comm_orders) AS orders,(SELECT count(*)::int FROM comm_outbox) AS outbox`);
        const checks={orderStore:expectedStore(orderStore),orderScopes:expectedScopes(orderScopes,['orders','sync_products/read']),
          webhookStore:expectedStore(webhookStore),webhookScopes:expectedScopes(webhookScopes,['webhooks']),
          stripeAccount:stripe.id==='acct_1TN0vR2MvN1ioVod'&&env.STRIPE_SECRET_KEY.startsWith('sk_live_'),
          schema:schema?.tables===7,resendConfigured:env.RESEND_API_KEY.startsWith('re_'),
          internalSecrets:env.COMMUNICATIONS_SECRET.length>=32&&env.CRON_SECRET.length>=32};
        const target=webhook?.default_url;
        const webhookTarget=target==='https://www.localjagoff.com/api/printful-events'?'production':
          target==='https://localjagoff-review.localjagoff-site.workers.dev/api/printful-events'?'review':target?'other':'none';
        return {outcome:Object.values(checks).every(Boolean)?'production_preflight_pass':'production_preflight_incomplete',checks,
          webhookTarget,webhookEventCount:Array.isArray(webhook?.events)?webhook.events.length:0,
          schema:{tables:schema?.tables,orders:schema?.orders,outbox:schema?.outbox},emailSent:false,providerMutations:0};
      }catch{return {outcome:'production_preparation_failed',detailsWithheld:true};}
    });
  }};
}
module.exports={enabled,createPreparation};
