import policy from "../lib/commerce-policy.cjs";
const { STORE_ID, HIDDEN_PRODUCT_IDS, getDisplayProductName } = policy;

function detectCategory(productName) {
  const name = String(productName || "").toLowerCase();

  const words = name
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

  const hasAnyWord = (terms) => terms.some((term) => words.includes(term));

  if (words.includes("724") || name.includes("724")) {
    return "724";
  }

  if (
    hasAnyWord([
      "hoodie",
      "hoodies",
      "pullover",
      "pullovers",
      "sweatshirt",
      "sweatshirts",
      "crewneck",
      "crewnecks",
      "fleece",
    ])
  ) {
    return "hoodies";
  }

  if (
    hasAnyWord([
      "hat",
      "hats",
      "cap",
      "caps",
      "trucker",
      "beanie",
      "beanies",
    ])
  ) {
    return "hats";
  }

  if (
    hasAnyWord([
      "tee",
      "tees",
      "tshirt",
      "tshirts",
      "shirt",
      "shirts",
      "tank",
      "tanks",
    ]) ||
    name.includes("t-shirt") ||
    name.includes("t-shirts")
  ) {
    return "tees";
  }

  return "other";
}

export default async function handler(req, res) {
  try {
    const productRes = await fetch(
      `https://api.printful.com/sync/products?store_id=${STORE_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        },
      }
    );

    const productData = await productRes.json();

    if (!productData.result || !Array.isArray(productData.result)) {
      return res.status(200).json([]);
    }

    const visibleProducts = productData.result.filter(
      (product) => !HIDDEN_PRODUCT_IDS.has(Number(product?.id))
    );

    const products = await Promise.all(
      visibleProducts.map(async (product) => {
        const displayName = getDisplayProductName(product);
        let basePrice = "0.00";
        let formattedVariants = [];

        try {
          const detailRes = await fetch(
            `https://api.printful.com/sync/products/${product.id}?store_id=${STORE_ID}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
              },
            }
          );

          const detailData = await detailRes.json();
          const result = detailData?.result || {};
          const variants = result.sync_variants || [];

          if (Array.isArray(variants) && variants.length > 0) {
            formattedVariants = variants.map((v) => {
              let label = v.name || "Default";

              if (label.includes("/")) {
                label = label.split("/").pop().trim();
              }

              return {
                id: v.id,
                name: label,
                price: v.retail_price || "0.00",
              };
            });

            basePrice = formattedVariants[0]?.price || "0.00";
          }
        } catch (err) {
          console.error("catalog_detail_failed", { product_id: product.id });
        }

        return {
          id: product.id,
          name: displayName,
          raw_name: product.name,
          thumbnail_url: product.thumbnail_url || "",
          retail_price: basePrice,
          variants: formattedVariants,
          category: detectCategory(displayName),
        };
      })
    );

    return res.status(200).json(products);
  } catch (err) {
    console.error("catalog_request_failed");
    return res.status(500).json({
      error: "Failed to load products",
    });
  }
}
