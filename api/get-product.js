export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing product id" });
    }

    const response = await fetch(
      `https://api.printful.com/store/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL RESPONSE:", JSON.stringify(data, null, 2));

    // 🔴 HARD SAFETY CHECKS
    if (!data || !data.result) {
      return res.status(500).json({
        error: "Invalid Printful response",
        debug: data,
      });
    }

    const product = data.result.sync_product || null;
    const variants = data.result.sync_variants || [];

    if (!product) {
      return res.status(500).json({
        error: "Missing product data",
        debug: data,
      });
    }

    res.status(200).json({
      name: product.name || "Unknown Product",
      thumbnail_url: product.thumbnail_url || "",
      retail_price: variants[0]?.retail_price || "0.00",
      variants: variants,
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
