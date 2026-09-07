const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verify, payload} = require('../lib/owner-mail-verification.cjs');
const {hash} = require('../lib/communications-store.cjs');
const env = {OWNER_MAIL_VERIFICATION_ENABLED:'true', COMMERCE_ENV:'preview', SITE_ID:'review-fixture',
  OWNER_MAIL_VERIFICATION_SITE_ID:'review-fixture', CHECKOUT_PAUSED:'true', CUSTOMER_EMAIL_ENABLED:'false',
  COMMUNICATIONS_ENABLED:'true', CRON_SECRET:'c'.repeat(32), RESEND_API_KEY:'fixture'};
const request = (body, authorized = true) => new Request('https://fixture.netlify.app/test', {method:'POST',
  headers: authorized ? {authorization:'Bearer '+env.CRON_SECRET} : {}, ...(body ? {body} : {})});
const forbidden = () => {throw new Error('unexpected_provider_or_storage');};

test('owner mail verification fails closed outside explicitly enabled paused review and authenticated request', async () => {
  for (const change of [{OWNER_MAIL_VERIFICATION_ENABLED:'false'}, {COMMERCE_ENV:'production'}, {SITE_ID:'production'},
    {OWNER_MAIL_VERIFICATION_SITE_ID:''}, {CHECKOUT_PAUSED:'false'}, {CUSTOMER_EMAIL_ENABLED:'true'}]) {
    assert.equal((await verify(request(), {env:{...env,...change}, storeFactory:forbidden, fetchImpl:forbidden})).status,404);
  }
  assert.equal((await verify(request(undefined,false), {env,storeFactory:forbidden,fetchImpl:forbidden})).status,401);
  assert.equal((await verify(request('{"to":"someone@example.com"}'), {env,storeFactory:forbidden,fetchImpl:forbidden})).status,400);
});

test('owner verification uses one fixed recipient, sender/reply identity and durable idempotent job', async () => {
  let job, sent = false, calls = 0;
  const store = {async enqueue(key,kind,reference,mail){job ||= {key,kind,payload:mail,payload_hash:hash(mail)};},
    async claim(){return sent?undefined:job;}, async mailQuota(){return true;}, async markAttempt(){},
    async finish(_job,status){sent = status==='sent';}};
  const fetchImpl = async (url,options) => {
    calls++; const mail=JSON.parse(options.body);
    assert.equal(url,'https://api.resend.com/emails'); assert.equal(options.redirect,'error');
    assert.deepEqual(mail.to,['hello@localjagoff.com']); assert.equal(mail.reply_to,'hello@localjagoff.com');
    assert.match(mail.from,/<orders@localjagoff.com>/); assert.match(mail.text,/No real order, payment or fulfillment/);
    assert.equal(options.headers['idempotency-key'],job.key);
    return Response.json({id:'12345678-1234-1234-1234-123456789abc'});
  };
  assert.equal((await (await verify(request(),{env,storeFactory:()=>store,fetchImpl})).json()).outcome,'provider_accepted');
  assert.equal((await (await verify(request(),{env,storeFactory:()=>store,fetchImpl})).json()).outcome,'already_queued_or_completed');
  assert.equal(calls,1);
});

test('ambiguous or expired owner test sends cannot get a new idempotency identity', async () => {
  const mail=payload(), statuses=[];
  const job={key:'verification/owner-netlify-v1/review-fixture',payload:mail,payload_hash:hash(mail)};
  const store={async enqueue(){},async claim(){return job;},async mailQuota(){return true;},async markAttempt(){},
    async finish(_job,status){statuses.push(status);}};
  const res=await verify(request(),{env,storeFactory:()=>store,fetchImpl:async()=>{throw new Error('network');}});
  assert.equal(res.status,502);assert.deepEqual(statuses,['pending']);
  job.first_attempt_at=new Date(Date.now()-24*60*60*1000).toISOString();
  assert.equal((await verify(request(),{env,storeFactory:()=>store,fetchImpl:forbidden})).status,409);
  assert.equal(statuses.at(-1),'held');
});
