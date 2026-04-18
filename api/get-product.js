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

    // 🧠 SAFE extraction
    const name = p?.name || 'Unknown Product';

    const thumbnail =
      p?.thumbnail_url ||
      p?.files?.[0]?.preview_url ||
      '';

    // 🔥 FIX: handle missing variants safely
    const price =
      p?.sync_variants?.[0]?.retail_price ||
      p?.variants?.[0]?.retail_price ||
      '25.00';

    const product = {
      id: p?.id,
      name,
      thumbnail_url: thumbnail,
      retail_price: price
    };

    res.status(200).json(product);

  } catch (err) {
    console.error('GET PRODUCT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}
