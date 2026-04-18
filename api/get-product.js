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
    const p = data.result;

    const product = {
      id: p.id,
      name: p.name,
      thumbnail_url: p.thumbnail_url,
      retail_price: p.sync_variants[0]?.retail_price || '25.00'
    };

    res.status(200).json(product);

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
