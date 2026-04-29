const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STORE_ID = "18032822";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items" });
    }

    // 🔥 FIX 1: Add product images to Stripe
    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.variant_name
            ? `${item.name} - ${item.variant_name}`
            : item.name,
          images: item.image ? [item.image] : [], // IMPORTANT
        },
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Metadata for Printful webhook (DO NOT TOUCH)
    const printfulMetadataItems = items.map((item) => ({
      product_id: item.id,
      sync_variant_id: item.variant_id,
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",

      // 🔥 Shipping address collection
      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      // 🔥 FIX 2: Add shipping cost
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 599, // $5.99 shipping
              currency: "usd",
            },
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],

      phone_number_collection: {
        enabled: true,
      },

      metadata: {
        store_id: STORE_ID,
        items: JSON.stringify(printfulMetadataItems),
      },

      success_url: `${req.headers.origin}/success`,
      cancel_url: `${req.headers.origin}/cart`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
};
