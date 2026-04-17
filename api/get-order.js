export default async function handler(req, res) {
  const response = await fetch(
    'https://api.printful.com/orders/155006835?store_id=18032822',
    {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
