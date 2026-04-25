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

    const getCategory = (productName) => {
      const name = (productName || "").toLowerCase();

      // IMPORTANT:
      // Hoodie/hat checks come before tee checks.
      // This prevents names like "Keystone ... Hoodie" from being misread as a tee
      // just because the letters "tee" appear inside the word "keystone".
      if (
        /\bhoodie\b/.test(name) ||
        /\bhoodies\b/.test(name) ||
        /\bpullover\b/.test(name) ||
        /\bpullovers\b/.test(name) ||
        /\bsweatshirt\b/.test(name) ||
        /\bsweatshirts\b/.test(name)
      ) {
        return "hoodies";
      }

      if (
        /\bhat\b/.test(name) ||
        /\bhats\b/.test(name) ||
        /\bcap\b/.test(name) ||
        /\bcaps\b/.test(name) ||
        /\btrucker\b/.test(name)
      ) {
        return "hats";
      }

      if (
        /\bt[-\s]?shirt\b/.test(name) ||
        /\bt[-\s]?shirts\b/.test(name) ||
        /\bshirt\b/.test(name) ||
        /\bshirts\b/.test(name) ||
        /\btee\b/.test(name) ||
        /\btees\b/.test(name)
      ) {
        return "tees";
      }

      return "other";
    };

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

          const result = detailData?.result || {};
          const variants = result.sync_variants || [];

          if (Array.isArray(variants) && variants.length > 0) {
            formattedVariants = variants.map((v) => {
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

        return {
          id: product.id,
          name: product.name,
          thumbnail_url: product.thumbnail_url || "",
          retail_price: basePrice,
          variants: formattedVariants,
          category: getCategory(product.name),
        };
      })
    );

    return res.status(200).json(products);
  } catch (err) {
    console.error("FATAL ERROR:", err);
    return res.status(200).json([]);
  }
}
