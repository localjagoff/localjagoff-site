import Stripe from "stripe";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STORE_ID = "18032822";

async function buffer(readable) {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function getShippingDetails(session) {
  return (
    session.collected_information?.shipping_details ||
    session.shipping_details ||
    null
  );
}

function getRecipientFromSession(session) {
  const customer = session.customer_details || {};
  const shippingDetails = getShippingDetails(session);
  const shippingAddress = shippingDetails?.address || null;
  const billingAddress = customer.address || null;

  const address = shippingAddress || billingAddress;

  if (
    !address ||
    !address.line1 ||
    !address.city ||
    !address.state ||
    !address.country ||
    !address.postal_code
  ) {
    throw new Error(
      `Missing customer shipping address fields: ${JSON.stringify({
        shippingDetails,
        customerDetails: customer,
      })}`
    );
  }

  return {
    name: shippingDetails?.name || customer.name || "Local Jagoff Customer",
    address1: address.line1,
    address2: address.line2 || "",
    city: address.city,
    state_code: address.state,
    country_code: address.country,
    zip: address.postal_code,
    email: customer.email || session.customer_email || "",
    phone: customer.phone || "",
  };
}

function getPrintfulExternalId(session) {
  const source = session.id || session.payment_intent || Date.now().toString();

  return `LJ${crypto
    .createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 24)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(amount, currency) {
  if (typeof amount !== "number") return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amount / 100);
}

async function getStripeLineItems(sessionId) {
  if (!sessionId) return [];

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
    });

    return lineItems.data.map((item) => ({
      name: item.description || "Local Jagoff item",
      quantity: item.quantity || 1,
      amount_total: item.amount_total,
      currency: item.currency || "usd",
    }));
  } catch (err) {
    console.error("⚠️ Could not fetch Stripe line items:", err.message);
    return [];
  }
}

function buildOrderEmailHtml({ session, recipient, orderId, lineItems }) {
  const itemRows =
    lineItems.length > 0
      ? lineItems
          .map(
            (item) => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #222;">
                  <strong style="color: #ffffff;">${escapeHtml(item.name)}</strong><br />
                  <span style="color: #a8a8a8;">Qty: ${escapeHtml(item.quantity)}</span>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #222; text-align: right; color: #ffe600; font-weight: 800;">
                  ${escapeHtml(formatMoney(item.amount_total, item.currency))}
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; color: #ffffff;">
              Your Local Jagoff order has been received.
            </td>
          </tr>
        `;

  const total = formatMoney(session.amount_total, session.currency);

  return `
    <!doctype html>
    <html>
      <body style="margin:0; padding:0; background:#000000; font-family: Arial, Helvetica, sans-serif; color:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#000000; padding: 28px 14px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; background:#101010; border:1px solid #242424; border-radius:18px; overflow:hidden;">
                <tr>
                  <td style="padding: 24px; background: linear-gradient(135deg, #111111, #000000); border-bottom: 1px solid #242424;">
                    <div style="color:#ffe600; font-size:12px; font-weight:900; letter-spacing:1.4px; text-transform:uppercase;">Local Jagoff</div>
                    <h1 style="margin: 8px 0 0; color:#ffffff; font-size:28px; line-height:1.1;">Order received.</h1>
                    <p style="margin: 10px 0 0; color:#cfcfcf; font-size:15px; line-height:1.5;">
                      Appreciate you reppin’ Local Jagoff. We got your order and we’ll send tracking once it ships.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px;">
                    <div style="display:inline-block; padding:8px 12px; border:1px solid rgba(255,230,0,0.45); border-radius:999px; color:#ffe600; font-size:12px; font-weight:900; letter-spacing:.6px;">
                      Order #${escapeHtml(orderId)}
                    </div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
                      ${itemRows}
                    </table>

                    ${
                      total
                        ? `<p style="margin:18px 0 0; text-align:right; color:#ffffff; font-size:16px;"><span style="color:#aaa;">Total paid:</span> <strong style="color:#ffe600;">${escapeHtml(
                            total
                          )}</strong></p>`
                        : ""
                    }

                    <div style="margin-top: 22px; padding: 16px; background:#0b0b0b; border:1px solid #222; border-radius:14px;">
                      <div style="color:#ffe600; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:1px;">Shipping to</div>
                      <p style="margin:8px 0 0; color:#ffffff; line-height:1.45; font-size:14px;">
                        ${escapeHtml(recipient.name)}<br />
                        ${escapeHtml(recipient.address1)}<br />
                        ${
                          recipient.address2
                            ? `${escapeHtml(recipient.address2)}<br />`
                            : ""
                        }
                        ${escapeHtml(recipient.city)}, ${escapeHtml(
                          recipient.state_code
                        )} ${escapeHtml(recipient.zip)}
                      </p>
                    </div>

                    <p style="margin:22px 0 0; color:#cfcfcf; font-size:14px; line-height:1.5;">
                      No nonsense. Just Pittsburgh attitude.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 24px; border-top:1px solid #242424; background:#080808;">
                    <p style="margin:0; color:#777; font-size:12px; line-height:1.5;">
                      Questions? Reply to your order email or visit localjagoff.com.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildOrderEmailText({ session, recipient, orderId, lineItems }) {
  const itemLines =
    lineItems.length > 0
      ? lineItems
          .map(
            (item) =>
              `- ${item.name} | Qty: ${item.quantity} | ${formatMoney(
                item.amount_total,
                item.currency
              )}`
          )
          .join("\n")
      : "- Your Local Jagoff order has been received.";

  const total = formatMoney(session.amount_total, session.currency);

  return `Order received.

Appreciate you reppin' Local Jagoff. We got your order and we'll send tracking once it ships.

Order #${orderId}

${itemLines}

${total ? `Total paid: ${total}\n` : ""}
Shipping to:
${recipient.name}
${recipient.address1}
${recipient.address2 ? `${recipient.address2}\n` : ""}${recipient.city}, ${recipient.state_code} ${recipient.zip}

No nonsense. Just Pittsburgh attitude.

localjagoff.com`;
}

async function sendOrderReceivedEmail({ session, recipient, orderId, lineItems }) {
  const to = recipient.email || session.customer_details?.email || session.customer_email;

  if (!to) {
    console.warn("⚠️ Skipping order email: no customer email found");
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ Skipping order email: missing RESEND_API_KEY");
    return;
  }

  const from =
    process.env.ORDER_EMAIL_FROM || "Local Jagoff <orders@localjagoff.com>";

  const html = buildOrderEmailHtml({ session, recipient, orderId, lineItems });
  const text = buildOrderEmailText({ session, recipient, orderId, lineItems });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "local-jagoff-store/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "We got your Local Jagoff order",
      html,
      text,
    }),
  });

  const emailData = await emailRes.json().catch(() => null);

  if (!emailRes.ok) {
    throw new Error(`Order email failed: ${JSON.stringify(emailData)}`);
  }

  console.log("✅ ORDER EMAIL SENT:", JSON.stringify(emailData, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  console.log("💰 PAYMENT SUCCESS:", session.id);

  try {
    const metadataItems = JSON.parse(session.metadata?.items || "[]");

    if (!Array.isArray(metadataItems) || metadataItems.length === 0) {
      throw new Error("Missing Printful metadata items");
    }

    const printfulItems = metadataItems.map((item) => ({
      sync_variant_id: Number(item.sync_variant_id),
      quantity: Number(item.quantity || 1),
    }));

    const orderId = getPrintfulExternalId(session);
    const recipient = getRecipientFromSession(session);

    const orderPayload = {
      external_id: orderId,

      recipient,

      items: printfulItems,

      confirm: false,
    };

    console.log("📦 SENDING TO PRINTFUL:", JSON.stringify(orderPayload, null, 2));

    const pfRes = await fetch(
      `https://api.printful.com/orders?store_id=${STORE_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      }
    );

    const pfData = await pfRes.json();

    console.log("🧾 PRINTFUL RESPONSE:", JSON.stringify(pfData, null, 2));

    if (!pfRes.ok) {
      throw new Error(`Printful order failed: ${JSON.stringify(pfData)}`);
    }

    try {
      const lineItems = await getStripeLineItems(session.id);
      await sendOrderReceivedEmail({
        session,
        recipient,
        orderId,
        lineItems,
      });
    } catch (emailErr) {
      console.error("❌ ORDER EMAIL ERROR:", emailErr.message);
    }

    return res.status(200).json({ received: true, printful: pfData });
  } catch (err) {
    console.error("❌ PRINTFUL ORDER ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
