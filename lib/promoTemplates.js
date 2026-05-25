import {
  MODE_ANGLES,
  PRODUCT_HOOKS,
  PRODUCT_OVERLAYS,
} from "./promoProductPools";

export const FREE_HOOKS = [
  "New drop for anyone who knows exactly what a jagoff is.",
  "For the people who can talk trash and still hold the door open.",
  "Western PA attitude, cleaned up just enough for public viewing.",
  "Not tourist gear. Not fake tough. Just Local Jagoff.",
  "Put this one on before somebody asks a dumb question.",
  "Local gear for jagoff behavior.",
  "For Western PA jagoffs who get it.",
  "A little Pittsburgh. A little problem. A lot of Local Jagoff.",
  "Black-and-gold attitude without looking like a stadium gift shop.",
  "For anyone who says they are leaving in five and absolutely is not.",
  "This is not polished influencer gear. Good.",
  "For parking lot conversations that were supposed to end ten minutes ago.",
  "For yinzers, locals, and the jagoffs who love them.",
  "Pittsburgh attitude without the fake tough-guy routine.",
  "Wear it like you got somewhere to be and still stopped to talk.",
  "A fresh drop with just enough attitude to start a conversation.",
  "For anyone who knows black and gold is more than a color scheme.",
  "Not made for everyone. That is kind of the point.",
  "For the jagoff who has an opinion before the light turns green.",
  "A little local pride. A little smart mouth. That is the brand.",
  "For anyone who can take a joke and give one back.",
  "Western PA gear with a little side-eye built in.",
  "If you have to ask what jagoff means, this might not be for you.",
  "For the kind of person who says 'real quick' and means forty minutes.",
  "Clean enough to wear out. Jagoff enough to feel right.",
  "Local Jagoff gear for people who are proudly a little hard to impress.",
  "Built for the locals, the loud ones, and the beautifully difficult ones.",
  "For every jagoff who still somehow has good taste.",
  "The drop is live. Try not to act normal about it.",
  "For the ones who know exactly which bridge they hate today.",
  "A little grit, a little gold, a little jagoff behavior.",
  "Wear this when you want the outfit to have an opinion too.",
  "For Western PA people who do not need everything explained.",
  "Your regular clothes were acting too polite.",
  "New gear for old grudges, bad roads, and good taste.",
];

export const FREE_OVERLAYS = [
  "LOCAL JAGOFF ENERGY",
  "NEW DROP LIVE",
  "FOR THE LOCALS",
  "BUILT FOR JAGOFFS",
  "PITTSBURGH ATTITUDE",
  "WESTERN PA READY",
  "NO BORING GEAR",
  "LOCALJAGOFF.COM",
  "JAGOFF BEHAVIOR",
  "WESTERN PA ENERGY",
  "BLACK & GOLD ATTITUDE",
  "NOT FOR TOURISTS",
  "LOCAL ATTITUDE",
  "YINZER APPROVED",
  "LOCAL GEAR. LOCAL MOUTH.",
  "DROP IS LIVE",
];

export const FREE_CTAS = [
  "Grab it at localjagoff.com.",
  "Shop the drop at localjagoff.com.",
  "Get yours at localjagoff.com.",
  "Go be a jagoff in something better: localjagoff.com.",
  "New gear is live now at localjagoff.com.",
  "Check the drop at localjagoff.com.",
  "Go see what is live at localjagoff.com.",
  "If it feels like you, grab it at localjagoff.com.",
  "Shop Local Jagoff before someone else gets loud about it.",
  "Find it now at localjagoff.com.",
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

  if (category === "724" || name.includes("724")) return "724 gear";
  if (category === "hoodies" || name.includes("hoodie")) return "hoodie";
  if (category === "tees" || name.includes("tee") || name.includes("shirt")) return "shirt";
  if (category === "hats" || name.includes("hat") || name.includes("cap")) return "hat";
  return "gear";
}

function promoPoolKey(type) {
  if (type === "724 gear") return "area724";
  return PRODUCT_HOOKS[type] ? type : "gear";
}

