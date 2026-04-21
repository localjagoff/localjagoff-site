export default async function handler(req, res) {
  try {
    const STORE_ID = 18032822;

    // GET PRODUCTS LIST
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

    // BUILD PRODUCTS WITH PRICES (SAFE)
    const products = await Promise.all(
      productData.result.map(async (product) => {
        let price = "0.00";

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

          const variants =
            result.sync_variants ||
            result.variants ||
            result.product?.variants ||
            [];

          if (Array.isArray(variants) && variants.length > 0) {
            price =
              variants[0]?.retail_price ||
              variants[0]?.price ||
              variants[0]?.retailPrice ||
              "0.00";
          }

        } catch (err) {
          console.error("DETAIL FETCH ERROR:", product.id, err.message);
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
          retail_price: price,
          category,
        };
      })
    );

    return res.status(200).json(products);

  } catch (err) {
    console.error("FATAL API ERROR:", err);
    return res.status(200).json([]);
  }
}
