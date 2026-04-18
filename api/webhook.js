import Stripe from "stripe";
import getRawBody from "raw-body";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const rawBody = await getRawBody(req);

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔥 Only handle completed payments
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const variantId = session.metadata.variantId;

      // 🔥 Customer + shipping data from Stripe
      const shipping = session.shipping_details;

      if (!shipping) {
        console.error("No shipping info found");
        return res.status(400).json({ error: "Missing shipping info" });
      }

      const recipient = {
        name: shipping.name,
        address1: shipping.address.line1,
        address2: shipping.address.line2 || "",
        city: shipping.address.city,
        state_code: shipping.address.state,
        country_code: shipping.address.country,
        zip: shipping.address.postal_code,
        phone: shipping.phone || "",
        email: session.customer_details.email,
      };

      console.log("Creating Printful order:", {
        variantId,
        recipient,
      });

      // 🔥 Send order to Printful (DO NOT auto-charge)
      const printfulResponse = await fetch(
        "https://api.printful.com/orders",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient,
            items: [
              {
                variant_id: Number(variantId),
                quantity: 1,
              },
            ],
            confirm: false, // 🔥 CRITICAL (manual approval)
          }),
        }
      );

      const printfulData = await printfulResponse.json();

      console.log("Printful response:", printfulData);

      if (!printfulResponse.ok) {
        console.error("Printful order failed:", printfulData);
      }
    } catch (err) {
      console.error("ORDER PROCESS ERROR:", err);
    }
  }

  res.status(200).json({ received: true });
}
