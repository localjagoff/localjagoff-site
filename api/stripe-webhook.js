import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const size = session.metadata.size;

    const variantMap = {
      S: 24509,
      M: 24504,
      L: 24514,
      XL: 24519,
      XXL: 24524,
      XXXL: 24529
    };

    const variantId = variantMap[size];

    await fetch('https://api.printful.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: {
          name: session.customer_details.name,
          address1: session.customer_details.address.line1,
          city: session.customer_details.address.city,
          state_code: session.customer_details.address.state,
          country_code: session.customer_details.address.country,
          zip: session.customer_details.address.postal_code
        },
        items: [
          {
            variant_id: variantId,
            quantity: 1
          }
        ]
      })
    });
  }

  res.status(200).json({ received: true });
}
