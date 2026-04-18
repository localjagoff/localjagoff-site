export default async function handler(req, res) {
  try {
    const { id } = req.query;

    const response = await fetch(
      `https://api.printful.com/store/products/${id}?store_id=${process.env.PRINTFUL_STORE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.result) {
      return res.status(400).json({
        error: "No product found",
        debug: data,
      });
    }

    const product = data.result;

    // ✅ THIS is your correct structure (what worked before)
    const variants = (product.variants || []).map((v) => ({
      variant_id: v.id,
      name: v.name,
      retail_price: v.retail_price,
    }));

    res.status(200).json({
      id: product.id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      variants,
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
