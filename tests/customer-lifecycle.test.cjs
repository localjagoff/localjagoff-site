const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const lifecycle = require("../lib/customer-lifecycle.cjs");
const now = Date.parse("2026-09-20T12:00:00Z");
const snapshot = () => ({ payment: { paid: true, refunded: false, disputed: false },
  order: { status: "fulfilled", order_items: [{ id: 11, quantity: 2 }] },
  shipments: [{ id: 1, shipment_status: "shipped", delivery_status: "delivered", shipped_at: "2026-09-08T12:00:00Z", delivered_at: "2026-09-10T12:00:00Z", shipment_items: [{ order_item_id: 11, quantity: 2 }] }],
  allPagesLoaded: true, checkedAt: now });

test("Printful raw signature uses the decoded hexadecimal key", () => {
  const secret = Buffer.alloc(32, 7).toString("hex");
  const raw = Buffer.from('{"type":"shipment_sent"}');
  const env = { PRINTFUL_WEBHOOK_SECRET: secret, PRINTFUL_WEBHOOK_PUBLIC_KEY: "unit-test-public-key" };
  const headers = { "x-pf-webhook-public-key": env.PRINTFUL_WEBHOOK_PUBLIC_KEY,
    "x-pf-webhook-signature": crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(raw).digest("hex") };
  assert.equal(lifecycle.verifyPrintfulSignature(raw, headers, env), true);
  assert.equal(lifecycle.verifyPrintfulSignature(Buffer.from('{ "type":"shipment_sent"}'), headers, env), false);
  assert.equal(lifecycle.verifyPrintfulSignature(raw, {...headers, "x-pf-webhook-public-key": "wrong"}, env), false);
  assert.equal(lifecycle.verifyPrintfulSignature(raw, {...headers, "x-pf-webhook-signature": "x"}, env), false);
  assert.equal(lifecycle.verifyPrintfulSignature(Buffer.alloc(262145), headers, env), false);
});

test("Printful retries deduplicate independently of retry count and reject wrong-store/stale events", () => {
  const event = {type:"shipment_sent", occurred_at: new Date(now - 1000).toISOString(), retries:0, store_id:12,
    data:{order:{id:1,store_id:12,external_id:"LJ"+"a".repeat(24)},shipment:{id:2}}};
  assert.equal(lifecycle.printfulEventIdentity(event,12,now), lifecycle.printfulEventIdentity({...event,retries:8},12,now));
  assert.throws(() => lifecycle.printfulEventIdentity(event,13,now));
  assert.throws(() => lifecycle.printfulEventIdentity({...event,occurred_at:"2020-01-01T00:00:00Z"},12,now));
});

test("processing means actually in production, never draft/pending/failed", () => {
  assert.equal(lifecycle.isProcessing({status:"inprocess"}),true);
  for (const status of ["draft","pending","failed","inreview","onhold"]) assert.equal(lifecycle.isProcessing({status}),false);
});

test("review becomes due exactly seven days after actual whole-order delivery", () => {
  const state = snapshot();
  assert.deepEqual(lifecycle.reviewEligibility(state,now), {eligible:true, reason:"due",dueAt:"2026-09-17T12:00:00.000Z",method:"whole_order_delivered_plus_7_days"});
  const early = Date.parse("2026-09-17T11:59:59Z"); state.checkedAt = early;
  assert.equal(lifecycle.reviewEligibility(state,early).eligible,false);
});

test("split shipments wait for the final package, not the first", () => {
  const state = snapshot(); state.shipments[0].shipment_items[0].quantity=1;
  state.shipments.push({...structuredClone(state.shipments[0]),id:2,delivered_at:"2026-09-18T12:00:00Z"});
  const result=lifecycle.reviewEligibility(state,now);
  assert.equal(result.eligible,false); assert.equal(result.dueAt,"2026-09-25T12:00:00.000Z");
});

test("fallback waits through the latest ETA day in every timezone plus seven days", () => {
  const state = snapshot(); state.shipments[0].delivery_status="unknown"; state.shipments[0].delivered_at=null;
  state.shipments[0].estimated_delivery={from_date:"2026-09-09",to_date:"2026-09-12"};
  const result=lifecycle.reviewEligibility(state,now);
  assert.equal(result.eligible,true); assert.equal(result.dueAt,"2026-09-20T11:59:59.999Z");
  assert.equal(result.method,"latest_package_estimate_plus_7_days");
  const early = Date.parse("2026-09-20T11:59:59Z");
  state.checkedAt = early;
  assert.equal(lifecycle.reviewEligibility(state,early).eligible,false);
});

test("canceled, refunded, failed, held, unshipped and returned orders suppress review", () => {
  for (const status of ["draft","partial","failed","canceled","onhold","pending"]) {
    const state=snapshot();state.order.status=status;assert.equal(lifecycle.reviewEligibility(state,now).eligible,false,status);
  }
  for (const change of [{paid:false},{refunded:true},{disputed:true},{refunded:undefined}]) {
    const state=snapshot();Object.assign(state.payment,change);assert.equal(lifecycle.reviewEligibility(state,now).eligible,false);
  }
  for (const change of [{knownReturned:true},{unresolved:true},{reviewSent:true},{optedOut:true}]) assert.equal(lifecycle.reviewEligibility({...snapshot(),...change},now).eligible,false);
});

test("late missing pages, missing units and duplicate shipments cannot imply whole-order delivery", () => {
  let state=snapshot();state.allPagesLoaded=false;assert.equal(lifecycle.reviewEligibility(state,now).eligible,false);
  state=snapshot();state.shipments[0].shipment_items[0].quantity=1;assert.equal(lifecycle.reviewEligibility(state,now).eligible,false);
  state=snapshot();state.shipments.push(structuredClone(state.shipments[0]));assert.equal(lifecycle.reviewEligibility(state,now).eligible,false);
});

test("stale payment/fulfillment checks require re-reconciliation before review", () => {
  const state=snapshot();state.checkedAt=now-60001;assert.equal(lifecycle.reviewEligibility(state,now).reason,"fresh_provider_check_required");
});

test("reshipments, returns, shipping exceptions and impossible dates require review", () => {
  for (const change of [{is_reshipment:true},{delivery_status:"returned"},{delivery_status:"exception"},{shipment_status:"canceled"},{shipped_at:null},{delivered_at:"2027-01-01T00:00:00Z"}]) {
    const state=snapshot();Object.assign(state.shipments[0],change);assert.equal(lifecycle.reviewEligibility(state,now).eligible,false);
  }
});
