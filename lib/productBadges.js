// Local Jagoff Badge System
// Manual control only — no automatic assignment

export const BADGES = {
  NEW: "NEW",
  BEST_SELLER: "BEST SELLER",
  PITTSBURGH_FAVORITE: "PITTSBURGH FAVORITE",
  LIMITED_RUN: "LIMITED RUN",
};

export function getProductBadge(product) {
  if (!product) return null;

  const id = String(product.id);

  // 🔥 YOU control badges here
  const manualBadges = {
    // Example usage (uncomment when ready):
    // "428821578": BADGES.BEST_SELLER,
    // "428851698": BADGES.NEW,
    // "429208592": BADGES.LIMITED_RUN,
    // "428982889": BADGES.PITTSBURGH_FAVORITE,
  };

  return manualBadges[id] || null;
}
