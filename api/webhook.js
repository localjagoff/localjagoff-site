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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const cart = JSON.parse(session.metadata.cart);

    const shipping = session.shipping_details;

    const recipient = {
      name: shipping.name,
      address1: shipping.address.line1,
      city: shipping.address.city,
      state_code: shipping.address.state,
      country_code: shipping.address.country,
      zip: shipping.address.postal_code,
      email: session.customer_details.email,
    };

    const items = cart.map((item) => ({
      variant_id: Number(item.variantId),
      quantity: item.quantity,
    }));

    await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient,
        items,
        confirm: false,
      }),
    });
  }

  res.status(200).json({ received: true });
}
