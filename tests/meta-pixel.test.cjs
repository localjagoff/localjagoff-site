const { test } = require('node:test');
const assert = require('node:assert/strict');
const pixel = require('../lib/meta-pixel.cjs');
const receipt = require('../lib/checkout-receipt.cjs');
const { STORE_ID } = require('../lib/commerce-policy.cjs');
const item = { id: 430697388, variant_id: 123456, quantity: 2, unit_amount: 3000 };
const now = Date.UTC(2026, 8, 12), id = 'cs_live_OnlyALocalFixture123456';
const env = { VERCEL_ENV: 'production', SITE_URL: 'https://www.localjagoff.com', STRIPE_SECRET_KEY: 'sk_live_not_a_real_key_fixture' };
function browser(path = '/') {
  const storage = new Map(), scripts = [], events = [], cookies = [];
  const win = { location: new URL(`https://www.localjagoff.com${path}`), navigator: {}, Event: class { constructor(type) { this.type = type; } },
    dispatchEvent: e => events.push(e.type), localStorage: { getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value) },
    document: { createElement: () => ({ setAttribute() {} }), head: { appendChild: script => scripts.push(script) }, set cookie(value) { cookies.push(value); } } };
  const tracker = pixel.createTracker(win);
  return { win, tracker, storage, scripts, events, cookies, calls: () => win.fbq?.queue.filter(args => args[0] === 'trackSingle').map(args => Array.from(args)) || [] };
}
test('production domain and explicit public routes only; no private tokens or arbitrary URL data', () => {
  for (const path of ['/', '/product/123', '/product/123?variant=45', '/cart', '/success', '/privacy']) assert.equal(pixel.eligibleLocation(new URL(env.SITE_URL + path)), true, path);
  for (const path of ['/review?token=private', '/admin/reviews', '/contact', '/checkout?cart=private', '/?email=private', '/success?session_id=secret', '/#private']) assert.equal(pixel.eligibleLocation(new URL(env.SITE_URL + path)), false, path);
  assert.equal(pixel.eligibleLocation(new URL('https://review.workers.dev/')), false);
});
test('no third-party load before consent, after decline, or with GPC/DNT', () => {
  for (const signal of [null, 'globalPrivacyControl', 'doNotTrack']) {
    const b = browser(); if (signal) b.win.navigator[signal] = signal === 'doNotTrack' ? '1' : true;
    b.tracker.refresh(); b.tracker.addToCart([item]); assert.equal(b.scripts.length, 0);
    b.tracker.setChoice('denied'); assert.equal(b.scripts.length, 0);
    if (signal) { b.tracker.setChoice('granted'); assert.equal(b.scripts.length, 0); }
  }
});
test('one correctly owned Pixel, no automatic matching, route and product deduplication', () => {
  const b = browser(`/product/${item.id}`);
  b.tracker.observeProduct(item); b.tracker.setChoice('granted'); b.tracker.refresh(); b.tracker.observeProduct(item);
  assert.equal(b.scripts.length, 1); assert.equal(b.calls().length, 2);
  assert.deepEqual(b.calls().map(call => call[2]), ['PageView', 'ViewContent']);
  assert.ok(b.calls().every(call => call[1] === '2603757676747952'));
  const setup = b.win.fbq.queue.map(args => Array.from(args));
  assert.ok(setup.some(call => call[0] === 'set' && call[1] === 'autoConfig' && call[2] === false));
  assert.equal(setup.find(call => call[0] === 'init').length, 2);
  assert.equal(b.win.fbq.disablePushState, true);
});

test('SPA navigation has one manual PageView and only actual consent transitions', () => {
  const b = browser(); b.tracker.setChoice('granted');
  b.tracker.suspend(`/product/${item.id}`);
  b.win.location = new URL(env.SITE_URL + `/product/${item.id}`);
  b.tracker.observeProduct(item); b.tracker.refresh();
  assert.deepEqual(b.calls().map(call => call[2]), ['PageView', 'PageView', 'ViewContent']);
  const consentCalls = () => b.win.fbq.queue.filter(args => args[0] === 'consent').map(args => args[1]);
  assert.deepEqual(consentCalls(), ['grant']);
  b.tracker.suspend('/admin/reviews'); b.tracker.suspend('/contact');
  assert.deepEqual(consentCalls(), ['grant', 'revoke']);
  b.win.location = new URL(env.SITE_URL + '/contact'); b.tracker.refresh();
  assert.equal(b.calls().length, 3);
  b.win.location = new URL(env.SITE_URL + '/cart'); b.tracker.refresh();
  assert.deepEqual(consentCalls(), ['grant', 'revoke', 'grant']);
  assert.equal(b.calls().at(-1)[2], 'PageView');
});
test('variant IDs match catalog, values use supplied authoritative cents; malformed values rejected', () => {
  assert.deepEqual(pixel.productParameters([item]), { content_type: 'product', content_ids: ['lj_430697388_123456'], contents: [{ id: 'lj_430697388_123456', quantity: 2, item_price: 30 }], num_items: 2, currency: 'USD', value: 60 });
  for (const change of [{ quantity: 0 }, { quantity: 100 }, { unit_amount: -1 }, { id: 'private text' }, { variant_id: null }]) assert.equal(pixel.productParameters([{ ...item, ...change }]), null);
});
test('actual cart and checkout actions do not replay pre-consent; revocation suspends and clears Meta cookies', () => {
  const b = browser('/cart'); b.tracker.addToCart([item]); b.tracker.setChoice('granted');
  b.tracker.addToCart([item]); b.tracker.initiateCheckout([item]); b.tracker.setChoice('denied'); b.tracker.addToCart([item]);
  assert.deepEqual(b.calls().map(call => call[2]), ['PageView', 'AddToCart', 'InitiateCheckout']);
  assert.equal(b.cookies.length, 6);
  b.win.location = new URL(env.SITE_URL + '/admin/reviews'); b.tracker.setChoice('granted'); assert.equal(b.calls().length, 3);
});
test('unexpected prior Pixel never receives this store events', () => {
  const b = browser(); b.win.fbq = () => { throw Error('must not reuse'); };
  b.tracker.setChoice('granted'); assert.equal(b.scripts.length, 0);
});
test('private query-bearing referrer cannot leak through Meta automatic referrer collection', () => {
  for (const referrer of [env.SITE_URL + '/review?token=private', 'https://mail.example/?private=value', env.SITE_URL + '/admin/reviews#private']) {
    const b = browser(); b.win.document.referrer = referrer;
    b.tracker.setChoice('granted'); b.tracker.addToCart([item]);
    assert.equal(b.scripts.length, 0); assert.equal(b.calls().length, 0);
  }
  const b = browser(); b.win.document.referrer = 'https://checkout.stripe.com/';
  b.tracker.setChoice('granted'); assert.equal(b.scripts.length, 1);
});
function paid(changes = {}) { return { id, livemode: true, mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd',
  amount_subtotal: 6000, amount_total: 6599, metadata: { store_id: STORE_ID, commerce_version: '2', items: JSON.stringify([[item.id,item.variant_id,2,3000]]) }, ...changes }; }
