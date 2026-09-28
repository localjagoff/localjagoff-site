const { test } = require("node:test");
const assert = require("node:assert/strict");
const mail = require("../lib/customer-mail.cjs");

const paid = () => ({
  session: { payment_status: "paid", currency: "usd", amount_subtotal: 5600, amount_total: 5499,
    total_details: { amount_discount: 1000, amount_shipping: 599, amount_tax: 300 } },
  recipient: { email: "buyer@example.com", name: "Test Buyer", address1: "Test address", city: "Test City", state_code: "PA", zip: "00000", country_code: "US" },
  orderId: "LJ-test-reference", lineItems: [{ name: "Test tee", quantity: 2, amount_subtotal: 5600, amount_total: 4600 }],
});

test("paid confirmation has the full authoritative money breakdown and human reply path", () => {
  const result = mail.orderConfirmation(paid());
  assert.equal(result.from, "Local Jagoff Orders <orders@localjagoff.com>");
  assert.equal(result.reply_to, "hello@localjagoff.com");
  assert.deepEqual(result.to, ["buyer@example.com"]);
  for (const text of ["LJ-test-reference", "Test tee", "Qty 2", "Items: $56.00", "Discount: -$10.00", "Shipping: $5.99", "Tax: $3.00", "Total paid: $54.99", "Test address"]) assert.ok(result.text.includes(text), text);
  assert.match(result.html, /LOCAL JAGOFF/);
  assert.doesNotMatch(result.text, /Printful|draft/);
  assert.match(result.text, /Payment received\. Your order is confirmed and being prepared\. We’ll send you another email as soon as your order ships with tracking information\./);
  assert.doesNotMatch(result.text,/moves into production|in our queue to be prepared/);
});

test("unpaid, non-USD and inconsistent total confirmations fail closed", () => {
  for (const change of [{ payment_status: "unpaid" }, { currency: "eur" }, { amount_total: 1 }, { amount_subtotal: NaN }]) {
    const input = paid(); Object.assign(input.session, change);
    assert.throws(() => mail.orderConfirmation(input));
  }
});

test("email templates escape customer-controlled HTML", () => {
  const input = paid(); input.recipient.name = '<img src=x onerror="alert(1)">';
  input.lineItems[0].name = "<script>bad()</script>";
  const result = mail.orderConfirmation(input);
  assert.doesNotMatch(result.html, /<script>|<img src=x/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /&lt;img/);
});

test("receipt items must reconcile with Stripe's undiscounted subtotal", () => {
  for (const change of [{ quantity: 0 }, { quantity: 1.5 }, { amount_subtotal: 1 }, { amount_subtotal: undefined }, { name: "" }]) {
    const input = paid(); Object.assign(input.lineItems[0], change);
    assert.throws(() => mail.orderConfirmation(input));
  }
});

test("contact sender is authenticated, recipient fixed, visitor only in reply-to", () => {
  const result = mail.contactEmail({ name: "Test Visitor", email: "visitor@example.com", topic: "order", orderNumber: "test-reference", message: "A test support question.", to: "attacker@example.com", from: "attacker@example.com" });
  assert.deepEqual(result.to, [mail.SUPPORT]);
  assert.equal(result.from, mail.CONTACT_SENDER);
  assert.equal(result.reply_to, "visitor@example.com");
  assert.equal(result.subject, "Website message: Order question");
});

test("email header injection, lists, malformed and overlong addresses are rejected", () => {
  for (const value of ["x@example.com\r\nBcc:victim@example.com", "a@example.com,b@example.com", "Name <x@example.com>", ".x@example.com", "x..y@example.com", "x@-bad.com", "x@localhost", "x".repeat(250) + "@example.com"]) assert.equal(mail.validEmail(value), false, value);
  assert.equal(mail.validEmail("first.last+orders@example.com"), true);
});

test("shipment wording is package-specific and supports split shipments", () => {
  const result = mail.shipmentEmail({ email: "buyer@example.com", reference: "LJ-test" }, {
    carrier: "USPS", tracking_number: "TEST", tracking_url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=TEST",
    shipment_items: [{ order_item_name: "Test tee", quantity: 1 }],
    estimated_delivery: { from_date: "2026-09-08", to_date: "2026-09-12" },
  });
  assert.match(result.text, /this package only/);
  assert.match(result.text, /Estimated delivery: 09\/08\/2026 \u2013 09\/12\/2026/);
  assert.doesNotMatch(result.text, /2026-09-/);
  assert.match(result.text, /not a delivery confirmation/);
  assert.match(result.text, /Order: LJ-test/);
  assert.match(result.text, /Carrier: USPS/);
  assert.match(result.text, /Tracking number: TEST/);
  assert.match(result.html, /href="https:\/\/tools.usps.com\/go\/TrackConfirmAction\?tLabels=TEST">TRACK THIS PACKAGE<\/a>/);
  assert.match(result.text, /Test tee \| Qty 1/);
  assert.doesNotMatch(JSON.stringify(result), /printful/i);
});