function promoRegionDescriptor(type) {
  return type === "724 gear" ? "724 and Western PA-inspired" : "Pittsburgh-inspired";
}

function promoAttitudeDescriptor(type) {
  return type === "724 gear" ? "724 / Western PA attitude" : "Pittsburgh / Western PA attitude";
}

export function makePromoHashtags(product) {
  const type = promoProductType(product);
  const tags = ["#LocalJagoff", "#Pittsburgh", "#Yinzer", "#WesternPA"];

  if (type === "724 gear") {
    tags.push("#724");
  } else {
    tags.push("#412", "#724");
  }

  if (type === "hoodie") tags.push("#HoodieSeason");
  if (type === "shirt") tags.push("#PittsburghShirts");
  if (type === "hat") tags.push("#PittsburghHats");

  return tags;
}

export function makeFreePromoPack(product, options = {}) {
  const cleanProduct = normalizePromoProduct(product);
  const name = cleanProduct.name;
  const type = promoProductType(cleanProduct);
  const poolKey = promoPoolKey(type);
  const mode = options.mode || "product_drop";
  const seed = Date.now() + name.length + String(options.notes || "").length;
  const productHooks = PRODUCT_HOOKS[poolKey] || PRODUCT_HOOKS.gear;
  const productOverlays = PRODUCT_OVERLAYS[poolKey] || PRODUCT_OVERLAYS.gear;
  const modeAngles = MODE_ANGLES[mode] || MODE_ANGLES.product_drop;
  const hookOne = pickPromoTemplate(productHooks, seed + 1);
  const hookTwo = pickPromoTemplate(FREE_HOOKS, seed + 2);
  const hookThree = pickPromoTemplate(productHooks, seed + 3);
  const cta = pickPromoTemplate(FREE_CTAS, seed + 4);
  const overlayOne = pickPromoTemplate(productOverlays, seed + 5);
  const overlayTwo = pickPromoTemplate(FREE_OVERLAYS, seed + 6);
  const brandAngle = pickPromoTemplate(modeAngles, seed + 7);
  const tone = options.toneIntensity || "balanced";
  const regionDescriptor = promoRegionDescriptor(type);
  const attitudeDescriptor = promoAttitudeDescriptor(type);

  const cleanLine = `${name} is live at Local Jagoff — ${regionDescriptor} ${type} with a local edge.`;
  const edgeLine =
    tone === "clean"
      ? cleanLine
      : `${name}. Local gear for anyone who knows a jagoff when they see one.`;
  const adSafeLine = `${name} is available now from Local Jagoff. ${regionDescriptor} ${type} with a bold local feel.`;
  const videoHook = mode === "clean_ad" ? adSafeLine : hookOne;

  return {
    brand_angle: `${brandAngle} No API call, no extra cost.`,
    facebook_post: `${hookOne}\n\n${edgeLine}\n\n${cta}`,
    instagram_caption: `${name} just hit the site. ${hookTwo}\n\n${cta}\n\n${formatPromoHashtags(
      makePromoHashtags(cleanProduct)
    )}`,
    tiktok_caption: `${hookThree} ${cta} ${formatPromoHashtags(
      makePromoHashtags(cleanProduct).slice(0, 4)
    )}`,
    youtube_shorts_title:
      mode === "short_video" ? `${name} | Quick Local Jagoff Drop` : `${name} | Local Jagoff Drop`,
    youtube_shorts_description: `${name} from Local Jagoff. ${attitudeDescriptor}, no boring gear. ${cta}`,
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
        voiceover: videoHook,
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
    alt_text: `${name} from Local Jagoff, shown as ${regionDescriptor} ${type}.`,
    clean_ad_version: `${adSafeLine} ${cta}`,
    edgy_version: edgeLine,
    cta,
    warnings: [
      "Free template mode did not use AI and costs $0.",
      "Review before posting. No auto-publishing is enabled yet.",
    ],
  };
}
