export default async function handler(req, res) {
  try {
    const STORE_ID = 18032822;

    // 1. GET SYNC PRODUCTS (IDs + names)
    const syncRes = await fetch(
      `https://api.printful.com/sync/products?store_id=${STORE_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const syncData = await syncRes.json();

    if (!syncData.result || !Array.isArray(syncData.result)) {
      return res.status(200).json([]);
    }

    // 2. GET STORE PRODUCTS (HAS PRICES)
    const storeRes = await fetch(
      `https://api.printful.com/store/products`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const storeData = await storeRes.json();

    const priceMap = {};

    if (Array.isArray(storeData.result)) {
      storeData.result.forEach((item) => {
        const product = item.sync_product;

        if (product && item.sync_variants?.length > 0) {
          priceMap[product.id] =
            item.sync_variants[0].retail_price || "0.00";
        }
      });
    }

    // 3. MERGE DATA
    const products = syncData.result.map((product) => {
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
