import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,

          // 🔥 FIX: MAKE IMAGE FULL URL
          images: item.image
            ? [`${baseUrl}${item.image}`]
            : [],
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cart`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("STRIPE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
}
