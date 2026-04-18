export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.printful.com/store/products?store_id=18032822',
      {
        headers: {
          'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    res.status(200).json(data.result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
