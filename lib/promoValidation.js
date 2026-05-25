const INTERNAL_LANGUAGE_PATTERNS = [
  /printful/i,
  /fulfillment vendor/i,
  /supplier/i,
  /api\b/i,
  /webhook/i,
  /stripe/i,
  /vercel/i,
  /internal workflow/i,
  /production workflow/i,
  /draft order/i,
];

const SALE_LANGUAGE_PATTERNS = [
  /\b\d+%\s*off\b/i,
  /\bpercent off\b/i,
  /\bsale\b/i,
  /\bdiscount\b/i,
  /\bpromo code\b/i,
  /\bcode\s+[A-Z0-9]{3,}\b/i,
  /\bfree shipping\b/i,
  /\bships? by\b/i,
  /\border by\b/i,
  /\blast chance\b/i,
  /\bdeadline\b/i,
];

function textFromValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFromValue).join("\n");
  if (typeof value === "object") return Object.values(value).map(textFromValue).join("\n");
  return String(value);
}

function packText(pack) {
  return [
    pack?.brand_angle,
    pack?.facebook_post,
    pack?.instagram_caption,
    pack?.tiktok_caption,
    pack?.youtube_shorts_title,
    pack?.youtube_shorts_description,
    pack?.hashtags,
    pack?.video_hooks,
    pack?.short_video_script,
    pack?.image_overlay_text,
    pack?.alt_text,
    pack?.clean_ad_version,
    pack?.edgy_version,
    pack?.cta,
  ].map(textFromValue).join("\n");
}

function countEmojis(text) {
  const matches = String(text || "").match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu);
  return matches ? matches.length : 0;
}

function hashtagCount(pack, text) {
  const arrayCount = Array.isArray(pack?.hashtags) ? pack.hashtags.length : 0;
  const textCount = (String(text || "").match(/#[A-Za-z0-9_]+/g) || []).length;
  return Math.max(arrayCount, textCount);
}

function productLooks724(product) {
  return /724/.test(`${product?.name || ""} ${product?.category || ""}`);
}

function hasRealOffer(offerDetails) {
  return Boolean(String(offerDetails || "").trim());
}

export function validatePromoPack(pack, options = {}) {
  const product = options.product || {};
  const mode = options.mode || "product_drop";
  const offerDetails = options.offerDetails || "";
  const text = packText(pack);
  const lowerText = text.toLowerCase();
  const findings = [];
  const passes = [];

  const internalMatches = INTERNAL_LANGUAGE_PATTERNS.filter((pattern) => pattern.test(text));
  if (internalMatches.length > 0) {
    findings.push("Validation: Possible internal/vendor language found. Review and remove anything about vendors, APIs, Stripe, webhooks, or fulfillment workflow.");
  } else {
    passes.push("Validation passed: No obvious internal/vendor language detected.");
  }

  if (productLooks724(product) && /\b412\b/.test(text)) {
    findings.push("Validation: 724 product mentions 412. Remove 412 unless this is intentional.");
  } else if (productLooks724(product)) {
    passes.push("Validation passed: 724 product does not appear to mention 412.");
  }

  if (!/https:\/\/www\.localjagoff\.com\/product\//i.test(text) && !/https:\/\/www\.localjagoff\.com/i.test(text)) {
    findings.push("Validation: No Local Jagoff product/site link detected in the generated pack.");
  } else {
    passes.push("Validation passed: Local Jagoff link detected.");
  }

  const tagCount = hashtagCount(pack, text);
  if (tagCount > 12) {
    findings.push(`Validation: ${tagCount} hashtags detected. Consider trimming for a less spammy post.`);
  } else {
    passes.push(`Validation passed: Hashtag count looks reasonable (${tagCount}).`);
  }

  const emojiCount = countEmojis(text);
  if (emojiCount > 18) {
    findings.push(`Validation: ${emojiCount} emojis detected. Consider reducing emoji use.`);
  } else {
    passes.push(`Validation passed: Emoji use looks controlled (${emojiCount}).`);
  }

  const saleMentions = SALE_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text));
  if (saleMentions && !hasRealOffer(offerDetails) && mode === "holiday") {
    findings.push("Validation: Sale/discount/deadline wording appears, but no promo/offer details were entered. Confirm this is not implying a fake deal.");
  }

  if (/premium quality|elevate your wardrobe|must-have|unleash your style/i.test(text)) {
    findings.push("Validation: Generic ecommerce wording detected. Consider regenerating or editing to sound more Local Jagoff.");
  } else {
    passes.push("Validation passed: No obvious generic ecommerce fluff detected.");
  }

  return findings.length > 0
    ? ["Validation result: Review recommended.", ...findings, ...passes]
    : ["Validation result: Looks good from automatic checks.", ...passes];
}

export function appendValidationWarnings(pack, options = {}) {
  return {
    ...pack,
    warnings: [
      ...(Array.isArray(pack?.warnings) ? pack.warnings : []),
      ...validatePromoPack(pack, options),
    ],
  };
}
