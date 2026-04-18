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
    const product = data.result;

    if (!product) {
      return res.status(200).json({
        name: "Unknown Product",
        thumbnail_url: "",
        variants: []
      });
    }

    res.status(200).json({
      name: product.sync_product.name,
      thumbnail_url: product.sync_product.thumbnail_url,
      variants: product.sync_variants.map(v => ({
        id: v.id,
        size: v.size,
        price: v.retail_price
      }))
    });

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
