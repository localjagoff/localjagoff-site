export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.printful.com/store/products?store_id=18032822',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    // 🔥 Transform Printful data → your frontend format
    const products = data.result.map(product => ({
      id: product.id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      retail_price: product.variants[0]?.retail_price || '25.00'
    }));

    res.status(200).json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
