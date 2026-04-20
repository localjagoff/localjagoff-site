export default async function handler(req, res) {
  try {
    console.log("API KEY EXISTS:", !!process.env.PRINTFUL_API_KEY);

    const key = process.env.PRINTFUL_API_KEY;

    if (!key) {
      return res.status(200).json({
        error: "NO API KEY FOUND IN ENV",
      });
    }

    const response = await fetch("https://api.printful.com/sync/products", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    const data = await response.json();

    return res.status(200).json({
      debug: true,
      hasKey: true,
      raw: data,
    });

  } catch (err) {
    return res.status(200).json({
      error: err.message,
    });
  }
}
