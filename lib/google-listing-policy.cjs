// Google-only presentation. Storefront and Meta retain their approved artwork.
// These are original Printful renders of the existing custom Local Jagoff products.
const products = {
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
  430697388: { gender: "male" },
  430964873: { gender: "male" },
};

function googleAttributes(id) {
  const product = products[id];
  if (!product) throw new Error("Google product presentation not reviewed");
  return { ...product, age_group: "adult", identifier_exists: "no",
    image_link: `https://www.localjagoff.com/images/google/${id}.jpg`,
    additional_image_link: "" };
}

module.exports = { googleAttributes, products };
