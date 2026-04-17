import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ message: 'API working' });
    }

    const { size, qty } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Certified Jagoff Tee (${size})`,
          },
          unit_amount: 2699,
        },
        quantity: parseInt(qty),
      }],
      mode: 'payment',
      success_url: 'https://localjagoff.com',
      cancel_url: 'https://localjagoff.com',
      metadata: { size, qty }
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
