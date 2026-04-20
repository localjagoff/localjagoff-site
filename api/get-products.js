export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.printful.com/store/products", {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      },
    });

    const data = await response.json();

    const products = data.result.map((item) => {
      const name = item.sync_product.name.toLowerCase();

      let category = "other";

      if (name.includes("tee") || name.includes("shirt")) {
        category = "tees";
      } else if (name.includes("hoodie")) {
        category = "hoodies";
      } else if (name.includes("hat")) {
        category = "hats";
      }

      return {
        id: item.sync_product.id,
        name: item.sync_product.name,
        thumbnail_url: item.sync_product.thumbnail_url || "",
        retail_price:
          item.sync_variants?.[0]?.retail_price || "0.00",
        category,
      };
    });

    res.status(200).json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}
