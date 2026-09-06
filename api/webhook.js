import Stripe from "stripe";
import fulfillment from "../lib/fulfillment.cjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { fulfillEvent } = fulfillment;

async function buffer(readable) {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
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
    return false;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ Skipping order email: missing RESEND_API_KEY");
    return false;
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
      "Idempotency-Key": `order-received/${orderId}`,
    },
    signal: AbortSignal.timeout(10000),
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
    throw new Error("Order email provider failed");
  }

  console.log("Order email sent", { session_id: session.id, email_id: emailData?.id });
  return true;
}

export function createWebhookHandler(options = {}) {
  const client = options.stripe || stripe;
  const env = options.env || process.env;
  return async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      const buf = await buffer(req);
      event = client.webhooks.constructEvent(
        buf,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed");
      return res.status(400).send("Invalid webhook signature");
    }

    try {
      const result = await fulfillEvent(event, { sendEmail: sendOrderReceivedEmail, ...options, stripe: client, env });
      return res.status(200).json(result);
    } catch (err) {
      console.error("Webhook processing failed", { event_id: event.id });
      return res.status(500).json({ error: "Fulfillment pending; retry required" });
    }
  };
}

export default createWebhookHandler();
