export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://api.printful.com/store/products/${id}?store_id=18032822`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL PRODUCT:", JSON.stringify(data, null, 2));

    const product = data.result;

    if (!product) {
      return res.status(200).json({
        name: "Unknown Product",
        thumbnail_url: "",
        retail_price: "25.00"
      });
    }

    res.status(200).json({
      name: product.sync_product?.name || "Unknown Product",
      thumbnail_url: product.sync_product?.thumbnail_url || "",
      retail_price: product.sync_variants?.[0]?.retail_price || "25.00",
    });

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
