const { createHmac, timingSafeEqual, createHash } = require('node:crypto');
const Stripe = require('stripe');
const { isProduction } = require('./deployment.cjs');
const { STORE_ID } = require('./commerce-policy.cjs');
const { siteOrigin, validateItems } = require('./commerce.cjs');
const COOKIE = '__Secure-lj-checkout-receipt';
const MAX_AGE = 86400;
const CLEAR_COOKIE = `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api/checkout-receipt; Max-Age=0`;
function signature(payload, env) {
  return createHmac('sha256', env.STRIPE_SECRET_KEY).update(`localjagoff-receipt-v1:${payload}`).digest('hex');
}
function receiptCookie(id, env, now = Date.now()) {
  if (!isProduction(env) || !/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '') ||
      !/^cs_live_[a-zA-Z0-9]{10,200}$/.test(id || '')) return null;
  const payload = `${id}.${Math.floor(now / 1000)}`;
  return `${COOKIE}=${payload}.${signature(payload, env)}; HttpOnly; Secure; SameSite=Lax; Path=/api/checkout-receipt; Max-Age=${MAX_AGE}`;
}
function sessionFromCookie(header, env, now) {
  const values = String(header || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${COOKIE}=`));
  if (values.length !== 1) return null;
  const match = values[0].slice(COOKIE.length + 1).match(/^(cs_live_[a-zA-Z0-9]{10,200})\.(\d{10})\.([a-f0-9]{64})$/);
  if (!match) return null;
  const [, id, created, mac] = match, age = Math.floor(now / 1000) - Number(created);
  if (age < 0 || age > MAX_AGE || !timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(`${id}.${created}`, env), 'hex'))) return null;
  return id;
}
function paidReceipt(session, id) {
  if (session?.id !== id || session.livemode !== true || session.mode !== 'payment' ||
      session.status !== 'complete' || session.payment_status !== 'paid' || session.currency !== 'usd' ||
      session.metadata?.store_id !== STORE_ID || session.metadata?.commerce_version !== '2' ||
      !Number.isSafeInteger(session.amount_total) || session.amount_total < 1) return null;
  let rows;
  try { rows = JSON.parse(session.metadata.items); } catch { return null; }
  if (!Array.isArray(rows) || !rows.every(row => Array.isArray(row) && row.length === 4 &&
      Number.isSafeInteger(row[3]) && row[3] > 0)) return null;
  let items;
  try { items = validateItems(rows.map(([id, variant_id, quantity]) => ({ id, variant_id, quantity })))
    .map((item, index) => ({ ...item, unit_amount: rows[index][3] })); } catch { return null; }
  const subtotal = items.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || session.amount_subtotal !== subtotal) return null;
  return { paid: true, event_id: `lj_purchase_${createHash('sha256').update(id).digest('hex')}`,
    amount_total: session.amount_total, currency: 'USD', items };
}
function createReceiptHandler({ env = process.env, now = Date.now,
  stripeFactory = key => new Stripe(key, { timeout: 10000, maxNetworkRetries: 0, httpClient: Stripe.createFetchHttpClient() }) } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isProduction(env) || !/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '')) return res.status(404).json({ paid: false });
    if (req.headers?.origin !== siteOrigin(env) || (req.headers?.['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) return res.status(403).json({ paid: false });
    const id = sessionFromCookie(req.headers?.cookie, env, now());
    if (!id) return res.status(200).json({ paid: false });
    try {
      // Verification only: no Printful, email, state mutation, or payment creation.
      const session = await stripeFactory(env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(id);
      return res.status(200).json(paidReceipt(session, id) || { paid: false });
    } catch { return res.status(503).json({ paid: false }); }
  };
}
module.exports = { COOKIE, CLEAR_COOKIE, receiptCookie, sessionFromCookie, paidReceipt, createReceiptHandler };
