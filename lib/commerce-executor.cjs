const budget=require('./invocation-budget.cjs');
const {isProduction}=require('./deployment.cjs');
const wake=require('./communications-wake.cjs');
const {createStore}=require('./communications-store.cjs');
const {runCommunications}=require('./communications-runner.cjs');
const capacity=require('./cloudflare-capacity-verification.cjs');
const api=require('./cloudflare-api-adapter.cjs');
const PATHS=new Set(['/api/webhook','/api/printful-events','/api/create-checkout-session','/api/checkout-receipt']);
function enabled(env){return env.COMMERCE_EXECUTOR_ENABLED==='true';}
function stub(env){
  if(!enabled(env)||!env.COMMERCE_EXECUTOR)throw Error('commerce_executor_unavailable');
  budget.consume();
  return env.COMMERCE_EXECUTOR.get(env.COMMERCE_EXECUTOR.idFromName('localjagoff-commerce'));
}
function createExecutor(env,{run=runCommunications,storeFactory=createStore,apiRequest=api.request,
  capacityRun=capacity.run,signal=wake.signal,wakeRun=wake.run}={}){
  return {
    async scheduled(mode){
      if(!['fast','fallback','cleanup'].includes(mode))throw Error('invalid_worker_mode');
      if(!enabled(env)||!isProduction(env)||env.COMMUNICATIONS_ENABLED!=='true'||env.CUSTOMER_EMAIL_ENABLED!=='true'){
        return {outcome:'sending_disabled'};
      }
      return budget.withBudget(()=>wakeRun({env,mode,storeFactory,execute:()=>run({env,mode})}));
    },
    async verifyCapacity(phase){
      if(!enabled(env)||!capacity.enabled(env)||!Number.isInteger(phase)||phase<0||phase>=capacity.CASES.length){
        return {outcome:'capacity_disabled'};
      }
      return budget.withBudget(()=>capacityRun(env,{phase}));
    },
    async fetch(request){
      if(!enabled(env)||!PATHS.has(new URL(request.url).pathname))return new Response(null,{status:404});
      return budget.withBudget(async()=>{
        const response=await apiRequest(request,env);
        if(!response)throw Error('commerce_route_unavailable');
        if(['/api/webhook','/api/printful-events'].includes(new URL(request.url).pathname)&&isProduction(env)&&env.COMMUNICATIONS_ENABLED==='true'&&request.method==='POST'&&response.ok){
          const result=await response.clone().json().catch(()=>null);
          if(result&&!result.skipped)await signal(env);
        }
        return response;
      });
    },
  };
}
module.exports={PATHS,enabled,stub,createExecutor};
