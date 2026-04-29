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

    const siteUrl = req.headers.origin || "https://www.localjagoff.com";

    const makeAbsoluteImageUrl = (image) => {
      if (!image || typeof image !== "string") return null;

      if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
      }

      if (image.startsWith("/")) {
        return `${siteUrl}${image}`;
      }

      return `${siteUrl}/${image}`;
    };

    const line_items = items.map((item) => {
      const imageUrl = makeAbsoluteImageUrl(item.image);
      const cleanName = item.name || "Local Jagoff Item";
      const cleanVariant = item.variant_name || "";
      const quantity = item.quantity || 1;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: cleanName,
            description: cleanVariant
              ? `Size / Option: ${cleanVariant} • Quantity: ${quantity}`
              : `Quantity: ${quantity}`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(parseFloat(item.price) * 100),
        },
        quantity,
      };
    });

    const printfulMetadataItems = items.map((item) => ({
      product_id: item.id,
      sync_variant_id: item.variant_id,
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      allow_promotion_codes: true,

      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 599,
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

      success_url: `${siteUrl}/success`,
      cancel_url: `${siteUrl}/cart`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({
      error: "Checkout failed",
      message: err.message,
    });
  }
};
