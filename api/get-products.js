const STORE_ID = 18032822;

const PRODUCT_NAME_OVERRIDES = {
  428550417: "Certified Jagoff T-Shirt",
  428821578: "Pittsburgh Local Jagoff Keystone Hoodie",
  428851513: "Local Jagoff 412 Sideways Tee",
  428851608: "Local Jagoff Steel City Front and Back Tee",
  428851698: "Local Jagoff Keystone 412 Tee",
  428851907: "Local Jagoff Trucker Cap",
  428980566: "Local Jagoff Trucker Hat",
  428982889: "Local Jagoff Keystone Tee",
  428983169: "Local Jagoff Keystone 412 Hoodie",
  429208592: "Local Jagoff Keystone Hoodie",
  429536493: "Local Jagoff 412 Tee",
  429728777: "Local Jagoff Stamp Tee",
  429821634: "Local Jagoff Tee",
  430697388: "Local Jagoff PGH OG Tee",
  430925200: "Local Jagoff Diagonal Tee",
  430964873: "Local Jagoff Keystone 724 Tee",
};

function getDisplayProductName(product) {
  const override = PRODUCT_NAME_OVERRIDES[Number(product?.id)];
  if (override) return override;
  return String(product?.name || "Local Jagoff Product").trim() || "Local Jagoff Product";
}

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

    const products = await Promise.all(
      productData.result.map(async (product) => {
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
          console.error("DETAIL ERROR:", product.id, err.message);
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
    console.error("FATAL ERROR:", err);
    return res.status(500).json({
      error: "Failed to load products",
      message: err.message,
    });
  }
}
