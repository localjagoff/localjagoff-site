import { makePostingQaChecklist } from "./promoQaChecklist";

export const US_HOLIDAY_PROMOS = [
  {
    value: "new_year",
    label: "New Year",
    season: "New Year",
    emojis: ["✨", "⚡", "🖤"],
    overlays: ["NEW YEAR ENERGY", "FRESH DROP", "NEW YEAR. SAME JAGOFF."],
    hashtags: ["#NewYear", "#NewYearStyle"],
    hooks: [
      "New year, same local attitude.",
      "Start the year with gear that already has an opinion.",
      "Fresh year. Fresh drop. Same jagoff behavior.",
    ],
  },
  {
    value: "valentines_day",
    label: "Valentine’s Day",
    season: "Valentine’s Day",
    emojis: ["🖤", "💛", "❤️"],
    overlays: ["LOCAL LOVE", "FOR YOUR FAVORITE JAGOFF", "LOVE, BUT MAKE IT LOCAL"],
    hashtags: ["#ValentinesDay", "#GiftIdeas"],
    hooks: [
      "For your favorite jagoff. Romantic? Maybe. Accurate? Absolutely.",
      "Skip the boring gift and get them something with a little local mouth.",
      "Nothing says love like knowing exactly what kind of jagoff they are.",
    ],
  },
  {
    value: "st_patricks_day",
    label: "St. Patrick’s Day",
    season: "St. Patrick’s Day",
    emojis: ["☘️", "🖤", "💛"],
    overlays: ["LOCAL LUCK", "JAGOFF LUCK", "STILL LOCAL"],
    hashtags: ["#StPatricksDay", "#Pittsburgh"],
    hooks: [
      "A little luck, a little local attitude.",
      "Wear something with more personality than a plastic green hat.",
      "St. Patrick’s Day energy, Local Jagoff attitude.",
    ],
  },
  {
    value: "easter_spring",
    label: "Easter / Spring",
    season: "Easter / Spring",
    emojis: ["🌷", "🖤", "💛"],
    overlays: ["SPRING DROP", "FRESH GEAR", "LOCAL SPRING ENERGY"],
    hashtags: ["#SpringStyle", "#EasterWeekend"],
    hooks: [
      "Spring showed up, so the gear can stop acting boring.",
      "Fresh season, fresh Local Jagoff drop.",
      "Spring gear with Western PA attitude built in.",
    ],
  },
  {
    value: "mothers_day",
    label: "Mother’s Day",
    season: "Mother’s Day",
    emojis: ["🖤", "💛", "🌷"],
    overlays: ["FOR MOM", "MOM DESERVES BETTER", "LOCAL MOM ENERGY"],
    hashtags: ["#MothersDay", "#GiftIdeas"],
    hooks: [
      "For the mom who raised a jagoff and still loves them.",
      "Mother’s Day gift idea for the local legend in your life.",
      "She deserves better than a last-minute card from the gas station.",
    ],
  },
  {
    value: "memorial_day",
    label: "Memorial Day",
    season: "Memorial Day Weekend",
    emojis: ["🇺🇸", "🖤", "💛"],
    overlays: ["MEMORIAL DAY WEEKEND", "LONG WEEKEND GEAR", "WEEKEND DROP"],
    hashtags: ["#MemorialDayWeekend", "#WeekendStyle"],
    hooks: [
      "Long weekend gear with local attitude.",
      "Memorial Day weekend called. Your outfit was acting too boring.",
      "For cookouts, porch sitting, and jagoff behavior in public.",
    ],
  },
  {
    value: "fathers_day",
    label: "Father’s Day",
    season: "Father’s Day",
    emojis: ["🖤", "💛", "👀"],
    overlays: ["FOR DAD", "DAD ENERGY", "FATHER’S DAY DROP"],
    hashtags: ["#FathersDay", "#GiftIdeas"],
    hooks: [
      "For the dad who already has enough tools and opinions.",
      "Father’s Day gift idea for the local jagoff who taught you sarcasm.",
      "Get him something better than another mug.",
    ],
  },
  {
    value: "fourth_of_july",
    label: "Fourth of July",
    season: "Fourth of July",
    emojis: ["🇺🇸", "⚡", "🖤"],
    overlays: ["FOURTH READY", "LOCAL FIREWORKS", "COOKOUT GEAR"],
    hashtags: ["#FourthOfJuly", "#SummerStyle"],
    hooks: [
      "Cookout gear with a little extra mouth on it.",
      "Fourth of July fit check, Local Jagoff edition.",
      "For fireworks, lawn chairs, and unsolicited opinions.",
    ],
  },
  {
    value: "labor_day",
    label: "Labor Day",
    season: "Labor Day Weekend",
    emojis: ["⚡", "🖤", "💛"],
    overlays: ["LABOR DAY WEEKEND", "END OF SUMMER", "LONG WEEKEND DROP"],
    hashtags: ["#LaborDay", "#LaborDayWeekend"],
    hooks: [
      "End-of-summer gear with Western PA attitude.",
      "Labor Day weekend called. Bring the local mouth with you.",
      "Long weekend, local gear, zero boring behavior.",
    ],
  },
  {
    value: "halloween",
    label: "Halloween",
    season: "Halloween",
    emojis: ["🎃", "🖤", "👀"],
    overlays: ["SPOOKY JAGOFF ENERGY", "HALLOWEEN DROP", "LOCAL HAUNT"],
    hashtags: ["#Halloween", "#SpookySeason"],
    hooks: [
      "Scary? No. Local jagoff behavior? Absolutely.",
      "Halloween gear for anyone whose personality is already a costume.",
      "Spooky season, Western PA attitude.",
    ],
  },
  {
    value: "veterans_day",
    label: "Veterans Day",
    season: "Veterans Day",
    emojis: ["🇺🇸", "🖤", "💛"],
    overlays: ["VETERANS DAY", "LOCAL RESPECT", "THANK YOU VETERANS"],
    hashtags: ["#VeteransDay", "#ThankYouVeterans"],
    hooks: [
      "Veterans Day reminder with local respect, not corporate noise.",
      "Respect to the veterans. Local attitude stays local.",
      "Keeping it simple: thank you, veterans.",
    ],
  },
  {
    value: "thanksgiving",
    label: "Thanksgiving",
    season: "Thanksgiving",
    emojis: ["🦃", "🖤", "💛"],
    overlays: ["THANKSGIVING ENERGY", "DINNER TABLE JAGOFF", "LOCAL THANKS"],
    hashtags: ["#Thanksgiving", "#HolidayStyle"],
    hooks: [
      "For Thanksgiving dinner and the jagoff who starts the argument anyway.",
      "Turkey, football, and a fit with local attitude.",
      "Thanksgiving gear for the one who said they were only staying an hour.",
    ],
  },
  {
    value: "black_friday",
    label: "Black Friday",
    season: "Black Friday",
    emojis: ["🖤", "⚡", "🔥"],
    overlays: ["BLACK FRIDAY", "DROP DEALS", "SHOP LOCAL JAGOFF"],
    hashtags: ["#BlackFriday", "#BlackFridayDeals"],
    hooks: [
      "Black Friday, but make it Local Jagoff.",
      "The sale energy is loud. The gear is louder.",
      "Black Friday gear for jagoffs who do not do boring basics.",
    ],
  },
  {
    value: "small_business_saturday",
    label: "Small Business Saturday",
    season: "Small Business Saturday",
    emojis: ["🖤", "💛", "⚡"],
    overlays: ["SHOP SMALL", "SHOP LOCAL", "SMALL BUSINESS SATURDAY"],
    hashtags: ["#SmallBusinessSaturday", "#ShopSmall"],
    hooks: [
      "Shop small. Keep it local. Act accordingly.",
      "Small Business Saturday, Local Jagoff style.",
      "Support local gear with a little Western PA mouth on it.",
    ],
  },
  {
    value: "cyber_monday",
    label: "Cyber Monday",
    season: "Cyber Monday",
    emojis: ["⚡", "🖤", "💻"],
    overlays: ["CYBER MONDAY", "ONLINE DROP", "CLICK LIKE A JAGOFF"],
    hashtags: ["#CyberMonday", "#CyberMondayDeals"],
    hooks: [
      "Cyber Monday gear for people shopping instead of working.",
      "Click fast. Act normal later.",
      "Cyber Monday, Western PA attitude included.",
    ],
  },
  {
    value: "christmas_holiday",
    label: "Christmas / Holiday",
    season: "Christmas / Holiday",
    emojis: ["🎁", "🖤", "💛"],
    overlays: ["HOLIDAY DROP", "GIFT A JAGOFF", "LOCAL HOLIDAY GEAR"],
    hashtags: ["#ChristmasGifts", "#HolidayShopping"],
    hooks: [
      "Gift it to the jagoff who already has everything except this.",
      "Holiday shopping, but make it less boring.",
      "For the local jagoff on your list.",
    ],
  },
  {
    value: "new_years_eve",
    label: "New Year’s Eve",
    season: "New Year’s Eve",
    emojis: ["✨", "🖤", "⚡"],
    overlays: ["NYE ENERGY", "YEAR END DROP", "END THE YEAR LOCAL"],
    hashtags: ["#NewYearsEve", "#NYEStyle"],
    hooks: [
      "End the year with the same local attitude you started with.",
      "New Year’s Eve gear for anyone already over the party.",
      "Last drop energy before the calendar gets dramatic.",
    ],
  },
];

