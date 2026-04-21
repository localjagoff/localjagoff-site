export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.printful.com/sync/products/428983169",
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
