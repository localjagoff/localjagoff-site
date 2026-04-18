export default async function handler(req, res) {
  try {
    const { id } = req.query;

    const headers = {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    };

    // ✅ 1. Get product info
    const productRes = await fetch(
      `https://api.printful.com/store/products/${id}?store_id=${process.env.PRINTFUL_STORE_ID}`,
      { headers }
    );

    const productData = await productRes.json();

    if (!productData.result) {
      return res.status(400).json({
        error: "Product not found",
        debug: productData,
      });
    }

    const product = productData.result;

    // ✅ 2. Get variants PROPERLY
    const variantRes = await fetch(
      `https://api.printful.com/store/products/${id}/variants?store_id=${process.env.PRINTFUL_STORE_ID}`,
      { headers }
    );

    const variantData = await variantRes.json();

    if (!variantData.result) {
      return res.status(400).json({
        error: "Variants not found",
        debug: variantData,
      });
    }

    const variants = variantData.result.map((v) => ({
      variant_id: v.id,
      name: v.name,
      retail_price: v.retail_price,
    }));

    res.status(200).json({
      id: product.id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      variants,
    });

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
