const Stripe = require("stripe");
const { STORE_ID } = require("../lib/commerce-policy.cjs");
const { CommerceError, resolveCart, encodeItems, siteOrigin, assertCheckoutEnvironment } = require("../lib/commerce.cjs");
const { couponCode } = require("../lib/meta-checkout.cjs");
const { receiptCookie, CLEAR_COOKIE } = require('../lib/checkout-receipt.cjs');

function createCheckoutHandler({env=process.env,stripeFactory=(key)=>new Stripe(key,
  {timeout:10000,maxNetworkRetries:0,httpClient:Stripe.createFetchHttpClient()}),fetchImpl}={}) {
return async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (env.CHECKOUT_PAUSED === "true") throw new CommerceError("Checkout temporarily paused", 503);
    assertCheckoutEnvironment(env);
    const stripe = stripeFactory(env.STRIPE_SECRET_KEY);
    const coupon = couponCode(req.body?.coupon);
    const items = await resolveCart(req.body?.items, { apiKey: env.PRINTFUL_API_KEY,...(fetchImpl?{fetchImpl}:{}) });
    const metadataItems = encodeItems(items);
    const siteUrl = siteOrigin(env);
    let promotionId;
    if (coupon) {
      const promotions = await stripe.promotionCodes.list({ code: coupon, active: true, limit: 2 });
      if (promotions.data.length !== 1 || !promotions.data[0].active ||
          promotions.data[0].coupon?.valid === false) {
        throw new CommerceError("Promo code is invalid or unavailable");
      }
      promotionId = promotions.data[0].id;
    }

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
      ...(promotionId ? { discounts: [{ promotion_code: promotionId }] } : { allow_promotion_codes: true }),

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

    const cookie = req.body?.measurement_consent === true ? receiptCookie(session.id, env) : null;
    res.setHeader('Set-Cookie', cookie || CLEAR_COOKIE);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ url: session.url,
      measurement_items: items.map(({ id, variant_id, quantity, unit_amount }) => ({ id, variant_id, quantity, unit_amount })) });
  } catch (err) {
    console.error("Checkout failed", { code: err instanceof CommerceError ? err.message : "stripe_request_failed" });
    return res.status(err instanceof CommerceError ? err.status : 503).json({
      error: err instanceof CommerceError ? err.message : "Checkout unavailable; please try again",
    });
  }
};
}
module.exports=createCheckoutHandler();
module.exports.createCheckoutHandler=createCheckoutHandler;
