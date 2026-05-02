// Local Jagoff Featured Products
// Controls the homepage Featured Picks strip.
// Add Printful sync product IDs here in the exact order you want them shown.
// If this list is empty, the Featured Picks section will not show.

export const FEATURED_PRODUCT_IDS = [
  428982889,
  428983169,
  429536493,
];

export function getFeaturedProducts(products) {
  if (!Array.isArray(products) || FEATURED_PRODUCT_IDS.length === 0) {
    return [];
  }

  return FEATURED_PRODUCT_IDS
    .map((id) => products.find((product) => String(product.id) === String(id)))
    .filter(Boolean);
}
