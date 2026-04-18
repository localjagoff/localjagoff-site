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

    if (!data.result) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = data.result.sync_product;
    const variants = data.result.sync_variants;

    res.status(200).json({
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      retail_price: variants?.[0]?.retail_price || "0.00",
      variants: variants || [],
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
