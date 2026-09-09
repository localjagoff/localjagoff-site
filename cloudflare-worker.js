import budget from './lib/invocation-budget.cjs';
import review from './lib/cloudflare-review-verification.cjs';
import capacity from './lib/cloudflare-capacity-verification.cjs';
import executor from './lib/commerce-executor.cjs';
import deployment from './lib/deployment.cjs';
import bootstrap from './lib/cloudflare-provider-bootstrap.cjs';
import api from './lib/cloudflare-api-adapter.cjs';
// Signature SDK code is preloaded by the native adapter; clients stay invocation-local.
import './lib/communications-store.cjs';
import './lib/communications-prewarm.cjs';
import runner from './lib/communications-runner.cjs';
import catalogSnapshot from './lib/catalog-snapshot.cjs';
import wake from './lib/communications-wake.cjs';
import communicationsStore from './lib/communications-store.cjs';
import productRoute from './lib/cloudflare-product-route.cjs';
import {renderProduct,buildId} from './.open-next/product-render.mjs';
const product=productRoute.createProductRoute({renderProduct,buildId});

globalThis.fetch=budget.installBudget(globalThis.fetch);

export default {
  fetch(request,env,ctx){
    if(new URL(request.url).pathname==='/api/internal/cloudflare-review-verification')return budget.withBudget(()=>review.request(request,env));
    if(new URL(request.url).pathname==='/api/internal/cloudflare-provider-bootstrap')return budget.withBudget(()=>bootstrap.request(request,env));
    return budget.withBudget(async()=>{
      let pathname;
      try{pathname=decodeURIComponent(new URL(request.url).pathname).replace(/\/+$/,'');}
      catch{return Response.json({error:'Invalid request path'},{status:400,headers:{'cache-control':'no-store'}});}
      if(pathname==='/api/create-checkout-session'&&env.CHECKOUT_PAUSED==='true'){
        return Response.json({error:'Checkout temporarily paused'},{status:503,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
      }
      if(executor.enabled(env)&&executor.PATHS.has(pathname))return executor.stub(env).fetch(request);
      const productResponse=await product(request,env);
      if(productResponse)return productResponse;
      const apiEnv=pathname==='/api/contact'&&review.contactEnabled(env)?{...env,COMMUNICATIONS_ENABLED:'true'}:env;
      const direct=await api.request(request,apiEnv);
      if(direct){
        if(deployment.isProduction(env)&&env.COMMUNICATIONS_ENABLED==='true'&&
          request.method==='POST'&&direct.status>=200&&direct.status<300&&
          ['/api/webhook','/api/printful-events','/api/contact'].includes(pathname)){
          // Notify only after the handler's durable writes. TEST skips do not wake the queue.
          const body=await direct.clone().json().catch(()=>null);
          if(body&&!body.skipped)await wake.signal(env);
        }
        return direct;
      }
      // OpenNext middleware captures fetch at module evaluation, after our budget is installed.
      const {default:handler}=await import('./.open-next/worker.js');
      return handler.fetch(request,env,ctx);
    });
  },
  async scheduled(event,env) {
    if(['* * * * *','1-56/5 * * * *'].includes(event.cron)){
      try{
        const result=await budget.withBudget(()=>deployment.isProduction(env)&&executor.enabled(env)?
          executor.stub(env).maintainCatalog('step'):catalogSnapshot.refreshStep(env));
        console.info('catalog_scheduled',result);
        if(['catalog_refresh_failed','catalog_state_read_failed'].includes(result.outcome))throw Error('catalog_refresh_failed');
      }catch{console.error('catalog_scheduled',{outcome:'catalog_refresh_failed'});throw Error('catalog_refresh_failed');}
      return;
    }
    const modes={'*/5 * * * *':'fast','2 * * * *':'fallback','17 4 * * *':'cleanup'};
    const mode=Object.hasOwn(modes,event.cron)?modes[event.cron]:null;
    if(!mode)throw new Error('invalid_worker_schedule');
    if(mode==='fast'&&capacity.enabled(env)){
      const result=await budget.withBudget(()=>executor.enabled(env)?executor.stub(env).verifyCapacity(2):capacity.run(env));
      console.info('communications_scheduled',{mode:'synthetic_capacity_review',...result});return;
    }
    if(mode==='fast'&&review.idleEnabled(env)){
      const result=await budget.withBudget(()=>review.idleScheduled(env));
      console.info('communications_scheduled',{mode:'read_only_idle_review',...result});return;
    }
    if(review.enabled(env)||(mode==='fast'&&review.contactEnabled(env))){
      const result=await budget.withBudget(()=>review.scheduled(env));
      console.info('communications_scheduled',{mode:'owner_only_review',...result});return;
    }
    // Native invocation only: no public scheduler route, body or supplied recipient.
    const result=await budget.withBudget(async()=>{
      if(!deployment.isProduction(env)||env.COMMUNICATIONS_ENABLED!=='true'||env.CUSTOMER_EMAIL_ENABLED!=='true'){
        return {outcome:'sending_disabled'};
      }
      if(executor.enabled(env))return executor.stub(env).scheduled(mode);
      return wake.run({env,mode,storeFactory:communicationsStore.createStore,
        execute:()=>runner.runCommunications({env,mode})});
    });
    console.info('communications_scheduled',{mode,...result});
  },
};
