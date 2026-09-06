const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Readable } = require("node:stream");
const commerce = require("../lib/commerce.cjs");
const { STORE_ID } = require("../lib/commerce-policy.cjs");
const { fulfillEvent, externalId } = require("../lib/fulfillment.cjs");

const item = { id: 430697388, variant_id: 123456, quantity: 2, price: "0.01" };
const detail = () => ({ sync_product: { id: item.id, name: "Raw tee", is_ignored: false,
  thumbnail_url: "https://example.test/product.jpg" }, sync_variants: [{ id: item.variant_id,
  sync_product_id: item.id, synced: true, is_ignored: false, availability_status: "active",
  currency: "USD", retail_price: "30.00", name: "Raw tee / XL" }] });
const response = (status, result) => ({ status, ok: status >= 200 && status < 300,
  json: async () => ({ code: status, result }) });
const quiet = { info() {}, error() {}, log() {} };

function checkoutFixture(product = detail(), status = 200) {
  const sessions = [];
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return response(status, product); };
  const sandbox = { module: { exports: {} }, process: { env: { PRINTFUL_API_KEY: "fixture" } }, console: quiet,
    require: (name) => {
      if (name === "stripe") return class { checkout = { sessions: {
        create: async (params) => { sessions.push(params); return { url: "https://checkout.test/session" }; },
      } }; };
      if (name.endsWith("commerce-policy.cjs")) return require("../lib/commerce-policy.cjs");
      return { ...commerce, resolveCart: (items, options) => commerce.resolveCart(items, { ...options, fetchImpl }) };
    } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../api/create-checkout-session.js"), "utf8"), sandbox);
  return { sessions, calls, env: sandbox.process.env, async run(items = [item], overrides = {}) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await sandbox.module.exports({ method: "POST", headers: { origin: "https://attacker.test" }, body: { items }, ...overrides }, res);
    return res;
  } };
}

test("actual checkout handler ignores altered client price/name and resolves authoritative variant retail price", async () => {
  for (const price of ["0.01", -100, "free", 999999, null, undefined]) {
    const f = checkoutFixture();
    const res = await f.run([{ ...item, price, name: "Injected product", variant_name: "Wrong size" }]);
    assert.equal(res.code, 200);
    const session = f.sessions[0];
    assert.equal(session.line_items[0].price_data.unit_amount, 3000);
    assert.equal(session.line_items[0].price_data.product_data.name, "Local Jagoff PGH OG Tee");
    assert.equal(session.line_items[0].quantity, 2);
    assert.equal(session.success_url, "https://www.localjagoff.com/success");
    assert.equal(session.shipping_options[0].shipping_rate_data.fixed_amount.amount, 599);
    assert.equal(session.allow_promotion_codes, true);
    assert.deepEqual(JSON.parse(session.metadata.items), [[item.id, item.variant_id, 2, 3000]]);
    assert.equal(session.metadata.commerce_version, "2");
    assert.match(f.calls[0], new RegExp(`/sync/products/${item.id}\\?store_id=${STORE_ID}$`));
  }
});

test("checkout rejects malformed product, variant and quantity without creating a session", async () => {
  for (const field of ["id", "variant_id", "quantity"]) {
    for (const value of [null, undefined, 0, -1, 1.5, "1x", true, {}, Number.MAX_SAFE_INTEGER + 1]) {
      const f = checkoutFixture();
      assert.equal((await f.run([{ ...item, [field]: value }])).code, 400, `${field}:${value}`);
      assert.equal(f.sessions.length, 0);
    }
  }
  for (const items of [[], null, {}, [{ ...item, quantity: 100 }], Array(101).fill(item)]) {
    assert.equal((await checkoutFixture().run(items)).code, 400);
  }
});

test("checkout rejects removed, hidden, ignored, unsynced, inactive and wrong-parent variants", async () => {
  const excluded = checkoutFixture();
  assert.equal((await excluded.run([{ ...item, id: 430925200 }])).code, 400);
  assert.equal(excluded.calls.length, 0);
  assert.equal((await checkoutFixture(null, 404).run()).code, 400);
  const mutations = [
    (p) => { p.sync_product.id = 99; },
    (p) => { p.sync_product.is_ignored = true; },
    (p) => { p.sync_variants[0].id = 99; },
    (p) => { p.sync_variants[0].sync_product_id = 99; },
    (p) => { p.sync_variants[0].is_ignored = true; },
    (p) => { p.sync_variants[0].synced = false; },
    ...["discontinued", "out_of_stock", "not_synced", undefined].map((state) =>
      (p) => { p.sync_variants[0].availability_status = state; }),
  ];
  for (const mutate of mutations) {
    const p = detail(); mutate(p);
    const f = checkoutFixture(p);
    assert.equal((await f.run()).code, 400);
    assert.equal(f.sessions.length, 0);
  }
});

