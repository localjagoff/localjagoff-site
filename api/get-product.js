export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing product id" });
    }

    const STORE_ID = "18032822"; // ← your store id

    const response = await fetch(
      `https://api.printful.com/store/products/${id}?store_id=${STORE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL RESPONSE:", JSON.stringify(data, null, 2));

    if (!data || !data.result) {
      return res.status(500).json({
        error: "Invalid Printful response",
        debug: data,
      });
    }

    const product = data.result.sync_product;
    const variants = data.result.sync_variants;

    res.status(200).json({
      name: product?.name || "Unknown Product",
      thumbnail_url: product?.thumbnail_url || "",
      retail_price: variants?.[0]?.retail_price || "0.00",
      variants: variants || [],
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
