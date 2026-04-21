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

    // 2. FETCH EACH PRODUCT'S VARIANTS (CORRECT WAY)
    const productsWithPrices = await Promise.all(
      productData.result.map(async (product) => {
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

          let price = "0.00";

          if (
            detailData.result &&
            detailData.result.sync_variants &&
            detailData.result.sync_variants.length > 0
          ) {
            price = detailData.result.sync_variants[0].retail_price || "0.00";
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
        } catch {
          return {
            id: product.id,
            name: product.name,
            thumbnail_url: product.thumbnail_url || "",
            retail_price: "0.00",
            category: "other",
          };
        }
      })
    );

    res.status(200).json(productsWithPrices);

  } catch (err) {
    console.error("PRINTFUL ERROR:", err);
    res.status(200).json([]);
  }
}
