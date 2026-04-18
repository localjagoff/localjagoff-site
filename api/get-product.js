export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://api.printful.com/store/sync/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    const product = data.result;

    // ✅ SAFETY CHECK
    if (!product || !product.sync_product) {
      return res.status(200).json({
        name: "Unknown Product",
        thumbnail_url: "",
        retail_price: "25.00"
      });
    }

    // ✅ SAFE ACCESS (no crashes)
    const price =
      product.sync_variants &&
      product.sync_variants.length > 0
        ? product.sync_variants[0].retail_price
        : "25.00";

    res.status(200).json({
      name: product.sync_product.name,
      thumbnail_url: product.sync_product.thumbnail_url,
      retail_price: price,
    });

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
