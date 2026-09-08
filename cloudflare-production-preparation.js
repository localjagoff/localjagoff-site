import {WorkerEntrypoint} from 'cloudflare:workers';
import preparation from './lib/production-preparation.cjs';
import executor from './lib/commerce-executor.cjs';
import budget from './lib/invocation-budget.cjs';

// Private named service entrypoint; no public HTTP route or arbitrary provider operation.
export class ProductionPreparation extends WorkerEntrypoint {
  async run(action,input){
    if(!preparation.enabled(this.env))return {outcome:'production_preparation_closed'};
    if(!['preflight','catalog-step','catalog-status','webhook-stage','signing-status'].includes(action))return {outcome:'unsupported_preparation_action'};
    return budget.withBudget(()=>executor.stub(this.env).prepareProduction(action,input));
  }
}
