export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.printful.com/store/products?store_id=18032822',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    // 🔍 Debug (optional but useful)
    console.log("FULL PRINTFUL RESPONSE:", JSON.stringify(data, null, 2));

    const products = (data.result || [])
      .filter(item => item && item.sync_product) // ✅ prevent crashes
      .map(item => ({
        id: item.sync_product.id,
        name: item.sync_product.name,
        thumbnail_url: item.sync_product.thumbnail_url,
        retail_price:
          item.sync_variants?.[0]?.retail_price || "25.00",
      }));

    res.status(200).json(products);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
