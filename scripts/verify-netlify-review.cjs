const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createStore} = require('../lib/communications-store.cjs');
const {rateKey} = require('../lib/contact-security.cjs');
const {STORE_ID} = require('../lib/commerce-policy.cjs');

async function main() {
  const env = process.env;
  if (env.COMMUNICATIONS_TEST_DATABASE !== 'true' || env.COMMERCE_ENV !== 'preview') throw new Error('review_guard');
  const origin = new URL(env.COMMUNICATIONS_PREVIEW_ORIGIN).origin;
  if (!/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) throw new Error('review_origin_guard');
  const store = createStore(env), ids = [], run = crypto.randomUUID();
  const request = async (path, {method = 'GET', body, headers = {}} = {}) => {
    const res = await fetch(origin + path, {method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30000)});
    const text = await res.text();
    let json; try {json = JSON.parse(text);} catch {}
    return {status: res.status, json, text};
  };
  const post = body => ({method: 'POST', headers: {'content-type': 'application/json', origin}, body: JSON.stringify(body)});
  const count = async () => (await store.query('SELECT (SELECT count(*) FROM comm_orders) AS orders,(SELECT count(*) FROM comm_outbox) AS outbox'))[0];
  const before = await count();
  try {
    const contactPage = await request('/contact');
    assert.equal(contactPage.status, 200);
    const assets = [...contactPage.text.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+)"/g)]
      .map(match => match[1]).filter(path => path.startsWith('/_next/static/'));
    assert.ok(assets.some(path => path.endsWith('.css')));
    assert.ok(assets.some(path => path.endsWith('.js')));
    for (const path of new Set(['/images/icon.png', ...assets])) assert.equal((await request(path)).status, 200);
    for (const path of ['/server/pages/api/webhook.js', '/required-server-files.json', '/trace']) assert.equal((await request(path)).status, 404);
    console.log('PASS: public CSS/JS/image references200; server build artifacts404.');
    const paused = await request('/api/create-checkout-session', post({items: [{id: 430964873, variant_id: 5292830954, quantity: 1, price: 0.01}]}));
    assert.equal(paused.status, 503); assert.equal(paused.json.error, 'Checkout temporarily paused');
    const invalid = await request('/api/webhook', {...post({id: 'evt_netlify_invalid_' + run, type: 'checkout.session.completed', livemode: false, data: {object: {id: 'cs_test_invalid_' + run, payment_status: 'paid'}}}), headers: {'content-type': 'application/json', 'stripe-signature': `t=${Math.floor(Date.now()/1000)},v1=${'0'.repeat(64)}`}});
    assert.equal(invalid.status, 400); assert.equal(invalid.text, 'Invalid webhook signature');
    assert.deepEqual(await count(), before);
    console.log('PASS: restored deployed checkout pause503 and invalid Stripe signature400; order/outbox counts unchanged.');

    const forms = [];
    for (let i = 0; i < 4; i++) {
      const challenge = await request('/api/contact');
      assert.equal(challenge.status, 200); assert.equal(challenge.json.preview, true);
      const requestId = crypto.randomUUID(); ids.push(requestId);
      forms.push({requestId, challenge: challenge.json.challenge, name: 'Netlify synthetic verification', email: `netlify-${run}-${i}@example.com`, topic: 'other', message: 'Synthetic isolated review only. Do not send email.', website: ''});
    }
    await new Promise(resolve => setTimeout(resolve, 2200));
    // Rotating client-supplied forwarding headers must not bypass the host connection-IP limit.
    for (let i = 0; i < 4; i++) {
      const options = post(forms[i]);
      options.headers['x-forwarded-for'] = `192.0.2.${10+i}`;
      options.headers['x-nf-client-connection-ip'] = `198.51.100.${10+i}`;
      assert.equal((await request('/api/contact', options)).status, i < 3 ? 202 : 429);
    }
    assert.equal((await request('/api/contact', post(forms[0]))).status, 202);
    assert.equal((await request('/api/contact', {...post(forms[3]), headers: {'content-type': 'application/json', origin: 'https://invalid.example.com'}})).status, 403);
    const jobs = await store.query('SELECT status,attempts,provider_id FROM comm_outbox WHERE key=ANY($1::text[])', [ids.map(id => 'contact/' + id)]);
    assert.equal(jobs.length, 3); assert.ok(jobs.every(job => job.status === 'pending' && job.attempts === 0 && !job.provider_id));
    const spoofBuckets = Array.from({length:4}, (_, i) => 'contact-ip:' + rateKey(`198.51.100.${10+i}`, env.COMMUNICATIONS_SECRET));
    assert.equal((await store.query('SELECT bucket FROM comm_rate WHERE bucket=ANY($1::text[])', [spoofBuckets])).length, 0);
    console.log('PASS: contact202/duplicate202/rate429/CSRF403, three durable unsent jobs; spoofed forwarding headers cannot rotate the rate-limit identity.');

    const event = {type: 'shipment_sent', store_id: Number(STORE_ID), occurred_at: new Date().toISOString(), data: {order: {id: 123, store_id: Number(STORE_ID), external_id: 'LJ' + 'a'.repeat(24)}, shipment: {id: 456}}};
    const raw = JSON.stringify(event), signature = crypto.createHmac('sha256', Buffer.from(env.PRINTFUL_WEBHOOK_SECRET, 'hex')).update(raw).digest('hex');
    const headers = {'content-type': 'application/json', 'x-pf-webhook-public-key': env.PRINTFUL_WEBHOOK_PUBLIC_KEY, 'x-pf-webhook-signature': signature};
    const valid = await request('/api/printful-events', {method: 'POST', headers, body: raw});
    assert.equal(valid.status, 200); assert.equal(valid.json.outcome, 'preview_no_provider_or_email');
    assert.equal((await request('/api/printful-events', {method: 'POST', headers, body: raw + ' '})).status, 400);
    console.log('PASS: synthetic Printful signature200; altered raw bytes400; preview provider/email exclusion. Not genuine Printful delivery evidence.');

    assert.equal((await request('/api/communications/run')).status, 401);
    assert.equal((await request('/api/communications/run', {headers: {authorization: 'Bearer ' + env.CRON_SECRET}})).status, 409);
    assert.equal((await request('/.netlify/functions/communications-worker', {method: 'POST'})).status, 202);
    const reviews = await request('/api/reviews?productId=430964873');
    assert.equal(reviews.status, 200); assert.deepEqual(reviews.json.reviews, []);
    console.log('PASS: public runner401; authenticated sync runner409; native worker202 is transport-only, verify unauthorized rejection separately in logs; reviews200 without fabricated content.');
  } finally {
    await store.sql.transaction([
      store.sql.query('DELETE FROM comm_outbox WHERE key=ANY($1::text[])', [ids.map(id => 'contact/' + id)]),
      store.sql.query('DELETE FROM comm_contact_requests WHERE id=ANY($1::uuid[])', [ids]),
    ], {fetchOptions: {signal: AbortSignal.timeout(15000)}});
  }
  assert.deepEqual(await count(), before);
  console.log('PASS: only this run\'s synthetic contact/outbox fixtures removed; no order or email send created.');
}
main().catch(() => {console.error('Netlify review verification failed; investigate sanitized assertions only.'); process.exitCode = 1;});
