const {equal}=require('./communications-auth.cjs');
const {runCommunications}=require('./communications-runner.cjs');
const {verify}=require('./owner-mail-verification.cjs');

async function trigger({env=process.env,fetchImpl=fetch,logger=console}={}) {
  const origin=env.URL;
  if (!env.SITE_ID || !/^[a-z0-9-]+$/.test(env.SITE_NAME||'') ||
      origin!==`https://${env.SITE_NAME}.netlify.app` || (env.CRON_SECRET||'').length<32) {
    throw new Error('scheduler_configuration_invalid');
  }
  const response=await fetchImpl(`${origin}/.netlify/functions/communications-worker`,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${env.CRON_SECRET}`},
  });
  if (response.status!==202) throw new Error('scheduler_dispatch_failed');
  logger.info('communications_tick',{outcome:'worker_dispatched'});
}

async function work(request,{env=process.env,run=runCommunications,verifyOwner=verify,logger=console}={}) {
  const supplied=/^Bearer (.+)$/.exec(request.headers.get('authorization')||'')?.[1];
  // Background functions acknowledge transport before executing: a 202 alone is
  // not proof of authentication or success. Only this authenticated path can run.
  if (request.method!=='POST' || !env.SITE_ID || (env.CRON_SECRET||'').length<32 || !equal(supplied,env.CRON_SECRET)) {
    logger.info('communications_worker',{outcome:'unauthorized'});
    return;
  }
  try {
    if (env.OWNER_SCHEDULER_VERIFICATION_ENABLED==='true' && env.COMMERCE_ENV==='preview') {
      const response=await verifyOwner(request,{env,mode:'scheduler'});
      const result=await response.json();
      logger.info('owner_scheduler_verification',{status:response.status,...result});
      if (!response.ok && response.status!==404) throw new Error('owner_scheduler_retry_required');
      return;
    }
    const result=await run({env});
    logger.info('communications_worker',result);
  } catch {
    logger.error('communications_worker',{outcome:'incomplete_retry_required'});
    throw new Error('communications_worker_incomplete');
  }
}

module.exports={trigger,work};
