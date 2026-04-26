// Local Jagoff Product Sort System
// Manual display priority without breaking Printful auto-loading.
// Products listed here show first inside their own category.
// Products not listed still show automatically after the prioritized ones.

const FEATURED_PRODUCT_ORDER = [
  // Add product IDs here in the order you want them shown first.
  // Example:
  // 428982889,
  // 428821578,
  // 428980566,
];

export function sortProducts(products) {
  if (!Array.isArray(products)) return [];

  return [...products].sort((a, b) => {
    const aId = Number(a.id);
    const bId = Number(b.id);

    const aIndex = FEATURED_PRODUCT_ORDER.indexOf(aId);
    const bIndex = FEATURED_PRODUCT_ORDER.indexOf(bId);

    const aIsFeatured = aIndex !== -1;
    const bIsFeatured = bIndex !== -1;

    if (aIsFeatured && bIsFeatured) {
      return aIndex - bIndex;
    }

    if (aIsFeatured) return -1;
    if (bIsFeatured) return 1;

    return 0;
  });
}

export { FEATURED_PRODUCT_ORDER };
