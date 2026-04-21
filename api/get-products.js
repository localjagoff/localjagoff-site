export default async function handler(req, res) {
  try {
    const STORE_ID = 18032822;

    const response = await fetch(
      `https://api.printful.com/sync/products?store_id=${STORE_ID}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    return res.status(200).json({
      raw: data
    });

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
