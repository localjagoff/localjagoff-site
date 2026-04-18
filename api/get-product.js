export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://api.printful.com/store/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL SINGLE PRODUCT:", JSON.stringify(data, null, 2));

    const product = data.result;

    if (!product) {
      return res.status(200).json({
        name: "Unknown Product",
        thumbnail_url: "",
        retail_price: "25.00"
      });
    }

    res.status(200).json({
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      retail_price: product.variants?.[0]?.retail_price || "25.00"
    });

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
