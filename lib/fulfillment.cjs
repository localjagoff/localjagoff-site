const crypto = require("node:crypto");
const { STORE_ID } = require("./commerce-policy.cjs");
const { CommerceError, validateItems, positiveInteger, resolveCart, printfulRequest } = require("./commerce.cjs");

function externalId(sessionId) {
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) throw new CommerceError("Invalid session ID");
  return `LJ${crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 24)}`;
}

function recipientFrom(session) {
  const customer = session.customer_details || {};
  const shipping = session.collected_information?.shipping_details || session.shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.state ||
      address.country !== "US" || !address.postal_code) {
    throw new CommerceError("Missing or unsupported shipping address");
  }
  return { name: shipping.name, address1: address.line1, address2: address.line2 || "",
    city: address.city, state_code: address.state, country_code: address.country,
    zip: address.postal_code, email: customer.email || session.customer_email || "",
    phone: customer.phone || "" };
}

function money(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new CommerceError("Invalid paid totals");
  return (cents / 100).toFixed(2);
}

async function orderItems(session, stripe, options) {
  let encoded;
  try { encoded = JSON.parse(session.metadata?.items || "null"); }
  catch { throw new CommerceError("Invalid order metadata"); }
  if (!Array.isArray(encoded) || !encoded.length) throw new CommerceError("Missing order metadata");
  let items;
  if (session.metadata.commerce_version === "2") {
    items = validateItems(encoded.map((i) => ({ id: i?.[0], variant_id: i?.[1], quantity: i?.[2] })))
      .map((i, index) => ({ ...i, unit_amount: positiveInteger(encoded[index][3], "order price") }));
  } else if (!session.metadata.commerce_version) {
    // Old sessions had client-priced metadata. Reconcile before creating any new draft.
    items = await resolveCart(encoded.map((i) => ({ id: i.product_id,
      variant_id: i.sync_variant_id, quantity: i.quantity })), options);
  } else {
    throw new CommerceError("Unsupported commerce version");
  }
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  const signatures = (values) => values.map((i) => `${i.unit_amount}:${i.quantity}`).sort().join("|");
  if (lines.has_more || signatures(items) !== signatures(lines.data.map((line) => ({
    unit_amount: line.price?.unit_amount, quantity: line.quantity,
  }))) || lines.data.some((line) => line.currency !== "usd")) {
    throw new CommerceError("Paid line items require manual reconciliation");
  }
  const subtotal = items.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0);
  if (subtotal !== session.amount_subtotal) throw new CommerceError("Paid subtotal mismatch");
  return { items, lines: lines.data };
}

function checkOrder(order, session) {
  if (!order?.id || order.external_id !== externalId(session.id) || String(order.store) !== STORE_ID ||
      (session.metadata.printful_order_id && String(order.id) !== session.metadata.printful_order_id)) {
    throw new CommerceError("Printful order identity mismatch", 503);
  }
  return order;
}

async function findOrder(session, options) {
  const existing = await printfulRequest(`/orders/@${externalId(session.id)}?store_id=${STORE_ID}`, options);
  if (existing) return checkOrder(existing, session);
  if (session.metadata.printful_order_id) {
    throw new CommerceError("Recorded Printful order missing; manual recovery required", 503);
  }
  return null;
}

async function ensureDraft(payload, session, options) {
  // Recheck immediately before creation; the provider's unique external ID arbitrates races.
  const existing = await findOrder(session, options);
  if (existing) return { order: existing, outcome: "duplicate_suppressed" };
  let order;
  try {
    order = checkOrder(await printfulRequest(`/orders?store_id=${STORE_ID}&confirm=false`, {
      ...options, method: "POST", body: payload,
    }), session);
  } catch (error) {
    // External IDs are store-unique: recover a concurrent create or a lost POST response.
    const recovered = await findOrder(session, options);
    if (recovered) return { order: recovered, outcome: "create_response_recovered" };
    throw error;
  }
  if (order.status !== "draft") throw new CommerceError("New Printful order is not draft; review required", 503);
  return { order, outcome: "draft_created" };
}