test("unsafe tracking and review links cannot become links in mail", () => {
  const result = mail.shipmentEmail({ email: "buyer@example.com", reference: "LJ-test" }, { tracking_url: "javascript:alert(1)" });
  assert.doesNotMatch(result.html, /javascript:/);
  assert.throws(() => mail.reviewEmail({ email: "buyer@example.com" }, "https://attacker.example/review"));
  assert.throws(() => mail.reviewEmail({ email: "buyer@example.com" }, "https://www.localjagoff.com@attacker.example/review"));
});

test("review copy is clear, optional, and not an upsell", () => {
  const order = { email: "buyer@example.com", reference: "LJ-test" };
  const review = mail.reviewEmail(order, "https://www.localjagoff.com/review#test-fixture");
  assert.match(review.text, /Leaving a review is optional/);
  assert.match(review.text, /Still waiting/);
  assert.doesNotMatch(review.text, /discount|coupon|five.star/i);
  assert.doesNotMatch(JSON.stringify(review), /printful/i);
});

test("final delivery mail is upbeat, package-safe, and uses only the approved review link", () => {
  const order={email:'buyer@example.com',reference:'LJ-test'};
  const shipment={id:84385841,shipment_status:'shipped',delivery_status:'delivered',
    shipped_at:'2026-09-25T06:53:00Z',delivered_at:'2026-09-28T16:04:00Z'};
  const url='https://www.localjagoff.com/review#'+'a'.repeat(64);
  const mailWithReview=mail.deliveryEmail(order,shipment,url,true);
  assert.equal(mailWithReview.subject,'Your Local Jagoff package has landed 🖤💛');
  assert.equal(mailWithReview.reply_to,'hello@localjagoff.com');
  for(const body of [mailWithReview.html,mailWithReview.text]) {
    assert.match(body,/IT’S HERE, JAGOFF\./);
    assert.match(body,/Order LJ-test/);
    assert.match(body,/Your Local Jagoff package was delivered on 09\/28\/2026\./);
    assert.match(body,/Time to crack it open\. We hope you love everything and it looks even better in person\./);
    assert.match(body,/Once you’ve had a chance to check it out, we’d love to hear what you think\./);
    assert.match(body,/LEAVE A REVIEW|Leave a review:/);
    assert.match(body,/Questions about your order\? Just reply to this email\./);
    assert.match(body,/localjagoff\.com/);
    assert.doesNotMatch(body,/missing|damaged|not what you expected|Questions\? Reply to this email or contact/i);
    assert.equal((body.match(/Questions about your order\?/g)||[]).length,1);
  }
  assert.match(mailWithReview.html,/>LEAVE A REVIEW<\/a>/);
  assert.match(mailWithReview.text,/Leave a review: https:\/\/www\.localjagoff\.com\/review#/);
  assert.doesNotMatch(JSON.stringify(mailWithReview),/84385841|printful/i);
  const finalWithoutReview=mail.deliveryEmail(order,shipment,null,true);
  assert.equal(finalWithoutReview.subject,mailWithReview.subject);
  assert.match(finalWithoutReview.text,/Time to crack it open/);
  assert.doesNotMatch(finalWithoutReview.html+finalWithoutReview.text,/LEAVE A REVIEW|review#/);
  const partial=mail.deliveryEmail(order,shipment);
  assert.equal(partial.subject,'A Local Jagoff package has landed 🖤💛');
  for(const body of [partial.html,partial.text]) {
    assert.match(body,/PACKAGE DELIVERED\./);
    assert.match(body,/One of your Local Jagoff packages was delivered on 09\/28\/2026\./);
    assert.match(body,/One down\. If the rest of your order is traveling separately, we’ll keep you posted as each package moves\./);
    assert.match(body,/Questions about your order\? Just reply to this email\./);
    assert.doesNotMatch(body,/everything|LEAVE A REVIEW|REVIEW YOUR GEAR|review#|Questions\? Reply to this email or contact/i);
  }
  assert.throws(()=>mail.deliveryEmail(order,shipment,url),/review_requires_whole_order_delivery/);
  assert.throws(()=>mail.deliveryEmail(order,{...shipment,delivered_at:'2099-09-29T16:04:00Z'}),/delivery_not_confirmed/);
  assert.throws(()=>mail.deliveryEmail(order,shipment,'https://attacker.example/review',true),/invalid_review_destination/);
});

test('future final and partial delivery mail uses only a safe provider delivery-details URL',()=>{
  const order={email:'buyer@example.com',reference:'LJ-test'};
  const shipment={shipment_status:'shipped',delivery_status:'delivered',
    shipped_at:'2026-09-25T06:53:00Z',delivered_at:'2026-09-28T16:04:00Z',
    carrier:'OnTrac Ground',tracking_number:'PRIVATE-TRACKING-NUMBER',
    tracking_url:'https://tracking.example.test/package?id=42&view=delivery'};
  const reviewUrl='https://www.localjagoff.com/review#'+'a'.repeat(64);
  for(const [result,final] of [[mail.deliveryEmail(order,shipment,reviewUrl,true),true],
    [mail.deliveryEmail(order,shipment),false]]){
    assert.match(result.html,/Delivered by OnTrac Ground/);
    assert.match(result.text,/Delivered by OnTrac Ground/);
    assert.match(result.html,/VIEW DELIVERY DETAILS<\/a>/);
    assert.match(result.html,/href="https:\/\/tracking\.example\.test\/package\?id=42&amp;view=delivery"/);
    assert.match(result.text,/Delivery details: https:\/\/tracking\.example\.test\/package\?id=42&view=delivery/);
    assert.doesNotMatch(result.html,/PRIVATE-TRACKING-NUMBER/);
    assert.equal(result.html.includes('LEAVE A REVIEW'),final);
  }
  for(const tracking_url of ['http://tracking.example.test/package','javascript:alert(1)',undefined]){
    const result=mail.deliveryEmail(order,{...shipment,tracking_url,carrier:null});
    assert.doesNotMatch(result.html,/VIEW DELIVERY DETAILS|Delivered by|tracking\.example\.test/);
    assert.doesNotMatch(result.text,/Delivery details:|Delivered by|tracking\.example\.test/);
  }
});

test('owner review mail is private, escaped, and does not add a BCC',async()=>{
  const payload=mail.ownerReviewEmail({displayName:'Fixture Owner',rating:2,text:'Needs <work> & care.',
    socialShareConsent:false},'Actual Purchased Tee');
  assert.equal(payload.subject,'New Local Jagoff review awaiting approval');
  assert.deepEqual(payload.to,['hello@localjagoff.com']);
  assert.match(payload.html,/NEW REVIEW TO CHECK OUT/);
  assert.match(payload.html,/Fixture Owner left a 2\/5 review/);
  assert.match(payload.html,/Actual Purchased Tee/);
  assert.match(payload.html,/Needs &lt;work&gt; &amp; care/);
  assert.match(payload.html,/Social media permission: No/);
  assert.match(payload.html,/REVIEW &amp; MODERATE/);
  assert.match(payload.html,/href="https:\/\/www\.localjagoff\.com\/admin\/reviews"/);
  assert.doesNotMatch(JSON.stringify(payload),/buyer@example|shipping address|review#|stripe|payment/i);
  assert.match(mail.ownerReviewEmail({displayName:'Fixture',rating:5,text:'',socialShareConsent:true},
    'Actual Mug').text,/Review: Rating only[\s\S]*Social media permission: Yes/);
  let envelope;
  await mail.sendViaResend(payload,'owner-review/00000000-0000-4000-8000-000000000001',{
    env:{VERCEL_ENV:'production',CUSTOMER_EMAIL_ENABLED:'true',RESEND_API_KEY:'fixture',
      CUSTOMER_EMAIL_BCC:'hello@localjagoff.com'},
    fetchImpl:async(_url,options)=>{envelope=JSON.parse(options.body);return {ok:true,status:200,
      json:async()=>({id:'00000000-0000-4000-8000-000000000002'})};}});
  assert.deepEqual(envelope.to,['hello@localjagoff.com']);
  assert.equal(envelope.bcc,undefined);
});

test("shipment dates handle single bounds, equal bounds and invalid calendar dates", () => {
  for (const [eta, expected] of [
    [{from_date:'2026-09-29'}, '09/29/2026'],
    [{to_date:'2026-10-01'}, '10/01/2026'],
    [{from_date:'2026-09-29',to_date:'2026-09-29'}, '09/29/2026'],
    [{from_date:'2028-02-29'}, '02/29/2028'],
    [{from_date:'2026-02-29',to_date:'not a date'}, null],
    [{from_date:'2026-13-01'}, null],
  ]) {
    const shipment={id:84385841,carrier:'OnTrac Ground',tracking_number:'TEST',estimated_delivery:eta};
    const original=JSON.stringify(shipment);
    const result=mail.shipmentEmail({email:'buyer@example.com',reference:'LJ-test'},shipment);
    for(const body of [result.html,result.text]) {
      if(expected)assert.ok(body.includes(`Estimated delivery: ${expected}.`));
      else assert.doesNotMatch(body,/Estimated delivery:/);
      assert.doesNotMatch(body,/84385841/);
      assert.match(body,/Carrier: OnTrac Ground/);
    }
    assert.equal(JSON.stringify(shipment),original);
  }
});
test('only customer lifecycle email receives a hidden owner BCC',async()=>{
  const env={VERCEL_ENV:'production',CUSTOMER_EMAIL_ENABLED:'true',RESEND_API_KEY:'unit-test-only',CUSTOMER_EMAIL_BCC:'owner@example.com'};
  const bodies=[];
  const fetchImpl=async(url,options)=>{bodies.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({id:'00000000-0000-0000-0000-000000000001'})};};
  const order={email:'buyer@example.com',reference:'LJ-test'};
  const customer=[['receipt/LJ-test',mail.orderConfirmation(paid())],
    ['shipment/LJ-test/1',mail.shipmentEmail(order,{id:1,shipment_status:'shipped',carrier:'OnTrac',tracking_number:'TEST'})],
    ['delivery/LJ-test/1',mail.deliveryEmail(order,{id:1,shipment_status:'shipped',delivery_status:'delivered',
      shipped_at:'2026-09-25T06:53:00Z',delivered_at:'2026-09-28T16:04:00Z'})],
    ['review/LJ-test',mail.reviewEmail(order,'https://www.localjagoff.com/review#test')]];
  for(const [key,payload] of customer)await mail.sendViaResend(payload,key,{env,fetchImpl});
  for(const body of bodies){
    assert.deepEqual(body.bcc,['owner@example.com']);
    assert.deepEqual(body.to,['buyer@example.com']);
    assert.equal(body.cc,undefined);
  }
  const fallbackEnv={...env};delete fallbackEnv.CUSTOMER_EMAIL_BCC;
  for(const [key,payload] of customer)await mail.sendViaResend(payload,key,{env:fallbackEnv,fetchImpl});
  for(const body of bodies.slice(4))assert.deepEqual(body.bcc,['hello@localjagoff.com']);
  await mail.sendViaResend(mail.contactEmail({name:'Visitor',email:'visitor@example.com',topic:'other',message:'Hi'}),'contact/fixture',{env,fetchImpl});
  await mail.sendViaResend({...customer[0][1],to:['hello@localjagoff.com']},'owner/LJ-test',{env,fetchImpl});
  assert.equal(bodies[8].bcc,undefined);assert.equal(bodies[9].bcc,undefined);
});

test("transactional sending fails closed in TEST/Preview/disabled environments", async () => {
  let calls = 0;
  for (const env of [{}, { VERCEL_ENV: "preview", CUSTOMER_EMAIL_ENABLED: "true", RESEND_API_KEY: "test-fixture" }, { VERCEL_ENV: "production", RESEND_API_KEY: "test-fixture" }]) {
    await assert.rejects(mail.sendViaResend(mail.orderConfirmation(paid()), "order/test", { env, fetchImpl: async () => { calls++; } }), /disabled/);
  }
  assert.equal(calls, 0);
});

test("Resend uses a deterministic idempotency key and hides provider failures", async () => {
  const env = { VERCEL_ENV: "production", CUSTOMER_EMAIL_ENABLED: "true", RESEND_API_KEY: "unit-test-only" };
  const payload = mail.orderConfirmation(paid());
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({url, options}); return { ok: true, status: 200, json: async () => ({ id: "00000000-0000-0000-0000-000000000001" }) }; };
  assert.equal((await mail.sendViaResend(payload, "paid/LJtest", {env, fetchImpl})).id, "00000000-0000-0000-0000-000000000001");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "paid/LJtest");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(JSON.parse(calls[0].options.body).reply_to, mail.SUPPORT);
  await assert.rejects(mail.sendViaResend(payload, "paid/LJtest", {env, fetchImpl: async () => ({ ok:false, status:503, json:async () => ({message:"PRIVATE_PROVIDER_DETAILS"}) }) }), error => error.message === "email_provider_failed" && error.status === 503);
  await assert.rejects(mail.sendViaResend(payload, "paid/LJtest", {env, fetchImpl: async () => { throw new Error("PRIVATE_TRANSPORT_DETAILS"); } }), error => error.message === "email_provider_transport_ambiguous");
});

test("invalid sender, recipient list and subject injection fail before provider access", async () => {
  const env = { VERCEL_ENV: "production", CUSTOMER_EMAIL_ENABLED: "true", RESEND_API_KEY: "unit-test-only" };
  let calls = 0;
  for (const change of [{ from: "attacker@example.com" }, { to: ["a@example.com", "b@example.com"] }, { reply_to: "a@example.com\r\nBcc:b@example.com" }, { subject: "Hello\r\nBcc:b@example.com" }]) {
    await assert.rejects(mail.sendViaResend({...mail.orderConfirmation(paid()), ...change}, "paid/LJtest", {env, fetchImpl: async () => { calls++; } }), /invalid_email_envelope/);
  }
  assert.equal(calls, 0);
});
