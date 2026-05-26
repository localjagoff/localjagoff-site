import {
  MODE_ANGLES,
  PLATFORM_CLOSERS,
  PLATFORM_EMOJIS,
  PLATFORM_OPENERS,
  PRODUCT_HOOKS,
  PRODUCT_OVERLAYS,
} from "./promoProductPools";
import { makePostingBundleGuidance } from "./promoBundleHelper";
import { makePostingQaChecklist } from "./promoQaChecklist";
import { appendValidationWarnings } from "./promoValidation";

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

export const SALE_CTAS = [
  "Shop the promo at localjagoff.com.",
  "Grab it while the promo is live at localjagoff.com.",
  "Check the deal before another jagoff does: localjagoff.com.",
  "Shop Local Jagoff while the promo is running.",
  "Use the promo while it is live at localjagoff.com.",
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

function promoEmoji(platform, seed, tone) {
  if (tone === "clean") return "";
  return pickPromoTemplate(PLATFORM_EMOJIS[platform] || [], seed);
}

function promoEmojiPair(platform, seed, tone) {
  if (tone === "clean") return "";
  const first = promoEmoji(platform, seed, tone);
  const second = tone === "savage_but_safe" || tone === "more_jagoff" ? promoEmoji(platform, seed + 1, tone) : "";
  return [first, second].filter(Boolean).join(" ");
}

function withEmoji(text, emoji) {
  return emoji ? `${emoji} ${text}` : text;
}

function slugify(value) {
  return String(value || "promo")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "promo";
}

function promoToneLine(tone, name, cleanLine) {
  if (tone === "clean") return cleanLine;
  if (tone === "more_jagoff") return `${name}. Local gear for jagoff behavior, loud opinions, and people who get the joke.`;
  if (tone === "savage_but_safe") return `${name}. For the jagoff who acts normal in public for about twelve seconds.`;
  return `${name}. Local gear for anyone who knows a jagoff when they see one.`;
}

function promoToneContext(tone) {
  if (tone === "clean") return "Clean tone selected.";
  if (tone === "more_jagoff") return "More Jagoff tone selected.";
  if (tone === "savage_but_safe") return "Savage but Safe tone selected.";
  return "Balanced tone selected.";
}

function promoToneCaptionLine(tone) {
  if (tone === "clean") return "Simple, local, and easy to post.";
  if (tone === "more_jagoff") return "A little louder, a little more jagoff, exactly how it should be.";
  if (tone === "savage_but_safe") return "Sharp enough to notice. Safe enough to wear out.";
  return "";
}

function promoToneOverlay(tone, fallback) {
  if (tone === "clean") return "LOCAL GEAR";
  if (tone === "more_jagoff") return "JAGOFF BEHAVIOR";
  if (tone === "savage_but_safe") return "ACT NORMAL. TRY IT.";
  return fallback;
}

function promoToneHook(tone, hook) {
  if (tone === "clean") return hook.replace("jagoff behavior", "local attitude");
  if (tone === "more_jagoff") return `${hook} Very Local Jagoff behavior.`;
  if (tone === "savage_but_safe") return `${hook} Try not to make it weird.`;
  return hook;
}

function promoOfferDetailsFromNotes(notes) {
  const lines = String(notes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const offerLine = lines.find((line) => /promo code|offer details|real promo|discount code|code:/i.test(line));
  if (!offerLine) return "";

  return offerLine
    .replace(/^promo code:\s*/i, "")
    .replace(/^offer details:\s*/i, "")
    .replace(/^real promo\/offer details:\s*/i, "")
    .replace(/^discount code:\s*/i, "")
    .trim();
}

function promoLooksLikeSale(notes, mode) {
  const note = String(notes || "").toLowerCase();
  return mode === "sale" || note.includes("mode: sale") || note.includes("weekend sale") || note.includes("promo code") || note.includes("discount code") || note.includes("current promo") || note.includes("sale push");
}

function promoModeCaptionLine(notes, mode) {
  const offer = promoOfferDetailsFromNotes(notes);

  if (promoLooksLikeSale(notes, mode)) {
    return offer ? `Current promo: ${offer}.` : "Promo push is live — no fake discount added.";
  }

  if (mode === "holiday" || String(notes || "").toLowerCase().includes("holiday")) {
    return offer ? `Holiday promo details: ${offer}.` : "Holiday promo angle without inventing a discount.";
  }

  return "";
}

function promoNoteCaptionLine(notes, type, mode) {
  const note = String(notes || "").toLowerCase();

  if (!note.trim()) return "";
  if (promoLooksLikeSale(notes, mode)) return "Limited-time reason to shop, still written like Local Jagoff — not corporate clearance-bin copy.";
  if (note.includes("less salesy") || note.includes("not salesy") || note.includes("less sale")) return "No hard sell — just local gear with the right amount of attitude.";
  if (note.includes("724")) return type === "724 gear" ? "724 energy all the way." : "Western PA energy, without forcing it.";
  if (note.includes("hoodie") || note.includes("cold") || note.includes("winter") || note.includes("fall")) return "Built for hoodie-weather moods and gray-sky days.";
  if (note.includes("gift") || note.includes("christmas") || note.includes("holiday")) return "Gift it to the jagoff who already has enough opinions.";
  if (note.includes("clean") || note.includes("ad safe") || mode === "clean_ad") return "Clean, simple, and still local.";
  if (note.includes("funny") || note.includes("joke")) return "A quick local joke you can wear.";
  if (note.includes("weekend") || note.includes("friday")) return "Weekend energy, Western PA edition.";

  return "";
}

function promoNoteContext(notes) {
  const note = String(notes || "").trim();
  return note ? `Extra notes applied: ${note}.` : "";
}

function promoFirstComment(baseCta, tone) {
  if (tone === "clean") return `First comment: ${baseCta}`;
  return `First comment: ${baseCta} 🖤💛`;
}

function promoProductUrl(product) {
  return product?.id
    ? `https://www.localjagoff.com/product/${product.id}`
    : "https://www.localjagoff.com";
}

function promoTrackedUrl(product, source, campaign = "standard-promo") {
  const base = promoProductUrl(product);
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: "social",
    utm_campaign: slugify(campaign),
    utm_content: slugify(product?.name || "local-jagoff-product"),
  });

  return `${base}?${params.toString()}`;
}

