import Stripe from "stripe";

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

    const customer = session.customer_details;

    if (!customer?.address) {
      throw new Error("Missing customer shipping address");
    }

    const printfulItems = metadataItems.map((item) => ({
      sync_variant_id: Number(item.sync_variant_id),
      quantity: Number(item.quantity || 1),
    }));

    const orderPayload = {
      external_id: session.id,

      recipient: {
        name: customer.name,
        address1: customer.address.line1,
        address2: customer.address.line2 || "",
        city: customer.address.city,
        state_code: customer.address.state,
        country_code: customer.address.country,
        zip: customer.address.postal_code,
        email: customer.email,
        phone: customer.phone || "",
      },

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

    return res.status(200).json({ received: true, printful: pfData });
  } catch (err) {
    console.error("❌ PRINTFUL ORDER ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
