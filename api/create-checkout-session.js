const Stripe = require("stripe");
const { STORE_ID } = require("../lib/commerce-policy.cjs");
const { CommerceError, resolveCart, encodeItems, siteOrigin, assertCheckoutEnvironment } = require("../lib/commerce.cjs");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (process.env.CHECKOUT_PAUSED === "true") throw new CommerceError("Checkout temporarily paused", 503);
    assertCheckoutEnvironment(process.env);
    const items = await resolveCart(req.body?.items, { apiKey: process.env.PRINTFUL_API_KEY });
    const metadataItems = encodeItems(items);
    const siteUrl = siteOrigin(process.env);

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
          unit_amount: item.unit_amount,
        },
        quantity,
      };
    });

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
        items: metadataItems,
        commerce_version: "2",
      },

      success_url: `${siteUrl}/success`,
      cancel_url: `${siteUrl}/cart`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Checkout failed", { code: err instanceof CommerceError ? err.message : "stripe_request_failed" });
    return res.status(err instanceof CommerceError ? err.status : 503).json({
      error: err instanceof CommerceError ? err.message : "Checkout unavailable; please try again",
    });
  }
};
