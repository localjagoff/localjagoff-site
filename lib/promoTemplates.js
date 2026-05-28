export const FREE_HOOKS = [
  "Fresh Local Jagoff gear, built for people who get the joke.",
  "Western PA energy, cleaned up just enough for public viewing.",
  "For the locals, the loud ones, and the beautifully difficult ones.",
  "A little local pride. A little smart mouth. That is the brand.",
  "Yeah, it says jagoff. That is kind of the point.",
  "Not tourist gear. Not fake tough. Just Local Jagoff.",
  "If you get it, you get it. If not, ask a jagoff from around here.",
];

export const FREE_OVERLAYS = [
  "LOCAL JAGOFF ENERGY",
  "FOR THE LOCALS",
  "WESTERN PA READY",
  "BLACK & GOLD ATTITUDE",
  "LOCALJAGOFF.COM",
];

export const FREE_CTAS = [
  "Grab it at localjagoff.com.",
  "Shop Local Jagoff at localjagoff.com.",
  "Check it out at localjagoff.com.",
  "If it feels like you, grab it at localjagoff.com.",
  "Local gear is waiting at localjagoff.com.",
];

export function normalizePromoProduct(product) {
  return {
    id: product?.id || "",
    name: product?.name || "Unnamed product",
    retail_price: product?.retail_price || product?.price || "",
    category: product?.category || "gear",
    thumbnail_url: product?.thumbnail_url || product?.image || "",
  };
}

export function formatPromoHashtags(tags) {
  return Array.isArray(tags) ? tags.join(" ") : String(tags || "").trim();
}

export function pickPromoTemplate(list, seed = 0) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list[Math.abs(seed) % list.length];
}

export function promoProductType(product) {
  const name = String(product?.name || "").toLowerCase();
  const category = String(product?.category || "gear").toLowerCase();
  if (category === "724" || name.includes("724")) return "724 gear";
  if (category === "hoodies" || name.includes("hoodie")) return "hoodie";
  if (category === "tees" || name.includes("tee") || name.includes("shirt")) return "shirt";
  if (category === "hats" || name.includes("hat") || name.includes("cap")) return "hat";
  return "gear";
}

function productUrl(product) {
  return product?.id ? `https://www.localjagoff.com/product/${product.id}` : "https://www.localjagoff.com";
}

function trackedUrl(product, platform, campaign = "promo") {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: String(campaign || "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo",
    utm_content: String(product?.name || "local-jagoff-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "local-jagoff-product",
  });
  return `${productUrl(product)}?${params.toString()}`;
}

export function makePromoHashtags(product) {
  const type = promoProductType(product);
  const tags = ["#LocalJagoff", "#Pittsburgh", "#Yinzer", "#WesternPA"];
  if (type === "724 gear") tags.push("#724");
  else tags.push("#412", "#724");
  if (type === "hoodie") tags.push("#HoodieSeason");
  if (type === "shirt") tags.push("#PittsburghShirts");
  if (type === "hat") tags.push("#PittsburghHats");
  return tags;
}

export function makeFreePromoPack(product, options = {}) {
  const cleanProduct = normalizePromoProduct(product);
  const name = cleanProduct.name;
  const seed = Date.now() + name.length + String(options.notes || "").length;
  const type = promoProductType(cleanProduct);
  const hookOne = pickPromoTemplate(FREE_HOOKS, seed);
  const hookTwo = pickPromoTemplate(FREE_HOOKS, seed + 1);
  const cta = pickPromoTemplate(FREE_CTAS, seed + 2);
  const hashtags = makePromoHashtags(cleanProduct);

  return {
    brand_angle: `${type} promo for Facebook and Instagram only.`.trim(),
    facebook_post: `${hookOne}\n\n${name}. Local gear for anyone who knows a jagoff when they see one.\n\n${cta}`,
    instagram_caption: `${hookTwo}\n\n${name}. Local gear with Western PA attitude.\n\n${formatPromoHashtags(hashtags)}`,
    hashtags,
    image_overlay_text: [pickPromoTemplate(FREE_OVERLAYS, seed + 3), "LOCALJAGOFF.COM"],
    alt_text: `${name} from Local Jagoff.`,
    clean_ad_version: `${name} is available now from Local Jagoff. Local gear with a bold Western PA feel. ${cta}`,
    edgy_version: `${name}. A little local pride. A little smart mouth. That is the brand.`,
    cta: [
      `Main CTA: ${cta}`,
      `First comment: ${cta}`,
      `Product link: ${productUrl(cleanProduct)}`,
      `Facebook tracked link: ${trackedUrl(cleanProduct, "facebook", options.mode || "promo")}`,
      `Instagram tracked link: ${trackedUrl(cleanProduct, "instagram", options.mode || "promo")}`,
    ].join("\n"),
    warnings: ["Free template mode did not use AI and costs $0."],
  };
}