const PLATFORM_EXTRAS = {
  facebook: {
    opener: "Holiday promo is live.",
    closer: "Check it out at localjagoff.com.",
  },
  instagram: {
    opener: "Holiday drop energy.",
    closer: "Tap through when you are done scrolling.",
  },
  tiktok: {
    opener: "POV: the holiday promo has more attitude than your family group chat.",
    closer: "localjagoff.com if the shoe fits.",
  },
  youtube_shorts: {
    opener: "Quick holiday drop check.",
    closer: "Find it at localjagoff.com.",
  },
};

function pick(list, seed = 0) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list[Math.abs(seed) % list.length];
}

function normalizeProduct(product) {
  return {
    id: product?.id || "",
    name: product?.name || "Local Jagoff gear",
    category: product?.category || "gear",
    retail_price: product?.retail_price || product?.price || "",
    thumbnail_url: product?.thumbnail_url || product?.image || "",
  };
}

function productType(product) {
  const name = String(product?.name || "").toLowerCase();
  const category = String(product?.category || "").toLowerCase();

  if (category === "724" || name.includes("724")) return "724 gear";
  if (category === "hoodies" || name.includes("hoodie")) return "hoodie";
  if (category === "hats" || name.includes("hat") || name.includes("cap")) return "hat";
  if (category === "tees" || name.includes("tee") || name.includes("shirt")) return "shirt";
  return "gear";
}

