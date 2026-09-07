const {sendViaResend} = require('./customer-mail.cjs');
const {hash} = require('./communications-store.cjs');
const {isProduction} = require('./deployment.cjs');

async function deliver(store, {key,env=process.env,send=sendViaResend,beforeReview,logger=console,now=Date.now()}={}) {
  // Preview may persist synthetic test jobs, but cannot contact the mail provider.
  if (!isProduction(env) || env.CUSTOMER_EMAIL_ENABLED !== 'true') return {outcome:'sending_disabled'};
  const job = await store.claim(key);
  if (!job) return {outcome:'no_due_job'};
  const hold = async reason => { await store.finish(job,'held',{error:reason}); return {outcome:reason}; };
  if (!job.payload || hash(job.payload)!==job.payload_hash) return hold('payload_integrity_failed');
  if (job.first_attempt_at && now-Date.parse(job.first_attempt_at)>=23*60*60*1000) return hold('idempotency_window_requires_review');
  if (job.kind==='review') {
    if (!beforeReview) return hold('fresh_review_check_required');
    try {
      const check=await beforeReview(job.order_ref);
      if (!check.eligible) {
        const status=check.reason==='waiting'?'pending':'suppressed';
        await store.finish(job,status,{error:check.reason,delay:86400});
        return {outcome:status};
      }
    } catch {
      await store.finish(job,'pending',{error:'review_check_unavailable',delay:3600});
      return {outcome:'review_check_unavailable'};
    }
  }
  if (!await store.mailQuota()) {
    await store.finish(job,'pending',{error:'daily_mail_budget',delay:86400});
    return {outcome:'daily_mail_budget'};
  }
  let accepted;
  await store.markAttempt(job);
  try { accepted=await send(job.payload,job.key,{env}); }
  catch (error) {
    const terminal=error.status>=400 && error.status<500 && error.status!==429;
    await store.finish(job,terminal?'held':'pending', {error:terminal?'provider_rejected':'provider_retry',delay:Math.min(3600,60*2**Math.min(job.attempts,6))});
    return {outcome:terminal?'held':'retry_scheduled'};
  }
  // If persistence fails after provider acceptance, retain the lease and key for safe replay.
  await store.finish(job,'sent',{providerId:accepted.id});
  logger.info('customer_email_sent',{job_id:job.key,provider_id:accepted.id});
  return {outcome:'sent',jobId:job.key};
}
module.exports = {deliver};
