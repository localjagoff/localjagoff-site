// Google-only presentation. Storefront and Meta retain their approved artwork.
// These are original Printful renders of the existing custom Local Jagoff products.
const products = {
  471744647: { gender: "male" },
  471744585: { gender: "male" },
  471744477: { gender: "male" },
  471744283: { gender: "male" },
  428821578: { gender: "unisex" },
  428851513: { gender: "male" },
  428851608: { gender: "male" },
  428851698: { gender: "male" },
  428851907: { gender: "unisex" },
  428980566: { gender: "unisex" },
  428982889: { gender: "male" },
  428983169: { gender: "unisex" },
  429208592: { gender: "unisex" },
  429536493: { gender: "male" },
  429728777: { gender: "male" },
  429821634: { gender: "male" },
  430964873: { gender: "male" },
};

// Separate channel approval: keep the submitted Google review catalog fixed.
// Staging metadata or storefront approval must never implicitly publish to Google.
const GOOGLE_APPROVED_PRODUCT_IDS = new Set([
  428821578,428851513,428851608,428851698,428851907,428980566,428982889,
  428983169,429208592,429536493,429728777,429821634,430964873,
]);
const GOOGLE_STAGED_PRODUCT_IDS = new Set([471744647,471744585,471744477,471744283]);

function googleAttributes(id) {
  const product = products[id];
  if (!product) throw new Error("Google product presentation not reviewed");
  return { ...product, age_group: "adult", identifier_exists: "no",
    image_link: `https://www.localjagoff.com/images/google/${id}.jpg`,
    additional_image_link: "" };
}

module.exports = { googleAttributes, products, GOOGLE_APPROVED_PRODUCT_IDS, GOOGLE_STAGED_PRODUCT_IDS };