function holidayByValue(value) {
  return US_HOLIDAY_PROMOS.find((holiday) => holiday.value === value) || US_HOLIDAY_PROMOS[0];
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "promo";
}

function productUrl(product) {
  return product.id
    ? `https://www.localjagoff.com/product/${product.id}`
    : "https://www.localjagoff.com";
}

function trackedUrl(product, holiday, source = "social") {
  const base = productUrl(product);
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: "social",
    utm_campaign: slugify(holiday.season),
    utm_content: slugify(product.name),
  });

  return `${base}?${params.toString()}`;
}

function offerLine(offerDetails) {
  const clean = cleanText(offerDetails);
  return clean
    ? `Promo details: ${clean}`
    : "No fake discount included — add offer details only when a real sale is active.";
}

function toneLine(tone) {
  if (tone === "clean") return "Clean, simple, and easy to post.";
  if (tone === "more_jagoff") return "A little louder, a little more jagoff, exactly how it should be.";
  if (tone === "savage_but_safe") return "Sharp enough to notice, safe enough to post.";
  return "Local, funny, and still usable.";
}

function campaignLine(style, holiday) {
  if (style === "sale_announcement") return `${holiday.season} promo is live.`;
  if (style === "last_chance") return `Last call for ${holiday.season} gear.`;
  if (style === "gift_guide") return `Gift idea for the local jagoff on your list.`;
  if (style === "weekend_push") return `${holiday.season} weekend energy, Local Jagoff style.`;
  return `${holiday.season} campaign copy with Local Jagoff attitude.`;
}

function hashtagsFor(product, holiday) {
  const type = productType(product);
  const tags = ["#LocalJagoff", "#Pittsburgh", "#WesternPA", ...holiday.hashtags];

  if (type === "724 gear") tags.push("#724");
  else tags.push("#412", "#724");

  if (type === "hoodie") tags.push("#HoodieSeason");
  if (type === "shirt") tags.push("#PittsburghShirts");
  if (type === "hat") tags.push("#PittsburghHats");

  return [...new Set(tags)];
}