test("upstream failures, non-USD, malformed prices and oversized metadata fail closed", async () => {
  assert.equal((await checkoutFixture(null, 500).run()).code, 503);
  assert.equal((await checkoutFixture(null, 200).run()).code, 503);
  for (const price of ["0.00", "", "1e2", "12.345", "NaN", null]) {
    const p = detail(); p.sync_variants[0].retail_price = price;
    assert.equal((await checkoutFixture(p).run()).code, 503);
  }
  const p = detail(); p.sync_variants[0].currency = "EUR";
  assert.equal((await checkoutFixture(p).run()).code, 503);
  const f = checkoutFixture();
  assert.equal((await f.run(Array(30).fill(item))).code, 400);
  assert.equal(f.sessions.length, 0);
  assert.equal(f.calls.length, 0);
  assert.equal(commerce.priceCents("30.10"), 3010);
});

function fulfillmentFixture() {
  const session = { id: "cs_live_fixture", livemode: true, mode: "payment", payment_status: "paid",
    currency: "usd", amount_subtotal: 6000, amount_total: 5999,
    total_details: { amount_discount: 600, amount_shipping: 599, amount_tax: 0 },
    metadata: { store_id: STORE_ID, commerce_version: "2", items: JSON.stringify([[item.id, item.variant_id, 2, 3000]]) },
    shipping_details: { name: "Test Recipient", address: { line1: "1 Test Street", line2: "Unit 2",
      city: "Pittsburgh", state: "PA", country: "US", postal_code: "15201" } },
    customer_details: { email: "customer@example.test", phone: "5550100", name: "Billing name",
      address: { line1: "Do not ship to billing" } } };
  const event = { id: "evt_fixture", type: "checkout.session.completed", livemode: true, data: { object: { id: session.id } } };
  const state = { orders: new Map(), posts: [], updates: [], logs: [], fetches: [], emails: 0, updateFailures: 0,
    postStatus: 200, getStatus: null, losePostResponse: false, lineAmount: 3000, lineQuantity: 2 };
  const fetchImpl = async (url, options) => {
    state.fetches.push({ url, method: options.method });
    if (url.includes("/sync/products/")) return response(200, detail());
    assert.match(url, /store_id=18032822/);
    if (options.method === "GET") {
      if (state.getStatus) return response(state.getStatus, null);
      const id = url.split("/orders/@")[1].split("?")[0];
      return response(state.orders.has(id) ? 200 : 404, state.orders.get(id));
    }
    assert.match(url, /confirm=false/);
    const payload = JSON.parse(options.body);
    assert.equal(payload.confirm, false);
    state.posts.push(payload);
    if (state.postStatus !== 200) return response(state.postStatus, null);
    if (state.orders.has(payload.external_id)) return response(400, null);
    const order = { ...payload, store: Number(STORE_ID), id: state.orders.size + 100, status: "draft" };
    state.orders.set(payload.external_id, order);
    if (state.losePostResponse) { state.losePostResponse = false; throw new Error("Simulated lost response"); }
    return response(200, order);
  };
  const stripe = { checkout: { sessions: {
    retrieve: async () => structuredClone(session),
    listLineItems: async () => ({ has_more: false, data: [{ price: { unit_amount: state.lineAmount },
      quantity: state.lineQuantity, currency: "usd", description: "Test tee", amount_total: 5400 }] }),
    update: async (id, update) => {
      assert.equal(id, session.id);
      if (state.updateFailures-- > 0) throw new Error("Persistence unavailable");
      state.updates.push(update); Object.assign(session.metadata, update.metadata);
    },
  } } };
  const env = { STRIPE_SECRET_KEY: "sk_live_fixture_NOT_A_KEY", PRINTFUL_API_KEY: "fixture", VERCEL_ENV: "production" };
  const options = { stripe, fetchImpl, env, logger: { info: (...v) => state.logs.push(v), error: (...v) => state.logs.push(v) },
    sendEmail: async () => { state.emails++; return true; } };
  return { state, session, event, options, run: (e = event) => fulfillEvent(e, options) };
}