async function fulfillEvent(event, { stripe, fetchImpl = fetch, env = process.env, logger = console,
  sendEmail = async () => false } = {}) {
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return { received: true, skipped: "unrelated_event" };
  }
  // Test Stripe events must never reach the live Printful store.
  if (event.livemode === false) return { received: true, skipped: "test_mode_no_printful" };
  if (event.livemode !== true || !/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || "") ||
      (env.VERCEL_ENV && env.VERCEL_ENV !== "production")) {
    throw new CommerceError("Live fulfillment environment mismatch", 503);
  }
  const sessionId = event.data?.object?.id;
  const orderId = externalId(sessionId);
  let session;
  let linkedOrder;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.id !== sessionId || session.livemode !== true || session.mode !== "payment" ||
        session.metadata?.store_id !== STORE_ID || session.currency !== "usd") {
      throw new CommerceError("Session store or mode mismatch");
    }
    if (session.payment_status !== "paid") return { received: true, skipped: "not_paid" };
    const options = { fetchImpl, apiKey: env.PRINTFUL_API_KEY };
    // Replays must not depend on today's price, stock or retained shipping fields.
    let order = await findOrder(session, options);
    let outcome = "duplicate_suppressed";
    let recipient;
    let lines;
    if (!order) {
      recipient = recipientFrom(session);
      const resolved = await orderItems(session, stripe, options);
      const { items } = resolved;
      lines = resolved.lines;
      const retail_costs = { currency: "USD", subtotal: money(session.amount_subtotal),
        discount: money(session.total_details?.amount_discount ?? 0),
        shipping: money(session.total_details?.amount_shipping ?? 0),
        tax: money(session.total_details?.amount_tax ?? 0) };
      money(session.amount_total);
      if (session.amount_subtotal - (session.total_details?.amount_discount ?? 0) +
          (session.total_details?.amount_shipping ?? 0) + (session.total_details?.amount_tax ?? 0) !== session.amount_total) {
        throw new CommerceError("Paid total mismatch");
      }
      ({ order, outcome } = await ensureDraft({ external_id: orderId, recipient, retail_costs,
        items: items.map((i) => ({ sync_variant_id: i.variant_id, quantity: i.quantity,
          retail_price: money(i.unit_amount) })), confirm: false }, session, options));
    }
    linkedOrder = order;
    await stripe.checkout.sessions.update(sessionId, { metadata: {
      printful_external_id: orderId, printful_order_id: String(order.id),
      printful_status: String(order.status), fulfillment_state: "order_linked",
      fulfillment_error: "", fulfillment_event_id: event.id,
    } });
    logger.info("fulfillment_order_linked", { event_id: event.id, session_id: sessionId,
      external_id: orderId, printful_order_id: order.id, status: order.status,
      fulfillment_state: "order_linked", outcome });
    if (session.metadata.order_email_sent !== "true") {
      try {
        recipient ||= recipientFrom(session);
        lines ||= (await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })).data;
        const sent = await sendEmail({ session, recipient, orderId, lineItems: lines.map((line) => ({
          name: line.description || "Local Jagoff item", quantity: line.quantity,
          amount_total: line.amount_total, currency: line.currency,
        })) });
        if (sent) await stripe.checkout.sessions.update(sessionId, { metadata: { order_email_sent: "true" } });
      } catch {
        logger.error("order_email_failed", { session_id: sessionId, external_id: orderId });
      }
    }
    return { received: true, printful_order_id: order.id };
  } catch (error) {
    const code = error instanceof CommerceError ? error.message : "provider_or_persistence_failure";
    logger.error("fulfillment_failed", { event_id: event.id, session_id: sessionId, external_id: orderId,
      printful_order_id: linkedOrder?.id || session?.metadata?.printful_order_id || null,
      fulfillment_state: "needs_retry_or_review", code });
    if (session?.metadata?.store_id === STORE_ID) {
      try {
        await stripe.checkout.sessions.update(sessionId, { metadata: {
          printful_external_id: orderId, fulfillment_state: "needs_retry_or_review",
          fulfillment_error: code, fulfillment_event_id: event.id,
        } });
      } catch { logger.error("fulfillment_status_write_failed", { session_id: sessionId }); }
    }
    throw new CommerceError("Fulfillment pending; retry required", 503);
  }
}

module.exports = { externalId, recipientFrom, fulfillEvent };
