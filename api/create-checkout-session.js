import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { variantId } = req.body;

  try {
    const response = await fetch(
      `https://api.printful.com/store/products?store_id=18032822`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    let selectedVariant = null;

    for (const product of data.result) {
      for (const variant of product.variants || []) {
        if (variant.id == variantId) {
          selectedVariant = variant;
          break;
        }
      }
    }

    if (!selectedVariant) {
      return res.status(400).json({ error: 'Variant not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedVariant.name,
            },
            unit_amount: Math.round(parseFloat(selectedVariant.retail_price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: 'https://www.localjagoff.com/success',
      cancel_url: 'https://www.localjagoff.com',
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('STRIPE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
