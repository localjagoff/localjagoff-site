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

    const product = {
      id: data.result.id,
      name: data.result.name,
      thumbnail_url: data.result.thumbnail_url,
      retail_price: data.result.variants[0]?.retail_price || '25.00'
    };

    res.status(200).json(product);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
