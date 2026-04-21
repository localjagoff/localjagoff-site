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

    // 2. GET VARIANTS (FOR PRICING)
    const variantRes = await fetch(
      `https://api.printful.com/sync/variant?store_id=${STORE_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const variantData = await variantRes.json();

    const variantMap = {};

    if (Array.isArray(variantData.result)) {
      variantData.result.forEach((v) => {
        variantMap[v.product_id] = v.retail_price;
      });
    }

    // 3. FORMAT PRODUCTS
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
        retail_price: variantMap[product.id] || "0.00",
        category,
      };
    });

    res.status(200).json(products);

  } catch (err) {
    console.error("PRINTFUL ERROR:", err);
    res.status(200).json([]);
  }
}
