import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];

  const buf = await new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const size = session.metadata.size;
    const qty = parseInt(session.metadata.qty || 1);

    // ✅ CORRECT numeric IDs
    const variantMap = {
      S: 5271015784,
      M: 5271015785,
      L: 5271015786,
      XL: 5271015787,
      XXL: 5271015788,
      XXXL: 5271015789
    };

    const variantId = variantMap[size];

    try {
      const response = await fetch(
        'https://api.printful.com/orders?store_id=18032822',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            external_id: session.id,
            recipient: {
              name: session.customer_details.name,
              email: session.customer_details.email,
              phone: session.customer_details.phone || "0000000000",
              address1: session.customer_details.address.line1,
              city: session.customer_details.address.city,
              state_code: session.customer_details.address.state,
              country_code: session.customer_details.address.country,
              zip: session.customer_details.address.postal_code
            },
            items: [
              {
                sync_variant_id: variantId,
                quantity: qty
              }
            ]
          })
        }
      );

      const data = await response.json();
      console.log('PRINTFUL RESPONSE:', data);

    } catch (err) {
      console.error('Printful error:', err);
    }
  }

  res.status(200).json({ received: true });
}
