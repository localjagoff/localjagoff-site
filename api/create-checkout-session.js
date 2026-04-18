import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId } = req.body;

    if (!variantId) {
      return res.status(400).json({ error: 'Missing variantId' });
    }

    // 🔥 Get product/variant from your API
    const productRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-product?id=${variantId}`
    );

    const product = await productRes.json();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const price = parseFloat(product.retail_price) * 100;

    // 🧾 Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',

      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name || 'Product',
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/product/${variantId}`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('STRIPE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
