const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const policy = require('../lib/shipping-policy.cjs');

test('current Printful policy keeps production, transit and owner review separate', () => {
  assert.deepEqual(policy.PRINTFUL_US, { reviewMin: 0, reviewMax: 2, handlingMin: 2, handlingMax: 7, fulfillmentMin: 2, fulfillmentMax: 5,
    transitMin: 3, transitMax: 4, shippingAmount: 599 });
  assert.match(policy.CHECKOUT_DELIVERY, /reviewed and released within 2 business days/);
  assert.match(policy.CHECKOUT_DELIVERY, /2-5 business days production/);
  assert.match(policy.CHECKOUT_DELIVERY, /3-4 business days domestic US Standard transit/);
  assert.match(policy.CHECKOUT_DELIVERY, /2-7 business days combined handling/);
  assert.equal(policy.PRINTFUL_US.handlingMax, policy.PRINTFUL_US.reviewMax + policy.PRINTFUL_US.fulfillmentMax);
  assert.ok(policy.CHECKOUT_DELIVERY.length <= 1200);
  assert.doesNotMatch(JSON.stringify(policy), /Stuff N|3-5 business days handling/);
});

test('product, policy and cart consume the same delivery wording without a new blanket window', () => {
  for (const file of ['pages/product/[id].js', 'pages/terms.js', 'pages/cart.js', 'api/create-checkout-session.js']) {
    const source = readFileSync(join(__dirname, '..', file), 'utf8');
    assert.match(source, /shipping-policy\.cjs/);
  }
  assert.doesNotMatch(readFileSync(join(__dirname, '../api/create-checkout-session.js'), 'utf8'), /delivery_estimate/);
});
