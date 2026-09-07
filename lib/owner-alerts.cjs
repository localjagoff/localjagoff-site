const { STORE_ID, getDisplayProductName } = require('./commerce-policy.cjs');
const { SUPPORT, ORDER_SENDER, escapeHtml, money } = require('./customer-mail.cjs');

function paidSummary(session, reference) {
  if (session.livemode !== true || session.payment_status !== 'paid' ||
      session.currency !== 'usd' || session.metadata?.store_id !== STORE_ID) {
    throw new Error('owner_alert_requires_verified_paid_order');
  }
  money(session.amount_total);
  const shipping = session.collected_information?.shipping_details || session.shipping_details || {};
  const address = shipping.address || {};
  let items = [];
  try {
    const encoded = JSON.parse(session.metadata.items);
    if (Array.isArray(encoded) && encoded.length <= 100) {
      items = encoded.map(item => {
        const id = session.metadata.commerce_version === '2' ? item[0] : item.product_id;
        const quantity = session.metadata.commerce_version === '2' ? item[2] : item.quantity;
        if (!Number.isSafeInteger(id) || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('invalid_item');
        return { name: getDisplayProductName({ id }), productId: id, quantity };
      });
    }
  } catch { items = []; }
  return {
    reference, sessionId: session.id, amount: session.amount_total,
    name: session.customer_details?.name || shipping.name || 'Name unavailable in Stripe',
    destination: [shipping.name, address.line1, address.line2, address.city, address.state, address.postal_code, address.country].filter(Boolean),
    items,
  };
}

function ownerEmail(summary, order = null, recovered = false) {
  const linked = Boolean(order?.id);
  const status = linked
    ? `Printful order ${order.id}: ${order.status || 'status requires owner verification'}.`
    : 'Printful draft FAILED OR UNVERIFIED. Payment is paid; do not assume fulfillment succeeded.';
  const subject = linked
    ? `${recovered ? 'RECOVERED' : 'PAID ORDER'}: Local Jagoff ${summary.reference}`
    : `HIGH PRIORITY: PAID / DRAFT UNVERIFIED ${summary.reference}`;
  const facts = [
    `Order/reference: ${summary.reference}`, `Stripe session: ${summary.sessionId}`,
    `Customer: ${summary.name}`, `Amount paid: ${money(summary.amount)} USD`,
    'Stripe payment status: PAID (verified server-side).', status,
    'Products / quantities:',
    ...(summary.items.length ? summary.items.map(i => `${i.name} | Product ${i.productId} | Qty ${i.quantity}`)
      : ['Item details unavailable; inspect the paid Stripe session before taking action.']),
    `Shipping destination: ${summary.destination.join(', ') || 'Unavailable; owner review required.'}`,
    linked ? 'Review the existing Printful order. New orders remain unconfirmed drafts; no automatic payment or confirmation.'
      : 'Acknowledge within 4 business hours of detection. Resolve or escalate within 1 business day. Reconcile the existing order before any action; do not duplicate, refund, cancel, recharge, confirm or pay without owner review.',
    'This is a separate owner notification, not a customer email.',
  ];
  return {
    from: ORDER_SENDER, to: [SUPPORT], reply_to: SUPPORT, subject,
    text: ['LOCAL JAGOFF', ...facts].join('\n\n'),
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:24px;">
      <main style="max-width:600px;margin:auto;border-top:4px solid ${linked ? '#ffe600' : '#e5484d'};padding-top:20px;">
      <h1 style="font-size:24px;line-height:1.3;color:${linked ? '#ffe600' : '#ff757b'};">${linked ? 'PAID ORDER.' : 'HIGH PRIORITY: PAID / DRAFT UNVERIFIED.'}</h1>
      ${facts.map(line => `<p style="line-height:1.6;overflow-wrap:anywhere;">${escapeHtml(line)}</p>`).join('')}</main></body></html>`,
  };
}

module.exports = { paidSummary, ownerEmail };
