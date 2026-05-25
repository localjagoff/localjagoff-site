export const FREE_HOOKS = [
  "New drop for anyone who knows exactly what a jagoff is.",
  "For the people who can talk trash and still hold the door open.",
  "Western PA attitude, cleaned up just enough for public viewing.",
  "Not tourist gear. Not fake tough. Just Local Jagoff.",
  "Put this one on before somebody asks a dumb question.",
  "Local gear for jagoff behavior.",
  "For the 412, 724, and every jagoff in between.",
  "A little Pittsburgh. A little problem. A lot of Local Jagoff.",
  "Black-and-gold attitude without looking like a stadium gift shop.",
  "For anyone who says they are leaving in five and absolutely is not.",
];

export const FREE_OVERLAYS = [
  "LOCAL JAGOFF ENERGY",
  "NEW DROP LIVE",
  "FOR THE LOCALS",
  "BUILT FOR JAGOFFS",
  "PITTSBURGH ATTITUDE",
  "412 / 724 READY",
  "NO BORING GEAR",
  "LOCALJAGOFF.COM",
];

export const FREE_CTAS = [
  "Grab it at localjagoff.com.",
  "Shop the drop at localjagoff.com.",
  "Get yours at localjagoff.com.",
  "Go be a jagoff in something better: localjagoff.com.",
  "New gear is live now at localjagoff.com.",
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
  return Array.isArray(tags) ? tags.join(" ") : "";
}

export function pickPromoTemplate(list, seed = 0) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list[Math.abs(seed) % list.length];
}

export function promoProductType(product) {
  const name = String(product?.name || "").toLowerCase();
  const category = String(product?.category || "gear").toLowerCase();

  if (category === "hoodies" || name.includes("hoodie")) return "hoodie";
  if (category === "tees" || name.includes("tee") || name.includes("shirt")) return "shirt";
  if (category === "hats" || name.includes("hat") || name.includes("cap")) return "hat";
  if (category === "724" || name.includes("724")) return "724 gear";
  return "gear";
}

export function makePromoHashtags(product) {
  const tags = [
    "#LocalJagoff",
    "#Pittsburgh",
    "#Yinzer",
    "#WesternPA",
    "#412",
    "#724",
  ];

  const type = promoProductType(product);

  if (type === "hoodie") tags.push("#HoodieSeason");
  if (type === "shirt") tags.push("#PittsburghShirts");
  if (type === "hat") tags.push("#PittsburghHats");

  return tags;
}

export function makeFreePromoPack(product, options = {}) {
  const cleanProduct = normalizePromoProduct(product);
  const name = cleanProduct.name;
  const type = promoProductType(cleanProduct);
  const seed = Date.now() + name.length + String(options.notes || "").length;
  const hookOne = pickPromoTemplate(FREE_HOOKS, seed + 1);
  const hookTwo = pickPromoTemplate(FREE_HOOKS, seed + 2);
  const hookThree = pickPromoTemplate(FREE_HOOKS, seed + 3);
  const cta = pickPromoTemplate(FREE_CTAS, seed + 4);
  const overlayOne = pickPromoTemplate(FREE_OVERLAYS, seed + 5);
  const overlayTwo = pickPromoTemplate(FREE_OVERLAYS, seed + 6);
  const tone = options.toneIntensity || "balanced";

  const cleanLine = `${name} is live at Local Jagoff — Pittsburgh-inspired ${type} with a local edge.`;
  const edgeLine =
    tone === "clean"
      ? cleanLine
      : `${name}. Local gear for anyone who knows a jagoff when they see one.`;

  return {
    brand_angle:
      "A Local Jagoff promo pack built from saved templates. No API call, no extra cost.",
    facebook_post: `${hookOne}\n\n${edgeLine}\n\n${cta}`,
    instagram_caption: `${name} just hit the site. ${hookTwo}\n\n${cta}\n\n${formatPromoHashtags(
      makePromoHashtags(cleanProduct)
    )}`,
    tiktok_caption: `${hookThree} ${cta} ${formatPromoHashtags(
      makePromoHashtags(cleanProduct).slice(0, 4)
    )}`,
    youtube_shorts_title: `${name} | Local Jagoff Drop`,
    youtube_shorts_description: `${name} from Local Jagoff. Pittsburgh / Western PA attitude, no boring gear. ${cta}`,
    hashtags: makePromoHashtags(cleanProduct),
    video_hooks: [
      hookOne,
      hookTwo,
      hookThree,
      `If you know what jagoff means, this ${type} makes sense.`,
      `Local Jagoff drop check: ${name}.`,
    ],
    short_video_script: [
      {
        scene: "Scene 1",
        visual: "Product image pops in over a gritty black-and-gold background.",
        on_screen_text: overlayOne,
        voiceover: hookOne,
      },
      {
        scene: "Scene 2",
        visual: "Quick zoom on the design/product details.",
        on_screen_text: name,
        voiceover: edgeLine,
      },
      {
        scene: "Scene 3",
        visual: "End card with Local Jagoff logo/site URL.",
        on_screen_text: "LOCALJAGOFF.COM",
        voiceover: cta,
      },
    ],
    image_overlay_text: [overlayOne, overlayTwo, "LOCALJAGOFF.COM"],
    alt_text: `${name} from Local Jagoff, shown as Pittsburgh-inspired ${type}.`,
    clean_ad_version: `${name} is available now from Local Jagoff. Pittsburgh-inspired ${type} with a bold local feel. ${cta}`,
    edgy_version: edgeLine,
    cta,
    warnings: [
      "Free template mode did not use AI and costs $0.",
      "Review before posting. No auto-publishing is enabled yet.",
    ],
  };
}
