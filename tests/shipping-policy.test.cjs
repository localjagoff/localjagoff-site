const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const policy = require('../lib/shipping-policy.cjs');

test('current Printful policy keeps production, transit and owner review separate', () => {
  assert.deepEqual(policy.PRINTFUL_US, { reviewMin: 0, reviewMax: 2, handlingMin: 2, handlingMax: 7, fulfillmentMin: 2, fulfillmentMax: 5,
    transitMin: 3, transitMax: 4 });
  assert.match(policy.CHECKOUT_DELIVERY, /reviewed and released within 2 business days/);
  assert.match(policy.CHECKOUT_DELIVERY, /2-5 business days production/);
  assert.match(policy.CHECKOUT_DELIVERY, /3-4 business days domestic US Standard transit/);
  assert.match(policy.CHECKOUT_DELIVERY, /2-7 business days combined handling/);
  assert.equal(policy.PRINTFUL_US.handlingMax, policy.PRINTFUL_US.reviewMax + policy.PRINTFUL_US.fulfillmentMax);
  assert.ok(policy.CHECKOUT_DELIVERY.length <= 1200);
  assert.doesNotMatch(JSON.stringify(policy), /Stuff N|3-5 business days handling/);
});

const tee = (quantity = 1) => ({ id: 471744647, quantity });
const hoodie = (quantity = 1) => ({ id: 475168585, quantity });
const hat = (quantity = 1) => ({ id: 428980566, quantity });
test('US Standard rates match the current category table without markup', () => {
  for (const [count, cents] of [[1,495],[2,715],[3,935],[5,1375],[10,2475]]) {
    assert.equal(policy.standardShippingCents([tee(count)]), cents);
  }
  for (const [cart, cents] of [
    [[hoodie()],879], [[hoodie(2)],1129], [[hat()],469], [[hat(2)],669],
    [[tee(),hoodie()],1099], [[tee(),hat()],964], [[hoodie(),hat()],1348],
    [[tee(2),hoodie()],1319], [[tee(4),hoodie()],1759],
    [[tee(2),hoodie(2),hat(2)],2238],
  ]) {
    assert.equal(policy.standardShippingCents(cart), cents);
    assert.equal(policy.standardShippingCents([...cart].reverse()), cents);
  }
  assert.equal(policy.standardShippingCents([tee(),tee()]), policy.standardShippingCents([tee(2)]));
  assert.equal(policy.standardShippingCents([{...tee(),price:0.01,category:'hats',shipping:0}]),495);
});

test('every currently authorized product has an explicit shipping route; unknown fulfillment fails closed', () => {
  const { APPROVED_PRODUCT_IDS } = require('../lib/commerce-policy.cjs');
  assert.deepEqual(Object.keys(policy.SHIPPING_PRODUCTS).map(Number).sort(), [...APPROVED_PRODUCT_IDS].sort());
  assert.equal(policy.standardShippingCents([]),0);
  for (const cart of [null,{},[{id:999999,quantity:1}], [tee(0)],[tee(-1)],[tee(1.5)],[tee(100)],Array(101).fill(tee())]) {
    assert.throws(()=>policy.standardShippingCents(cart),/Shipping unavailable/);
  }
  assert.doesNotMatch(policy.SHIPPING_CHARGE,/Printful|\$5\.99/i);
  assert.match(policy.SHIPPING_CHARGE,/\$60 or more, before promo discounts, tax and shipping/);
});

test('owner-approved free shipping includes the exact $60 boundary and all current categories', () => {
  for (const cart of [[tee()], [hoodie()], [hat()], [tee(),hat()]]) {
    assert.equal(policy.shippingQuote(cart,5999).amount,policy.standardShippingCents(cart));
    for (const subtotal of [6000,6001,12000]) {
      assert.deepEqual(policy.shippingQuote(cart,subtotal),{amount:0,eligible:true,remaining:0});
    }
  }
  assert.deepEqual(policy.shippingQuote([tee()],3000),{amount:495,eligible:false,remaining:3000});
  assert.deepEqual(policy.shippingQuote([],0),{amount:0,eligible:false,remaining:6000});
  for (const invalid of [undefined,NaN,Infinity,-1,1.5,'6000',0]) {
    assert.throws(()=>policy.shippingQuote([tee()],invalid),/unavailable/i);
  }
  assert.throws(()=>policy.shippingQuote([{id:999,quantity:1}],6000),/unavailable/i);
});

test('product, policy and cart consume the same delivery wording without a new blanket window', () => {
  for (const file of ['pages/product/[id].js', 'pages/terms.js', 'pages/cart.js', 'api/create-checkout-session.js']) {
    const source = readFileSync(join(__dirname, '..', file), 'utf8');
    assert.match(source, /shipping-policy\.cjs/);
  }
  assert.doesNotMatch(readFileSync(join(__dirname, '../api/create-checkout-session.js'), 'utf8'), /delivery_estimate/);
});

