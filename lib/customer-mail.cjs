const SUPPORT = "hello@localjagoff.com";
const ORDER_SENDER = "Local Jagoff Orders <orders@localjagoff.com>";
const CONTACT_SENDER = "Local Jagoff Website <orders@localjagoff.com>";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value) &&
    !value.startsWith(".") && !value.split("@")[0].endsWith(".") && !value.includes("..");
}

function money(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid_email_total");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

function frame(title, paragraphs, detail = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 16px;" align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;text-align:left;">
  <tr><td style="padding:18px 0;border-bottom:3px solid #ffe600;color:#ffe600;font-size:22px;font-weight:900;">LOCAL JAGOFF</td></tr>
  <tr><td style="padding:28px 0 12px;"><h1 style="font-size:28px;line-height:1.2;margin:0 0 20px;">${escapeHtml(title)}</h1>
  ${paragraphs.map(p => `<p style="font-size:16px;line-height:1.6;color:#d4d4d4;margin:0 0 14px;">${escapeHtml(p)}</p>`).join("")}${detail}</td></tr>
  <tr><td style="padding:24px 0;border-top:1px solid #383838;font-size:13px;line-height:1.6;color:#b5b5b5;">Questions? Reply to this email or contact <a style="color:#ffe600" href="mailto:${SUPPORT}">${SUPPORT}</a>.<br>Local Jagoff &middot; <a style="color:#ddd" href="https://www.localjagoff.com">localjagoff.com</a></td></tr>
  </table></td></tr></table></body></html>`;
}

function message(to, subject, title, paragraphs, detail = "", plainDetail = "") {
  if (!validEmail(to)) throw new Error("invalid_email_recipient");
  return { from: ORDER_SENDER, to: [to], reply_to: SUPPORT, subject,
    html: frame(title, paragraphs, detail),
    text: ["LOCAL JAGOFF", title, ...paragraphs, plainDetail, `Questions? Reply to this email or contact ${SUPPORT}.`, "https://www.localjagoff.com"].filter(Boolean).join("\n\n") };
}

function orderConfirmation({ session, recipient, orderId, lineItems }) {
  if (session?.payment_status !== "paid" || session.currency !== "usd" || !Array.isArray(lineItems) || !lineItems.length || lineItems.length > 100) throw new Error("email_requires_paid_order");
  const subtotal = session.amount_subtotal;
  const discount = session.total_details?.amount_discount ?? 0;
  const shipping = session.total_details?.amount_shipping ?? 0;
  const tax = session.total_details?.amount_tax ?? 0;
  [subtotal, discount, shipping, tax, session.amount_total].forEach(money);
  if (subtotal - discount + shipping + tax !== session.amount_total) throw new Error("email_total_mismatch");
  if (lineItems.some(i => typeof i?.name !== "string" || !i.name.trim() || i.name.length > 500 ||
    !Number.isSafeInteger(i.quantity) || i.quantity <= 0)) throw new Error("invalid_email_items");
  const itemSubtotal = lineItems.reduce((sum, i) => {
    money(i.amount_subtotal);
    return sum + i.amount_subtotal;
  }, 0);
  if (itemSubtotal !== subtotal) throw new Error("email_item_total_mismatch");
  const amounts = [["Items", subtotal], ["Discount", discount], ["Shipping", shipping], ["Tax", tax], ["Total paid", session.amount_total]];
  const itemText = lineItems.map(i => `${i.name} | Qty ${i.quantity} | ${money(i.amount_subtotal ?? i.amount_total)}`);
  const rows = lineItems.map(i => `<tr><td style="padding:12px 0;border-bottom:1px solid #383838;">${escapeHtml(i.name)}<br><span style="color:#aaa;font-size:13px;">Qty ${escapeHtml(i.quantity)}</span></td><td style="text-align:right;white-space:nowrap;">${money(i.amount_subtotal ?? i.amount_total)}</td></tr>`).join("");
  const totals = amounts.map(([label, value]) => `<tr><td style="padding:7px 0;">${label}</td><td style="text-align:right;color:${label === "Total paid" ? "#ffe600" : "#ddd"};">${label === "Discount" && value ? "-" : ""}${money(value)}</td></tr>`).join("");
  const address = [recipient.name, recipient.address1, recipient.address2, `${recipient.city}, ${recipient.state_code} ${recipient.zip}`, recipient.country_code].filter(Boolean);
  return message(recipient.email || session.customer_details?.email || session.customer_email,
    "Your Local Jagoff order is received", "ORDER RECEIVED.",
    [`Order ${orderId}`, "Payment received. Your order is in our queue to be prepared. We'll send another update when it moves into production, then tracking for each package."],
    `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:20px 0;">${rows}${totals}</table><h2 style="font-size:17px;color:#ffe600;">SHIPPING TO</h2><p style="line-height:1.6;">${address.map(escapeHtml).join("<br>")}</p>`,
    [...itemText, ...amounts.map(([label, value]) => `${label}: ${label === "Discount" && value ? "-" : ""}${money(value)}`), "Shipping to:", ...address].join("\n"));
}

function processingEmail(order) {
  return message(order.email, "Your Local Jagoff order is being made", "IT'S IN THE WORKS.",
    [`Order ${order.reference}`, "Your order has moved into production. We'll send tracking as each package ships. Thanks for repping Local Jagoff."]);
}

function shipmentEmail(order, shipment) {
  const link = safeUrl(shipment.tracking_url);
  const contents = (shipment.shipment_items || []).map(i => `${i.order_item_name || "Local Jagoff item"} | Qty ${i.quantity}`);
  const eta = shipment.estimated_delivery;
  const facts = [shipment.is_reshipment ? "Replacement package" : "Package update", `Order ${order.reference}`,
    `${shipment.carrier || "Carrier"}: ${shipment.tracking_number || "Tracking is being updated"}`,
    eta?.to_date ? `Estimated delivery: ${eta.from_date || eta.to_date} to ${eta.to_date}. This is an estimate, not a delivery confirmation.` : "",
    "This update covers this package only. Items in other packages may arrive separately."];
  return message(order.email, "A package from your Local Jagoff order shipped", "GEAR ON THE WAY.", facts.filter(Boolean),
    `<ul style="padding-left:20px;line-height:1.7;">${contents.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>${link ? `<p><a style="display:inline-block;background:#ffe600;color:#000;padding:14px 22px;text-decoration:none;font-weight:bold;" href="${escapeHtml(link)}">TRACK THIS PACKAGE</a></p>` : ""}`,
    [...contents, link ? `Track this package: ${link}` : ""].filter(Boolean).join("\n"));
}

function reviewEmail(order, reviewUrl) {
  const url = safeUrl(reviewUrl);
  if (!url || new URL(url).origin !== "https://www.localjagoff.com" || new URL(url).pathname !== "/review") throw new Error("invalid_review_destination");
  return message(order.email, "How's your Local Jagoff gear?", "GIVE US THE REAL REVIEW.",
    [`Order ${order.reference}`, "Thanks for making Local Jagoff part of your rotation. How did the gear work out? A quick rating or an honest review helps the next person find their fit.", "Still waiting on a package or something isn't right? Reply here and we'll sort it out. Leaving a review is optional."],
    `<p><a style="display:inline-block;background:#ffe600;color:#000;padding:14px 22px;text-decoration:none;font-weight:bold;" href="${escapeHtml(url)}">REVIEW YOUR GEAR</a></p>`, `Review your gear: ${url}`);
}

function contactEmail(fields) {
  if (!validEmail(fields.email)) throw new Error("invalid_reply_to");
  const labels = { order: "Order question", product: "Product question", return: "Order issue", other: "Something else" };
  const subject = `Website message: ${labels[fields.topic] || "Contact"}`;
  const lines = [`From: ${fields.name}`, `Topic: ${labels[fields.topic]}`, fields.orderNumber ? `Order reference: ${fields.orderNumber}` : "", fields.message].filter(Boolean);
  return { ...message(SUPPORT, subject, "NEW WEBSITE MESSAGE.", lines), from: CONTACT_SENDER, reply_to: fields.email };
}

async function sendViaResend(payload, key, { env = process.env, fetchImpl = fetch } = {}) {
  if (!require('./deployment.cjs').isProduction(env) || env.CUSTOMER_EMAIL_ENABLED !== "true" || !env.RESEND_API_KEY) throw new Error("email_sending_disabled");
  if (!/^[a-zA-Z0-9/_-]{1,200}$/.test(key) || !validEmail(payload.reply_to) || !Array.isArray(payload.to) ||
    payload.to.length !== 1 || !payload.to.every(validEmail) || typeof payload.subject !== "string" ||
    payload.subject.length > 200 || /[\r\n]/.test(payload.subject) ||
    ![ORDER_SENDER, CONTACT_SENDER].includes(payload.from)) throw new Error("invalid_email_envelope");
  let response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", { method: "POST", redirect: "error",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key },
      signal: AbortSignal.timeout(10000), body: JSON.stringify(payload) });
  } catch { throw new Error("email_provider_transport_ambiguous"); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !/^[a-f0-9-]{36}$/i.test(data?.id || "")) {
    const error = new Error("email_provider_failed");
    error.status = response.status;
    throw error;
  }
  return { id: data.id };
}

module.exports = { SUPPORT, ORDER_SENDER, CONTACT_SENDER, escapeHtml, validEmail, safeUrl, money,
  orderConfirmation, processingEmail, shipmentEmail, reviewEmail, contactEmail, sendViaResend };