test('signed HttpOnly receipt cookie: exact scope, expiry, tamper and duplicate rejection; no Preview/test cookie', () => {
  const cookie = receipt.receiptCookie(id, env, now);
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax; Path=\/api\/checkout-receipt; Max-Age=86400$/);
  assert.equal(receipt.sessionFromCookie(cookie.split(';')[0], env, now), id);
  assert.equal(receipt.sessionFromCookie(cookie.replace(id, id + '0'), env, now), null);
  assert.equal(receipt.sessionFromCookie(cookie, env, now + 86401000), null);
  assert.equal(receipt.sessionFromCookie(cookie + ';' + cookie, env, now), null);
  assert.equal(receipt.receiptCookie(id, { ...env, VERCEL_ENV: 'preview' }, now), null);
  assert.equal(receipt.receiptCookie('cs_test_OnlyALocalFixture123456', env, now), null);
});
test('Purchase requires actual paid, complete, live, exact store/v2 metadata and reconciled amount', () => {
  assert.equal(receipt.paidReceipt(paid(), id).amount_total, 6599);
  for (const change of [{ payment_status: 'unpaid' }, { status: 'open' }, { livemode: false }, { currency: 'eur' },
    { id: 'other' }, { mode: 'subscription' }, { amount_subtotal: 1 }, { amount_total: 0 },
    { metadata: { ...paid().metadata, store_id: 'other' } }, { metadata: { ...paid().metadata, items: 'malformed' } }]) {
    assert.equal(receipt.paidReceipt(paid(change), id), null);
  }
  const serialized = JSON.stringify(receipt.paidReceipt(paid({ customer_email: 'private', shipping_details: { name: 'private' } }), id));
  assert.equal(serialized.includes('private'), false); assert.equal(serialized.includes(id), false);
});
test('Purchase only on verified return; reload/replay deduplicates without a real transaction', () => {
  const b = browser('/success'); const r = receipt.paidReceipt(paid(), id);
  assert.equal(b.tracker.purchase(r), false); b.tracker.setChoice('granted');
  assert.equal(b.tracker.purchase({ paid: false }), false); assert.equal(b.tracker.purchase(r), true); assert.equal(b.tracker.purchase(r), false);
  assert.equal(pixel.createTracker(b.win).purchase(r), false);
  assert.equal(b.calls().filter(call => call[2] === 'Purchase').length, 1);
  assert.equal(b.calls().at(-1)[3].value, 65.99);
});
test('receipt endpoint fails closed before Stripe; valid cookie permits one read only and no email/Printful path', async () => {
  let reads = 0;
  const stripeFactory = () => ({ checkout: { sessions: { retrieve: async session => { reads++; assert.equal(session,id); return paid(); } } } });
  async function run(headers = {}, options = {}) {
    const res = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(v) { this.code=v; return this; }, json(v) { this.body=v; return this; } };
    await receipt.createReceiptHandler({ env, now:()=>now, stripeFactory, ...options })({ method:'POST', headers },res); return res;
  }
  assert.equal((await run({origin:'https://attacker.test'})).code,403);
  assert.equal((await run({origin:env.SITE_URL})).body.paid,false); assert.equal(reads,0);
  const headers = { origin:env.SITE_URL, cookie:receipt.receiptCookie(id,env,now).split(';')[0] };
  assert.equal((await run(headers,{env:{...env,VERCEL_ENV:'preview'}})).code,404); assert.equal(reads,0);
  const result = await run(headers); assert.equal(result.body.paid,true); assert.equal(reads,1); assert.match(result.headers['Cache-Control'],/no-store/);
  assert.equal((await run(headers,{stripeFactory:()=>({checkout:{sessions:{retrieve:async()=>{throw Error('private');}}}})})).code,503);
});