export function makeHolidayPromoPack(productInput, options = {}) {
  const product = normalizeProduct(productInput);
  const holiday = holidayByValue(options.holidayValue);
  const platform = options.platform || "full_pack";
  const tone = options.toneIntensity || "balanced";
  const campaignStyle = options.campaignStyle || "sale_announcement";
  const seed = Date.now() + product.name.length + holiday.label.length;
  const hook = pick(holiday.hooks, seed + 1);
  const secondHook = pick(holiday.hooks, seed + 2);
  const emoji = tone === "clean" ? "" : pick(holiday.emojis, seed + 3);
  const emojiTwo = tone === "more_jagoff" || tone === "savage_but_safe" ? pick(holiday.emojis, seed + 4) : "";
  const emojiLead = [emoji, emojiTwo].filter(Boolean).join(" ");
  const overlayOne = pick(holiday.overlays, seed + 5);
  const overlayTwo = pick(holiday.overlays, seed + 6);
  const type = productType(product);
  const hasOffer = Boolean(cleanText(options.offerDetails));
  const offer = offerLine(options.offerDetails);
  const campaign = campaignLine(campaignStyle, holiday);
  const toneCopy = toneLine(tone);
  const notes = cleanText(options.notes);
  const noteLine = notes ? `Extra direction: ${notes}` : "";
  const platformExtras = PLATFORM_EXTRAS;
  const productLink = productUrl(product);
  const facebookLink = trackedUrl(product, holiday, "facebook");
  const instagramLink = trackedUrl(product, holiday, "instagram");
  const tiktokLink = trackedUrl(product, holiday, "tiktok");
  const youtubeLink = trackedUrl(product, holiday, "youtube_shorts");
  const baseCta = hasOffer
    ? `Shop the ${holiday.season} promo at localjagoff.com.`
    : `Shop the ${holiday.season} drop at localjagoff.com.`;

  const lead = emojiLead ? `${emojiLead} ${campaign}` : campaign;
  const productLine = `${product.name}. ${holiday.season} gear with Local Jagoff attitude.`;
  const supportLine = [offer, toneCopy, noteLine].filter(Boolean).join(" ");

  return {
    brand_angle: `${holiday.season} promo pack for ${product.name}. ${campaign} ${offer} Generated with free holiday templates.`,
    facebook_post: `${lead}\n\n${hook}\n\n${productLine}\n\n${supportLine}\n\n${baseCta}`,
    instagram_caption: `${emojiLead ? `${emojiLead} ` : ""}${holiday.season} drop energy. ${secondHook}\n\n${productLine}\n\n${baseCta}\n\n${hashtagsFor(product, holiday).join(" ")}`,
    tiktok_caption: `${platformExtras.tiktok.opener} ${hook} ${baseCta} ${hashtagsFor(product, holiday).slice(0, 5).join(" ")}`,
    youtube_shorts_title: `${holiday.season} Local Jagoff Drop | ${product.name}`,
    youtube_shorts_description: `${platformExtras.youtube_shorts.opener} ${product.name} from Local Jagoff. ${offer} ${platformExtras.youtube_shorts.closer}`,
    hashtags: hashtagsFor(product, holiday),
    video_hooks: [
      hook,
      secondHook,
      `${holiday.season} promo check: ${product.name}.`,
      `If your ${holiday.season} plans involve jagoff behavior, this ${type} makes sense.`,
      `Local Jagoff holiday drop, no boring gear attached.`,
    ],
    short_video_script: [
      {
        scene: "Scene 1",
        visual: "Product image appears over a black-and-gold holiday themed background.",
        on_screen_text: overlayOne,
        voiceover: hook,
      },
      {
        scene: "Scene 2",
        visual: "Quick zoom on product details or design.",
        on_screen_text: product.name,
        voiceover: `${productLine} ${offer}`,
      },
      {
        scene: "Scene 3",
        visual: "End card with Local Jagoff logo and website.",
        on_screen_text: "LOCALJAGOFF.COM",
        voiceover: baseCta,
      },
    ],
    image_overlay_text: [overlayOne, overlayTwo, holiday.season.toUpperCase(), "LOCALJAGOFF.COM"],
    alt_text: `${product.name} from Local Jagoff promoted for ${holiday.season}.`,
    clean_ad_version: `${holiday.season} promo from Local Jagoff. ${product.name} is available now. ${offer} ${baseCta}`,
    edgy_version: `${hook} ${productLine} ${tone === "clean" ? "" : "Holiday jagoff behavior approved."}`.trim(),
    cta: [
      `Main CTA: ${baseCta}`,
      `First comment: ${baseCta}${tone === "clean" ? "" : " 🖤💛"}`,
      `Product link: ${productLink}`,
      `Facebook tracked link: ${facebookLink}`,
      `Instagram tracked link: ${instagramLink}`,
      `TikTok tracked link: ${tiktokLink}`,
      `YouTube Shorts tracked link: ${youtubeLink}`,
    ].join("\n"),
    warnings: [
      "Holiday promo generator is free and does not use the OpenAI API.",
      hasOffer
        ? "Offer details were included exactly from your input. Verify the sale is real before posting."
        : "No discount was invented. Add offer details only when a real sale is active.",
      "Tracked links use UTM parameters for cleaner analytics.",
      platform === "full_pack"
        ? "Full Pack generated. Use the platform switcher on this page to copy the version you need."
        : `Generated with ${platform} selected.`,
      ...makePostingQaChecklist({ product, mode: "holiday", hasOffer }),
    ],
  };
}
