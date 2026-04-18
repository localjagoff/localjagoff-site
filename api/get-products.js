export default async function handler(req, res) {
  try {
    const STORE_ID = "18032822";

    const listResponse = await fetch(
      `https://api.printful.com/store/products?store_id=${STORE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const listData = await listResponse.json();

    // 🔥 Now fetch FULL product data for each item
    const detailedProducts = await Promise.all(
      listData.result.map(async (item) => {
        const detailRes = await fetch(
          `https://api.printful.com/store/products/${item.id}?store_id=${STORE_ID}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
            },
          }
        );

        const detailData = await detailRes.json();

        const product = detailData.result.sync_product;
        const variants = detailData.result.sync_variants;

        return {
          id: product.id,
          name: product.name,
          thumbnail_url: product.thumbnail_url,
          retail_price:
            variants && variants.length > 0
              ? variants[0].retail_price
              : "0.00",
        };
      })
    );

    res.status(200).json(detailedProducts);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
