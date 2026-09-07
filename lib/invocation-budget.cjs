const {AsyncLocalStorage}=require('node:async_hooks');
const scope=new AsyncLocalStorage();
const MAX_SUBREQUESTS=32;
const installed=new WeakSet();
function installBudget(fetchImpl=globalThis.fetch){
  if(installed.has(fetchImpl))return fetchImpl;
  const wrapped=async function(input,init){
    const state=scope.getStore();
    if(state&&++state.subrequests>MAX_SUBREQUESTS)throw new Error('invocation_subrequest_budget');
    // Cloudflare accepts only follow/manual. Emulate error without following credentials.
    const redirect=init?.redirect??input?.redirect;
    const rejectRedirect=redirect==='error'||Boolean(state)&&redirect!=='manual';
    if(state||rejectRedirect)init={...init,redirect:'manual'};
    const response=await fetchImpl(input,init);
    if(rejectRedirect&&response?.status>=300&&response.status<400){
      try{await response.body?.cancel();}catch{}
      throw new Error('invocation_redirect_blocked');
    }
    return response;
  };
  installed.add(wrapped);
  return wrapped;
}
async function withBudget(operation,logger=console){
  if(scope.getStore())return operation();
  const state={subrequests:0};
  return scope.run(state,async()=>{
    try{return await operation();}
    finally{
      try{logger.info('invocation_budget',{subrequests:Math.min(state.subrequests,MAX_SUBREQUESTS),limit:MAX_SUBREQUESTS,exceeded:state.subrequests>MAX_SUBREQUESTS});}catch{}
    }
  });
}
module.exports={installBudget,withBudget,MAX_SUBREQUESTS};