test("paid Stripe purchase creates exactly one draft with correct recipient, quantities and retail amounts", async () => {
  const f = fulfillmentFixture();
  await f.run();
  assert.equal(f.state.orders.size, 1);
  const order = f.state.posts[0];
  assert.deepEqual(order.items, [{ sync_variant_id: item.variant_id, quantity: 2, retail_price: "30.00" }]);
  assert.deepEqual(order.recipient, { name: "Test Recipient", address1: "1 Test Street", address2: "Unit 2",
    city: "Pittsburgh", state_code: "PA", country_code: "US", zip: "15201", email: "customer@example.test", phone: "5550100" });
  assert.deepEqual(order.retail_costs, { currency: "USD", subtotal: "60.00", discount: "6.00", shipping: "5.99", tax: "0.00" });
  assert.equal(f.session.metadata.printful_order_id, "100");
  assert.equal(f.session.metadata.printful_external_id, externalId(f.session.id));
  assert.equal(f.session.metadata.fulfillment_state, "order_linked");
  assert.equal(f.session.metadata.order_email_sent, "true");
  assert.doesNotMatch(JSON.stringify(f.state.logs), /Test Street|customer@example|5550100/);
});

test("duplicate and separately generated completion events reuse one draft", async () => {
  const f = fulfillmentFixture();
  await f.run(); await f.run(); await f.run({ ...f.event, id: "evt_second" });
  assert.equal(f.state.orders.size, 1); assert.equal(f.state.posts.length, 1); assert.equal(f.state.emails, 1);
});

test("concurrent deliveries and lost create responses converge on the unique external ID", async () => {
  const f = fulfillmentFixture();
  f.state.losePostResponse = true;
  await Promise.all([f.run(), f.run({ ...f.event, id: "evt_concurrent" })]);
  assert.equal(f.state.orders.size, 1);
  assert.equal(f.session.metadata.printful_order_id, "100");
});

test("Printful failure is recorded, thrown for webhook retry, and recoverable", async () => {
  const f = fulfillmentFixture(); f.state.postStatus = 500;
  await assert.rejects(f.run(), /retry required/);
  assert.equal(f.state.orders.size, 0);
  assert.equal(f.session.metadata.fulfillment_state, "needs_retry_or_review");
  f.state.postStatus = 200; await f.run();
  assert.equal(f.state.orders.size, 1);
  assert.equal(f.session.metadata.fulfillment_error, "");
});

test("lookup failures do not trigger a blind create", async () => {
  const f = fulfillmentFixture(); f.state.getStatus = 429;
  await assert.rejects(f.run()); assert.equal(f.state.posts.length, 0);
});

test("Stripe persistence failure after draft creation retries without a second draft", async () => {
  const f = fulfillmentFixture(); f.state.updateFailures = 1;
  await assert.rejects(f.run()); await f.run();
  assert.equal(f.state.posts.length, 1); assert.equal(f.state.orders.size, 1);
});

test("existing owner-confirmed/canceled orders are never altered; missing linked order requires review", async () => {
  const f = fulfillmentFixture(); await f.run();
  f.state.orders.get(externalId(f.session.id)).status = "pending";
  await f.run(); assert.equal(f.state.posts.length, 1);
  f.state.orders.get(externalId(f.session.id)).status = "canceled";
  await f.run(); assert.equal(f.state.posts.length, 1);
  f.state.orders.clear(); await assert.rejects(f.run()); assert.equal(f.state.posts.length, 1);
});

test("modern shipping schema works; missing shipping never silently uses billing", async () => {
  const f = fulfillmentFixture();
  f.session.collected_information = { shipping_details: f.session.shipping_details };
  delete f.session.shipping_details; await f.run();
  const bad = fulfillmentFixture(); delete bad.session.shipping_details;
  await assert.rejects(bad.run()); assert.equal(bad.state.posts.length, 0);
});

test("test mode, unrelated and unpaid events cannot create drafts", async () => {
  for (const mutate of [(f) => { f.event.livemode = false; }, (f) => { f.event.type = "other"; },
    (f) => { f.session.payment_status = "unpaid"; }]) {
    const f = fulfillmentFixture(); mutate(f); assert.ok((await f.run()).skipped); assert.equal(f.state.fetches.length, 0);
  }
});

test("mismatched store, preview/live credentials and malformed paid metadata fail closed", async () => {
  const mutations = [(f) => { f.session.metadata.store_id = "other"; },
    (f) => { f.options.env.VERCEL_ENV = "preview"; },
    (f) => { f.options.env.STRIPE_SECRET_KEY = "sk_test_fixture"; },
    (f) => { f.session.metadata.items = "garbage"; },
    (f) => { f.session.metadata.items = JSON.stringify([[item.id, item.variant_id, 0, 3000]]); },
    (f) => { f.session.metadata.commerce_version = "future"; },
    (f) => { f.state.lineAmount = 1; }, (f) => { f.state.lineQuantity = 1; },
    (f) => { f.session.amount_total = 1; }];
  for (const mutate of mutations) {
    const f = fulfillmentFixture(); mutate(f); await assert.rejects(f.run()); assert.equal(f.state.posts.length, 0);
  }
});

