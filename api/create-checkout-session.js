const Stripe = require("stripe");
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
