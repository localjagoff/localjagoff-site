export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.printful.com/sync/products?limit=100",
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL RESPONSE:", JSON.stringify(data, null, 2));

    if (!data.result || !Array.isArray(data.result)) {
      return res.status(200).json([]);
    }

    const products = data.result.map((product) => {
      const name = (product.name || "").toLowerCase();

      let category = "other";

      if (name.includes("tee") || name.includes("shirt")) {
        category = "tees";
      } else if (name.includes("hoodie")) {
        category = "hoodies";
      } else if (name.includes("hat") || name.includes("cap")) {
        category = "hats";
      }

      return {
        id: product.id,
        name: product.name,
        thumbnail_url: product.thumbnail_url || "",
        retail_price:
          product.variants?.[0]?.retail_price || "0.00",
        category,
      };
    });

    res.status(200).json(products);

  } catch (err) {
    console.error("PRINTFUL ERROR:", err);
    res.status(200).json([]);
  }
}