test("legacy sessions reconcile with current server price and hold underpriced purchases", async () => {
  for (const amount of [3000, 1]) {
    const f = fulfillmentFixture(); delete f.session.metadata.commerce_version;
    f.session.metadata.items = JSON.stringify([{ product_id: item.id, sync_variant_id: item.variant_id, quantity: 2 }]);
    f.state.lineAmount = amount;
    if (amount === 3000) { await f.run(); assert.equal(f.state.orders.size, 1); }
    else { await assert.rejects(f.run()); assert.equal(f.state.posts.length, 0); }
  }
});

test("checkout metadata flows through a simulated paid session to a single draft without trusting cart price", async () => {
  const checkout = checkoutFixture();
  await checkout.run([{ ...item, price: "0.01" }]);
  const params = checkout.sessions[0];
  const f = fulfillmentFixture();
  f.session.metadata = structuredClone(params.metadata);
  f.session.amount_subtotal = params.line_items.reduce((sum, i) => sum + i.price_data.unit_amount * i.quantity, 0);
  f.state.lineAmount = params.line_items[0].price_data.unit_amount;
  await f.run(); await f.run({ ...f.event, type: "checkout.session.async_payment_succeeded", id: "evt_later" });
  assert.equal(f.state.orders.size, 1);
  assert.equal(f.state.posts[0].items[0].retail_price, "30.00");
  assert.equal(f.state.posts[0].confirm, false);
});

test("upstream transport/JSON failures and external-ID identity mismatches fail closed", async () => {
  for (const fetchImpl of [async () => { throw new Error("Timeout"); },
    async () => ({ status: 200, ok: true, json: async () => { throw new Error("Bad JSON"); } })]) {
    await assert.rejects(commerce.resolveCart([item], { apiKey: "fixture", fetchImpl }), /Printful/);
  }
  const f = fulfillmentFixture();
  f.state.orders.set(externalId(f.session.id), { id: 999, external_id: "wrong", store: Number(STORE_ID), status: "draft" });
  await assert.rejects(f.run()); assert.equal(f.state.posts.length, 0);
});

test("optional email failure does not undo or duplicate a paid draft", async () => {
  const f = fulfillmentFixture(); f.options.sendEmail = async () => { throw new Error("Email unavailable"); };
  await f.run(); await f.run(); assert.equal(f.state.posts.length, 1);
  assert.ok(f.state.logs.some((log) => log[0] === "order_email_failed"));
});

test("actual webhook route verifies raw signatures and rejects altered bodies without provider calls", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_local_fixture";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
  const Stripe = require("stripe");
  const { default: handler, config } = await import("../api/webhook.js");
  assert.equal(config.api.bodyParser, false);
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", livemode: false,
    data: { object: { id: "cs_test_fixture" } } });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  for (const [body, signature, status] of [[payload, header, 200], [payload + " ", header, 400], [payload, "bad", 400]]) {
    const req = Readable.from([Buffer.from(body)]); req.method = "POST"; req.headers = { "stripe-signature": signature };
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; }, send(body) { this.body = body; } };
    await handler(req, res); assert.equal(res.code, status);
    if (status === 200) assert.equal(res.body.skipped, "test_mode_no_printful");
  }
});

test("all retired public diagnostics return no provider or customer data", async () => {
  for (const name of ["get-order", "get-stores", "get-product"]) {
  const { default: handler } = await import(`../api/${name}.js`);
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await handler({}, res);
  assert.equal(res.code, 404); assert.deepEqual(res.body, { error: "Not found" });
  assert.equal(res.headers["Cache-Control"], "no-store");
  }
});

test("linked legacy replay survives catalog outage and missing historical shipping", async () => {
  const f = fulfillmentFixture();
  await f.run();
  delete f.session.metadata.commerce_version;
  f.session.metadata.items = JSON.stringify([{ product_id: item.id, sync_variant_id: item.variant_id, quantity: 2 }]);
  delete f.session.shipping_details;
  const originalFetch = f.options.fetchImpl;
  f.options.fetchImpl = async (url, options) => {
    assert.ok(!url.includes("/sync/products/"), "linked replay must not reprice the catalog");
    return originalFetch(url, options);
  };
  await f.run();
  assert.equal(f.state.posts.length, 1);
  assert.equal(f.state.logs.at(-1)[1].outcome, "duplicate_suppressed");
});