function promoLinkHelper(product, campaign) {
  return [
    product?.id ? `Product link: ${promoProductUrl(product)}` : `Site link: ${promoProductUrl(product)}`,
    `Facebook link: ${promoTrackedUrl(product, "facebook", campaign)}`,
    `Instagram link: ${promoTrackedUrl(product, "instagram", campaign)}`,
    `TikTok link: ${promoTrackedUrl(product, "tiktok", campaign)}`,
    `YouTube Shorts link: ${promoTrackedUrl(product, "youtube_shorts", campaign)}`,
    makePostingBundleGuidance(),
  ].join("\n");
}

function promoCtaForMode(baseCta, notes, mode) {
  const offer = promoOfferDetailsFromNotes(notes);
  if ((promoLooksLikeSale(notes, mode) || mode === "holiday") && offer) return `${baseCta} ${offer}.`;
  return baseCta;
}

function promoCtaBlock(baseCta, product, tone, campaign) {
  return [
    `Main CTA: ${baseCta}`,
    promoFirstComment(baseCta, tone),
    promoLinkHelper(product, campaign),
  ].join("\n");
}

function promoModeOverlay(mode, notes, fallback) {
  if (promoLooksLikeSale(notes, mode)) return "PROMO IS LIVE";
  if (mode === "holiday" || String(notes || "").toLowerCase().includes("holiday")) return "HOLIDAY DROP";
  return fallback;
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
  const type = promoProductType(cleanProduct);
  const poolKey = promoPoolKey(type);
  const mode = options.mode || "product_drop";
  const seed = Date.now() + name.length + String(options.notes || "").length;
  const productHooks = PRODUCT_HOOKS[poolKey] || PRODUCT_HOOKS.gear;
  const productOverlays = PRODUCT_OVERLAYS[poolKey] || PRODUCT_OVERLAYS.gear;
  const modeAngles = MODE_ANGLES[mode] || MODE_ANGLES.product_drop;
  const tone = options.toneIntensity || "balanced";
  const rawBaseCta = promoLooksLikeSale(options.notes, mode) ? pickPromoTemplate(SALE_CTAS, seed + 4) : pickPromoTemplate(FREE_CTAS, seed + 4);
  const baseCta = promoCtaForMode(rawBaseCta, options.notes, mode);
  const ctaBlock = promoCtaBlock(baseCta, cleanProduct, tone, mode);

  const facebookOpen = withEmoji(pickPromoTemplate(PLATFORM_OPENERS.facebook, seed + 8), promoEmoji("facebook", seed + 20, tone));
  const instagramOpen = withEmoji(pickPromoTemplate(PLATFORM_OPENERS.instagram, seed + 9), promoEmojiPair("instagram", seed + 21, tone));
  const tiktokOpen = withEmoji(pickPromoTemplate(PLATFORM_OPENERS.tiktok, seed + 10), promoEmojiPair("tiktok", seed + 22, tone));
  const shortsOpen = withEmoji(pickPromoTemplate(PLATFORM_OPENERS.youtube_shorts, seed + 11), promoEmoji("youtube_shorts", seed + 23, tone));
  const facebookClose = pickPromoTemplate(PLATFORM_CLOSERS.facebook, seed + 12);
  const instagramClose = pickPromoTemplate(PLATFORM_CLOSERS.instagram, seed + 13);
  const tiktokClose = pickPromoTemplate(PLATFORM_CLOSERS.tiktok, seed + 14);
  const shortsClose = pickPromoTemplate(PLATFORM_CLOSERS.youtube_shorts, seed + 15);

  const rawHookOne = pickPromoTemplate(productHooks, seed + 1);
  const rawHookTwo = pickPromoTemplate(FREE_HOOKS, seed + 2);
  const rawHookThree = pickPromoTemplate(productHooks, seed + 3);
  const hookOne = promoToneHook(tone, rawHookOne);
  const hookTwo = promoToneHook(tone, rawHookTwo);
  const hookThree = promoToneHook(tone, rawHookThree);
  const overlayOne = promoModeOverlay(mode, options.notes, promoToneOverlay(tone, pickPromoTemplate(productOverlays, seed + 5)));
  const overlayTwo = pickPromoTemplate(FREE_OVERLAYS, seed + 6);
  const brandAngle = promoLooksLikeSale(options.notes, mode) ? "Limited-time Local Jagoff push with real offer details only." : pickPromoTemplate(modeAngles, seed + 7);
  const regionDescriptor = promoRegionDescriptor(type);
  const attitudeDescriptor = promoAttitudeDescriptor(type);
  const modeCaptionLine = promoModeCaptionLine(options.notes, mode);
  const noteCaptionLine = promoNoteCaptionLine(options.notes, type, mode);
  const toneCaptionLine = promoToneCaptionLine(tone);
  const publicCaptionLine = [modeCaptionLine, noteCaptionLine, toneCaptionLine].filter(Boolean).join(" ");
  const publicBlock = publicCaptionLine ? `\n\n${publicCaptionLine}` : "";
  const publicInline = publicCaptionLine ? ` ${publicCaptionLine}` : "";
  const internalContext = [promoNoteContext(options.notes), promoToneContext(tone)].filter(Boolean).join(" ");

  const cleanLine = `${name} is live at Local Jagoff — ${regionDescriptor} ${type} with a local edge.`;
  const edgeLine = promoToneLine(tone, name, cleanLine);
  const saleEdgeLine = promoLooksLikeSale(options.notes, mode) ? `${name}. The promo push is live — local gear, real offer details only, no fake countdown nonsense.` : edgeLine;
  const adSafeLine = `${name} is available now from Local Jagoff. ${regionDescriptor} ${type} with a bold local feel.`;
  const videoHook = mode === "clean_ad" || tone === "clean" ? adSafeLine : hookOne;

  const pack = {
    brand_angle: `${brandAngle} ${internalContext} No API call, no extra cost.`.trim(),
    facebook_post: `${facebookOpen}\n\n${hookOne}\n\n${saleEdgeLine}${publicBlock}\n\n${facebookClose}`,
    instagram_caption: `${instagramOpen} ${hookTwo}${publicBlock}\n\n${instagramClose}\n\n${formatPromoHashtags(makePromoHashtags(cleanProduct))}`,
    tiktok_caption: `${tiktokOpen} ${hookThree}${publicInline} ${tiktokClose} ${formatPromoHashtags(makePromoHashtags(cleanProduct).slice(0, 4))}`,
    youtube_shorts_title: mode === "short_video" ? `${name} | Quick Local Jagoff Drop` : `${name} | Local Jagoff Drop`,
    youtube_shorts_description: `${shortsOpen} ${name} from Local Jagoff. ${attitudeDescriptor}, no boring gear.${publicInline} ${shortsClose}`,
    hashtags: makePromoHashtags(cleanProduct),
    video_hooks: [
      hookOne,
      hookTwo,
      hookThree,
      promoLooksLikeSale(options.notes, mode) ? `The promo is live for ${name}. Real details only, no made-up discount.` : `If you know what jagoff means, this ${type} makes sense.`,
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
        voiceover: publicCaptionLine ? `${saleEdgeLine} ${publicCaptionLine}` : saleEdgeLine,
      },
      {
        scene: "Scene 3",
        visual: "End card with Local Jagoff logo/site URL.",
        on_screen_text: "LOCALJAGOFF.COM",
        voiceover: baseCta,
      },
    ],
    image_overlay_text: [overlayOne, overlayTwo, "LOCALJAGOFF.COM"],
    alt_text: `${name} from Local Jagoff, shown as ${regionDescriptor} ${type}.`,
    clean_ad_version: `${adSafeLine}${publicBlock} ${baseCta}`,
    edgy_version: publicCaptionLine ? `${saleEdgeLine} ${publicCaptionLine}` : saleEdgeLine,
    cta: ctaBlock,
    warnings: [
      "Free template mode did not use AI and costs $0.",
      promoLooksLikeSale(options.notes, mode) ? "Sale/promo behavior uses only offer details supplied in notes. It does not invent discounts." : "CTA includes first-comment, direct product link, social campaign links, and posting bundle guidance.",
      "Tone, emojis, and extra notes were applied with simple non-AI logic.",
      ...makePostingQaChecklist({ product: cleanProduct, mode }),
    ],
  };

  return appendValidationWarnings(pack, {
    product: cleanProduct,
    mode,
    offerDetails: promoOfferDetailsFromNotes(options.notes),
  });
}
