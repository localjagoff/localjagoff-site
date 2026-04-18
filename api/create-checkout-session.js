import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: "No items provided" });
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      phone_number_collection: {
        enabled: true,
      },

      line_items,

      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,

      metadata: {
        cart: JSON.stringify(items),
      },
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
