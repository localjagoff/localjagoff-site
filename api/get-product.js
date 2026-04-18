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

    const productData = data.result;

    const product = {
      id: productData.id,
      name: productData.sync_product.name,

      // 👇 IMPORTANT FIX
      thumbnail_url: productData.sync_product.thumbnail_url,

      retail_price:
        productData.sync_variants[0]?.retail_price || '25.00'
    };

    res.status(200).json(product);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
