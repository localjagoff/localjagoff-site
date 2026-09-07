const {equal} = require('./communications-auth.cjs');
const {createStore, hash} = require('./communications-store.cjs');
const {contactEmail, ORDER_SENDER, SUPPORT} = require('./customer-mail.cjs');

function payload() {
  const email = contactEmail({name: 'Local Jagoff review verification', email: SUPPORT, topic: 'other',
    message: 'OWNER-ONLY DELIVERY TEST. This message was sent from the isolated Netlify review site. No real order, payment or fulfillment was created. Normal customer email remains disabled. Please confirm this arrived, check the From and Reply-To addresses, and inspect SPF, DKIM and DMARC in the message headers. This is not a purchase confirmation.'});
  return {...email, from: ORDER_SENDER, subject: 'Local Jagoff - owner-only Netlify delivery test'};
}

async function verify(request, {env = process.env, storeFactory = createStore, fetchImpl = fetch, now = Date.now()} = {}) {
  const reply = (status, body) => Response.json(body, {status, headers: {'cache-control': 'no-store'}});
  if (env.OWNER_MAIL_VERIFICATION_ENABLED !== 'true' || env.COMMERCE_ENV !== 'preview' ||
      !env.SITE_ID || env.OWNER_MAIL_VERIFICATION_SITE_ID !== env.SITE_ID ||
      env.CHECKOUT_PAUSED !== 'true' || env.CUSTOMER_EMAIL_ENABLED !== 'false') return reply(404, {outcome: 'not_available'});
  const supplied = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '')?.[1];
  if (request.method !== 'POST' || (env.CRON_SECRET || '').length < 32 || !equal(supplied, env.CRON_SECRET)) return reply(401, {outcome: 'unauthorized'});
  if (!env.RESEND_API_KEY || env.COMMUNICATIONS_ENABLED !== 'true') return reply(503, {outcome: 'configuration_incomplete'});
  // The caller cannot choose a recipient, subject or message; only this fixed owner test is possible.
  if ((await request.text()).length) return reply(400, {outcome: 'body_not_allowed'});
  const store = storeFactory(env), key = `verification/owner-netlify-v1/${env.SITE_ID}`, mail = payload();
  await store.enqueue(key, 'contact', null, mail);
  const job = await store.claim(key);
  if (!job) return reply(200, {outcome: 'already_queued_or_completed'});
  if (hash(job.payload) !== job.payload_hash || job.payload_hash !== hash(mail) ||
      (job.first_attempt_at && now - Date.parse(job.first_attempt_at) >= 23 * 60 * 60 * 1000)) {
    await store.finish(job, 'held', {error: 'owner_verification_requires_review'});
    return reply(409, {outcome: 'owner_review_required'});
  }
  if (!await store.mailQuota()) {
    await store.finish(job, 'pending', {error: 'daily_mail_budget', delay: 86400});
    return reply(429, {outcome: 'daily_mail_budget'});
  }
  await store.markAttempt(job);
  let result;
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {method: 'POST', redirect: 'error',
      headers: {authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': key},
      body: JSON.stringify(mail), signal: AbortSignal.timeout(10000)});
    const data = await response.json().catch(() => null);
    if (!response.ok || !/^[a-f0-9-]{36}$/i.test(data?.id || '')) {
      const terminal = response.status >= 400 && response.status < 500 && response.status !== 429;
      await store.finish(job, terminal ? 'held' : 'pending', {error: 'owner_verification_provider_rejected', delay: 120});
      return reply(502, {outcome: 'provider_rejected', status: response.status});
    }
    result = data.id;
  } catch {
    await store.finish(job, 'pending', {error: 'owner_verification_transport_ambiguous', delay: 120});
    return reply(502, {outcome: 'transport_ambiguous_retry_same_job'});
  }
  await store.finish(job, 'sent', {providerId: result});
  return reply(200, {outcome: 'provider_accepted', email_id: result});
}

module.exports = {verify, payload};
