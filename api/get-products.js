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

    if (!data.result) {
      return res.status(500).json(data);
    }

    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail_url: item.thumbnail_url,
      retail_price: item.variants?.[0]?.retail_price || "25.00"
    }));

    res.status(200).json(products);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
