// Google-only presentation. Storefront and Meta retain their approved artwork.
// These are original Printful renders of the existing custom Local Jagoff products.
const { standardShippingCents, PRINTFUL_US } = require('./shipping-policy.cjs');
const GOOGLE_SHIPPING_FIELDS = [
  'shipping(country:service:price:min_handling_time:max_handling_time:min_transit_time:max_transit_time)',
  'shipping_handling_business_days', 'shipping_transit_business_days',
  'handling_cutoff_time(country:cutoff_time:cutoff_timezone)',
];
const products = {
  471744647: { gender: "male" },
  471744585: { gender: "male" },
  471950476: { gender: "male" },
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
const GOOGLE_STAGED_PRODUCT_IDS = new Set([471744647,471744585,471950476,471744283]);

function googleAttributes(id) {
  const product = products[id];
  if (!product) throw new Error("Google product presentation not reviewed");
  return { ...product, age_group: "adult", identifier_exists: "no",
    image_link: `https://www.localjagoff.com/images/google/${id}.jpg`,
    additional_image_link: "",
    // Offer-level cost overrides also override account delivery estimates.
    // Supply the existing handling/transit/calendar/cutoff explicitly.
    [GOOGLE_SHIPPING_FIELDS[0]]: `US:Standard Shipping:${(standardShippingCents([{id,quantity:1}])/100).toFixed(2)} USD:${PRINTFUL_US.handlingMin}:${PRINTFUL_US.handlingMax}:${PRINTFUL_US.transitMin}:${PRINTFUL_US.transitMax}`,
    shipping_handling_business_days: 'Mon-Fri',
    shipping_transit_business_days: 'Mon-Fri',
    [GOOGLE_SHIPPING_FIELDS[3]]: 'US:"14:00":America/New_York',
  };
}

module.exports = { googleAttributes, products, GOOGLE_APPROVED_PRODUCT_IDS, GOOGLE_STAGED_PRODUCT_IDS, GOOGLE_SHIPPING_FIELDS };
