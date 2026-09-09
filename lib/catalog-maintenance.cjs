const snapshot=require('./catalog-snapshot.cjs');
const {isProduction}=require('./deployment.cjs');
const {SUPPORT,ORDER_SENDER,sendViaResend}=require('./customer-mail.cjs');
const budget=require('./invocation-budget.cjs');

async function run(action,env,receiptStore,{store,refresh=snapshot.refreshStep,send=sendViaResend,now=Date.now}={}){
  if(!isProduction(env)||!snapshot.configured(env)||!['status','step'].includes(action))return {outcome:'catalog_maintenance_closed'};
  return budget.withBudget(async()=>{
    store??=snapshot.createSnapshotStore(env);
    let result={outcome:'catalog_status'};
    if(action==='step'){
      try{result=await refresh(env,{store});}
      catch{result={outcome:'catalog_refresh_failed'};}
    }
    let row;
    try{row=await store.read();}catch{result={outcome:'catalog_state_read_failed'};}
    const source=Date.parse(row?.published_source_at);
    const age=Number.isFinite(source)?Math.max(0,Math.floor((now()-source)/1000)):null;
    const health=age===null||!Array.isArray(row?.published)?'missing':age>=9000?'expired':age>=7200?'at_risk':'fresh';
    const status={...result,health,source_age_seconds:age,published_source_at:row?.published_source_at??null,
      cycle_started_at:row?.cycle_started_at??null,updated_at:row?.updated_at??null,cursor:row?.cursor??null,
      products:row?.published?.length??0,variants:row?.published?.reduce((n,p)=>n+(p.variants?.length||0),0)??0,
      snapshot_enabled:env.CATALOG_SNAPSHOT_ENABLED==='true',product_read_key_configured:Boolean(env.PRINTFUL_API_KEY)};
    if(action!=='step'||health==='fresh'||!receiptStore||env.COMMUNICATIONS_ENABLED!=='true'||env.CUSTOMER_EMAIL_ENABLED!=='true')return status;
    const key='catalog-alert-'+ (Number.isFinite(source)?source:'missing');
    const claimed=await receiptStore.transaction(async tx=>{
      if(await tx.get(key))return false;
      await tx.put(key,{status:'attempted',at:new Date(now()).toISOString()});return true;
    });
    if(!claimed)return {...status,alert:'already_attempted'};
    try{
      const sent=await send({from:ORDER_SENDER,to:[SUPPORT],reply_to:SUPPORT,
        subject:'HIGH PRIORITY: Local Jagoff catalog freshness needs attention',
        text:`The production catalog is ${health}. Last authoritative source: ${row?.published_source_at||'none'}. `+
          `Refresh cursor: ${row?.cursor??'unknown'}. Inspect the storefront and catalog refresh immediately. `+
          'Stale data remains fail-closed. Do not change prices or create orders to investigate.'},key,{env});
      await receiptStore.put(key,{status:'sent',emailId:sent.id,at:new Date(now()).toISOString()});
      return {...status,alert:'sent'};
    }catch{return {...status,alert:'delivery_uncertain'};}
  });
}
module.exports={run};
