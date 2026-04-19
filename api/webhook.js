import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // ✅ ONLY handle successful payments
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("💰 PAYMENT SUCCESS:", session.id);

    try {
      // 🔥 Get full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(
        session.id,
        { expand: ["line_items"] }
      );

      const items = fullSession.line_items.data;

      // 🧠 Build Printful order items
      const printfulItems = items.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        retail_price: (item.amount_total / 100).toFixed(2),
      }));

      // 📦 Shipping info
      const shipping = session.customer_details;

      const orderPayload = {
        recipient: {
          name: shipping.name,
          address1: shipping.address.line1,
          city: shipping.address.city,
          state_code: shipping.address.state,
          country_code: shipping.address.country,
          zip: shipping.address.postal_code,
          email: shipping.email,
          phone: shipping.phone || "",
        },

        items: printfulItems,

        confirm: false, // ✅ YOU APPROVE MANUALLY
      };

      console.log("📦 SENDING TO PRINTFUL:", orderPayload);

      const pfRes = await fetch("https://api.printful.com/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const pfData = await pfRes.json();

      console.log("🧾 PRINTFUL RESPONSE:", pfData);

    } catch (err) {
      console.error("❌ PRINTFUL ORDER ERROR:", err);
    }
  }

  res.status(200).json({ received: true });
}
