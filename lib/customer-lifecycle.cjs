const crypto = require("node:crypto");

const DAY = 86400000;
const EVENTS = new Set(["order_updated", "order_failed", "order_canceled", "order_put_hold",
  "order_remove_hold", "order_refunded", "shipment_sent", "shipment_delivered", "shipment_returned"]);

function verifyPrintfulSignature(raw, headers, env) {
  const secret = env.PRINTFUL_WEBHOOK_SECRET;
  const publicKey = env.PRINTFUL_WEBHOOK_PUBLIC_KEY;
  const supplied = headers["x-pf-webhook-signature"];
  if (!Buffer.isBuffer(raw) || raw.length > 262144 || !/^(?:[a-f\d]{2}){16,}$/i.test(secret || "") ||
    !publicKey || headers["x-pf-webhook-public-key"] !== publicKey || !/^[a-f\d]{64}$/i.test(supplied || "")) return false;
  const expected = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(raw).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(supplied, "hex"));
}

function printfulEventIdentity(event, storeId, now = Date.now()) {
  const occurred = Date.parse(event?.occurred_at);
  const order = event?.data?.order;
  if (!EVENTS.has(event?.type) || String(event.store_id) !== String(storeId) ||
    String(order?.store_id) !== String(storeId) || !Number.isSafeInteger(order?.id) || order.id <= 0 ||
    !/^LJ[a-f0-9]{24}$/.test(order.external_id || "") || !Number.isFinite(occurred) ||
    occurred > now + 300000 || occurred < now - 7 * DAY) throw new Error("invalid_printful_event");
  const shipment = event.data.shipment;
  if (event.type.startsWith("shipment_") && (!Number.isSafeInteger(shipment?.id) || shipment.id <= 0)) throw new Error("invalid_shipment_event");
  // Retry count is deliberately excluded: one provider event keeps the same identity.
  return crypto.createHash("sha256").update([event.type, event.store_id, order.id,
    shipment?.id || "", event.occurred_at].join("|")).digest("hex");
}

function isProcessing(order) {
  return order?.status === "inprocess";
}

function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function endOfDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value + "T23:59:59.999Z");
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(value) ? time : null;
}

function reviewEligibility({ payment, order, shipments, allPagesLoaded, knownReturned = false,
  unresolved = false, reviewSent = false, optedOut = false, checkedAt }, now = Date.now()) {
  const no = reason => ({ eligible: false, reason });
  if (reviewSent || optedOut) return no(reviewSent ? "already_sent" : "opted_out");
  if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > 60000) return no("fresh_provider_check_required");
  if (payment?.paid !== true || payment.refunded !== false || payment.disputed !== false) return no("payment_not_clear");
  if (knownReturned || unresolved) return no("manual_review_required");
  if (order?.status !== "fulfilled") return no("whole_order_not_shipped");
  if (!allPagesLoaded || !Array.isArray(shipments) || !shipments.length || !Array.isArray(order.order_items) || !order.order_items.length) return no("incomplete_shipment_data");
  if (shipments.some(s => /return|fail|exception/i.test(`${s.delivery_status} ${s.shipment_status}`))) return no("shipment_problem");
  // A canceled/reshipped package is ambiguous without an explicit replacement mapping.
  if (shipments.some(s => s.shipment_status === "canceled" || s.is_reshipment === true)) return no("replacement_requires_review");
  const seen = new Set();
  const quantities = new Map();
  const arrivals = [];
  let estimated = false;
  for (const shipment of shipments) {
    const shipped = timestamp(shipment.shipped_at);
    if (!Number.isSafeInteger(shipment.id) || shipment.id <= 0 || seen.has(shipment.id) || !shipped || shipped > now ||
      !Array.isArray(shipment.shipment_items) || !shipment.shipment_items.length) return no("incomplete_shipment_data");
    seen.add(shipment.id);
    for (const item of shipment.shipment_items) {
      if (!Number.isSafeInteger(item.order_item_id) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return no("incomplete_shipment_data");
      quantities.set(item.order_item_id, (quantities.get(item.order_item_id) || 0) + item.quantity);
    }
    const delivered = shipment.delivery_status === "delivered" ? timestamp(shipment.delivered_at) : null;
    if (delivered && delivered >= shipped && delivered <= now) arrivals.push(delivered);
    else {
      if (!["unknown", "in_transit", "shipped"].includes(shipment.delivery_status)) return no("delivery_not_clear");
      const eta = endOfDate(shipment.estimated_delivery?.to_date);
      if (!eta || eta < shipped || eta > shipped + 90 * DAY) return no("no_trustworthy_delivery_date");
      // Date-only ETAs have no timezone. Wait through UTC-12's end of day.
      arrivals.push(eta + 12 * 60 * 60 * 1000);
      estimated = true;
    }
  }
  if (order.order_items.some(i => !Number.isSafeInteger(i.id) || !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || quantities.get(i.id) !== i.quantity) || quantities.size !== order.order_items.length) return no("whole_order_coverage_unproven");
  const due = Math.max(...arrivals) + 7 * DAY;
  return { eligible: now >= due, reason: now >= due ? "due" : "waiting", dueAt: new Date(due).toISOString(),
    method: estimated ? "latest_package_estimate_plus_7_days" : "whole_order_delivered_plus_7_days" };
}

module.exports = { DAY, EVENTS, verifyPrintfulSignature, printfulEventIdentity, isProcessing, reviewEligibility };
