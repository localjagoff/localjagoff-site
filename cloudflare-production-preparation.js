import {WorkerEntrypoint} from 'cloudflare:workers';
import preparation from './lib/production-preparation.cjs';
import executor from './lib/commerce-executor.cjs';
import budget from './lib/invocation-budget.cjs';
import catalogSnapshot from './lib/catalog-snapshot.cjs';
import deployment from './lib/deployment.cjs';

// Private named service entrypoint; no public HTTP route or arbitrary provider operation.
export class ProductionPreparation extends WorkerEntrypoint {
  async catalog(action){
    if(!deployment.isProduction(this.env)||!catalogSnapshot.configured(this.env)||!['step','status'].includes(action))return {outcome:'catalog_maintenance_closed'};
    return budget.withBudget(()=>executor.stub(this.env).maintainCatalog(action));
  }
  async run(action,input){
    if(!preparation.enabled(this.env))return {outcome:'production_preparation_closed'};
    if(!['preflight','catalog-step','catalog-status','webhook-stage','signing-status','admin-handoff','lifecycle-subscriptions'].includes(action))return {outcome:'unsupported_preparation_action'};
    return budget.withBudget(()=>executor.stub(this.env).prepareProduction(action,input));
  }
}
