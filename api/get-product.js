export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const STORE_ID = "18032822";

    const response = await fetch(
      `https://api.printful.com/store/products/${id}?store_id=${STORE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    const product = data.result.sync_product;
    const variants = data.result.sync_variants;

    res.status(200).json({
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        retail_price: v.retail_price,
      })),
    });
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
