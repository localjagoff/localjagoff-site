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

    // 2. GET VARIANTS (THIS IS WHERE PRICE ACTUALLY IS)
    const variantRes = await fetch(
      `https://api.printful.com/sync/variants?store_id=${STORE_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const variantData = await variantRes.json();

    const priceMap = {};

    if (Array.isArray(variantData.result)) {
      variantData.result.forEach((variant) => {
        const productId = variant.sync_product_id;

        // take first valid price per product
        if (!priceMap[productId] && variant.retail_price) {
          priceMap[productId] = variant.retail_price;
        }
      });
    }

    // 3. MERGE PRODUCTS + PRICES
    const products = productData.result.map((product) => {
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
        retail_price: priceMap[product.id] || "0.00",
        category,
      };
    });

    res.status(200).json(products);

  } catch (err) {
    console.error("PRINTFUL ERROR:", err);
    res.status(200).json([]);
  }
}