test("a conflicting persisted provider ID fails closed", async () => {
  const f = fulfillmentFixture();
  await f.run();
  f.session.metadata.printful_order_id = "999";
  await assert.rejects(f.run());
  assert.equal(f.state.posts.length, 1);
});

test("structured recovery logs include IDs, state and distinct outcomes, without PII", async () => {
  const f = fulfillmentFixture(); f.state.losePostResponse = true;
  await f.run(); await f.run();
  assert.deepEqual(f.state.logs.filter(l => l[0] === "fulfillment_order_linked").map(l => l[1].outcome),
    ["create_response_recovered", "duplicate_suppressed"]);
  for (const [, log] of f.state.logs) {
    assert.equal(log.event_id, f.event.id);
    assert.equal(log.session_id, f.session.id);
    assert.equal(log.external_id, externalId(f.session.id));
    assert.equal(log.printful_order_id, 100);
    assert.equal(log.fulfillment_state, "order_linked");
  }
  assert.doesNotMatch(JSON.stringify(f.state.logs), /Test Street|customer@example|5550100/);
});

test("checkout pause rejects before any provider access", async () => {
  const f = checkoutFixture(); f.env.CHECKOUT_PAUSED = "true";
  assert.equal((await f.run()).code, 503);
  assert.equal(f.calls.length, 0); assert.equal(f.sessions.length, 0);
});

test("signed paid fixture traverses the actual webhook route with simulated providers, retry and replay", async () => {
  const Stripe = require("stripe");
  const { createWebhookHandler } = await import("../api/webhook.js");
  const f = fulfillmentFixture();
  f.options.stripe.webhooks = Stripe.webhooks;
  f.options.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
  const handler = createWebhookHandler(f.options);
  const body = JSON.stringify(f.event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: f.options.env.STRIPE_WEBHOOK_SECRET });
  const deliver = async () => {
    const req = Readable.from([Buffer.from(body)]); req.method = "POST"; req.headers = { "stripe-signature": signature };
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; }, send() {} };
    await handler(req, res); return res;
  };
  f.state.postStatus = 500;
  assert.equal((await deliver()).code, 500);
  f.state.postStatus = 200; f.state.losePostResponse = true;
  assert.equal((await deliver()).code, 200);
  assert.equal((await deliver()).code, 200);
  assert.equal(f.state.orders.size, 1);
  assert.equal(f.session.metadata.fulfillment_state, "order_linked");
});

test("live checkout is blocked in previews; server-controlled test return origins remain available", () => {
  assert.throws(() => commerce.assertCheckoutEnvironment({ VERCEL_ENV: "preview", STRIPE_SECRET_KEY: "sk_live_fixture" }));
  assert.doesNotThrow(() => commerce.assertCheckoutEnvironment({ VERCEL_ENV: "production", STRIPE_SECRET_KEY: "sk_live_fixture" }));
  assert.doesNotThrow(() => commerce.assertCheckoutEnvironment({ VERCEL_ENV: "preview", STRIPE_SECRET_KEY: "sk_test_fixture" }));
  assert.equal(commerce.siteOrigin({ SITE_URL: "http://localhost:3000/cart" }), "http://localhost:3000");
  assert.throws(() => commerce.siteOrigin({ SITE_URL: "http://attacker.test" }));
});

test("public catalog preserves curated name, exclusion and retail price", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async url => url.includes("/sync/products?")
      ? response(200, [{ id: item.id, name: "Raw tee" }, { id: 430925200, name: "Hidden" }])
      : response(200, detail());
    const { default: handler } = await import("../api/get-products.js");
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({}, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].name, "Local Jagoff PGH OG Tee");
    assert.equal(res.body[0].retail_price, "30.00");
    assert.deepEqual(res.body[0].variants, [{ id: item.variant_id, name: "XL", price: "30.00" }]);
  } finally { global.fetch = originalFetch; }
});

test("public catalog failures do not expose upstream exception content", async () => {
  const originalFetch = global.fetch;
  const originalError = console.error;
  const logs = [];
  try {
    console.error = (...args) => logs.push(args);
    global.fetch = async () => { throw new Error("PRIVATE_PROVIDER_DETAIL"); };
    const { default: handler } = await import("../api/get-products.js");
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({}, res);
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { error: "Failed to load products" });
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_PROVIDER_DETAIL/);
  } finally { global.fetch = originalFetch; console.error = originalError; }
});
