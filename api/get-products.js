export default async function handler(req, res) {
  try {
    const STORE_ID = 18032822;

    // 1. GET PRODUCTS
    const productRes = await fetch(
      `https://api.printful.com/sync/products?store_id=${STORE_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const productData = await productRes.json();

    if (!productData.result || !Array.isArray(productData.result)) {
      return res.status(200).json([]);
    }

    // 2. GET DETAILS PER PRODUCT
    const products = await Promise.all(
      productData.result.map(async (product) => {
        let basePrice = "0.00";
        let formattedVariants = [];

        try {
          const detailRes = await fetch(
            `https://api.printful.com/sync/products/${product.id}?store_id=${STORE_ID}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
              },
            }
          );

          const detailData = await detailRes.json();

          // 🔥 THIS IS THE IMPORTANT PART
          const result = detailData?.result || {};

          // Printful structure (your account uses this)
          const variants = result.sync_variants || [];

          if (Array.isArray(variants) && variants.length > 0) {
            formattedVariants = variants.map((v) => {
              // Extract size safely
              let label = v.name || "Default";

              if (label.includes("/")) {
                label = label.split("/").pop().trim();
              }

              return {
                id: v.id,
                name: label,
                price: v.retail_price || "0.00",
              };
            });

            basePrice = formattedVariants[0]?.price || "0.00";
          }

        } catch (err) {
          console.error("DETAIL ERROR:", product.id, err.message);
        }

        const name = (product.name || "").toLowerCase();

        let category = "other";

        if (name.includes("tee") || name.includes("shirt")) {
          category = "tees";
        } else if (name.includes("hoodie")) {
          category = "hoodies";
        } else if (name.includes("hat") || name.includes("cap")) {
          category = "hats";
        }

        return {
          id: product.id,
          name: product.name,
          thumbnail_url: product.thumbnail_url || "",
          retail_price: basePrice,
          variants: formattedVariants,
          category,
        };
      })
    );

    return res.status(200).json(products);

  } catch (err) {
    console.error("FATAL ERROR:", err);
    return res.status(200).json([]);
  }
}
