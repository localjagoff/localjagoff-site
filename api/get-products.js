export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.printful.com/store/products',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL RAW:", JSON.stringify(data, null, 2));

    res.status(200).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
