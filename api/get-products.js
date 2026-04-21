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

    // 2. FETCH EACH PRODUCT DETAIL (CORRECTLY PARSED)
    const products = await Promise.all(
      productData.result.map(async (product) => {
        let price = "0.00";

        try {
          const detailRes = await fetch(
            `https://api.printful.com/sync/products/${product.id}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
              },
            }
          );

          const detailData = await detailRes.json();

          // 🔥 THIS IS THE FIX
          const variants =
            detailData?.result?.sync_variants ||
            detailData?.result?.variants ||
            [];

          if (variants.length > 0) {
            price =
              variants[0].retail_price ||
              variants[0].price ||
              "0.00";
          }

        } catch (err) {
          console.error("DETAIL ERROR:", err);
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

    res.status(200).json(products);

  } catch (err) {
    console.error("PRINTFUL ERROR:", err);
    res.status(200).json([]);
  }
}
