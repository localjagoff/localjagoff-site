import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ message: 'API working' });
    }

    const { size, qty } = req.body;

    // 🧠 Pricing per size (in cents)
    const priceMap = {
      S: 2500,
      M: 2500,
      L: 2500,
      XL: 2500,
      XXL: 2800,
      XXXL: 3100
    };

    // 🚨 Basic validation
    if (!priceMap[size]) {
      return res.status(400).json({ error: 'Invalid size selected' });
    }

    const quantity = parseInt(qty || 1);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],

      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Certified Jagoff Tee (${size})`,
            },
            unit_amount: priceMap[size],
          },
          quantity: quantity,
        },
      ],

      mode: 'payment',

      // 🔥 This is important (you were missing full config)
      shipping_address_collection: {
        allowed_countries: ['US'],
      },

      // 👇 Helps Stripe pre-fill + ensures email exists
      customer_creation: 'always',

      success_url: 'https://localjagoff.com',
      cancel_url: 'https://localjagoff.com',

      // 🔗 This connects to your webhook
      metadata: {
        size: size,
        qty: quantity.toString(),
      },
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
