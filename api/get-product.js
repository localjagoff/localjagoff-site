export default async function handler(req, res) {
  try {
    const { id } = req.query;

    const response = await fetch(
      `https://api.printful.com/store/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("PRINTFUL RAW:", JSON.stringify(data, null, 2));

    if (!data.result) {
      return res.status(400).json({
        error: "No product found",
        debug: data,
      });
    }

    const product = data.result;

    // 🔥 HANDLE EVERY POSSIBLE FORMAT
    let rawVariants = [];

    if (product.variants && product.variants.length) {
      rawVariants = product.variants;
    } else if (product.sync_variants && product.sync_variants.length) {
      rawVariants = product.sync_variants;
    } else if (product.files && product.files.length) {
      // fallback if weird structure
      rawVariants = product.files;
    }

    const variants = rawVariants.map((v) => ({
      variant_id: v.id || v.variant_id,
      name: v.name || v.title || "Option",
      retail_price: v.retail_price || v.price || "0",
    }));

    return res.status(200).json({
      id: product.id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      variants,
      debug: rawVariants, // 🔥 critical for next step if needed
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
