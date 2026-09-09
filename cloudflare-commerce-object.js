import {DurableObject} from 'cloudflare:workers';
import executor from './lib/commerce-executor.cjs';
import preparation from './lib/production-preparation.cjs';
import catalogMaintenance from './lib/catalog-maintenance.cjs';

// No timers, sockets, or cached customer state: idle instances can hibernate.
export class CommerceExecutor extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.operations=executor.createExecutor(env);}
  scheduled(mode){return this.operations.scheduled(mode);}
  verifyCapacity(phase){return this.operations.verifyCapacity(phase);}
  prepareProduction(action,input){return preparation.createPreparation(this.env,{handoffStore:this.ctx.storage}).run(action,input);}
  maintainCatalog(action){return catalogMaintenance.run(action,this.env,this.ctx.storage);}
  fetch(request){return this.operations.fetch(request);}
}
