import {DurableObject} from 'cloudflare:workers';
import executor from './lib/commerce-executor.cjs';

// No timers, sockets, or cached customer state: idle instances can hibernate.
export class CommerceExecutor extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.operations=executor.createExecutor(env);}
  scheduled(mode){return this.operations.scheduled(mode);}
  verifyCapacity(phase){return this.operations.verifyCapacity(phase);}
  fetch(request){return this.operations.fetch(request);}
}
