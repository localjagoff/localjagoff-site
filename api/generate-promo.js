import crypto from "crypto";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function normalizeProduct(product) {
  return {
    id: cleanText(product?.id),
    name: cleanText(product?.name, "Local Jagoff product"),
    price: cleanText(product?.retail_price || product?.price),
    category: cleanText(product?.category, "gear"),
    image: cleanText(product?.thumbnail_url || product?.image),
  };
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();

  const chunks = [];
  for (const item of data?.output || []) {
    if (Array.isArray(item?.content)) {
      for (const content of item.content) {
        if (typeof content?.text === "string") chunks.push(content.text);
        if (typeof content?.content === "string") chunks.push(content.content);
      }
    }
  }
  return chunks.join("\n").trim();
}

function stripJsonFence(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function slugify(value) {
  return cleanText(value, "promo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "promo";
}

function productUrl(product) {
  return product?.id ? `https://www.localjagoff.com/product/${product.id}` : "https://www.localjagoff.com";
}

function trackedUrl(product, source, campaign) {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: "social",
    utm_campaign: slugify(campaign || "ai-promo"),
    utm_content: slugify(product?.name || "local-jagoff-product"),
  });
  return `${productUrl(product)}?${params.toString()}`;
}

function postingBundleGuidance() {
  return [
    "Posting bundles:",
    "Facebook Bundle: Facebook Post plus Facebook tracked link.",
    "Instagram Bundle: Instagram Caption plus Instagram tracked link.",
  ].join("\n");
}

function postingQaChecklist(promptData) {
  const isHoliday = promptData.mode === "holiday" || promptData.goal === "holiday_promo";
  const is724 = /724/.test(`${promptData.product?.name || ""} ${promptData.product?.category || ""}`);

  return [
    "Posting QA: Review the post before publishing.",
    isHoliday
      ? "Posting QA: If a promo code, sale, deadline, or discount is mentioned, confirm it is real and currently active."
      : "Posting QA: Do not add sale, discount, deadline, or shipping claims unless they are real.",
    "Posting QA: Confirm no vendor, fulfillment, supplier, API, or internal workflow language appears.",
    is724
      ? "Posting QA: 724 product detected — confirm the copy does not mention 412 unless you intentionally want both."
      : "Posting QA: Regional tags look general; confirm 412/724 usage fits the product.",
    "Posting QA: Use the plain product link if the tracked UTM link looks too long for the platform.",
    "Posting QA: Review emojis and hashtags so the post feels natural, not spammy.",
  ];
}

function appendCtaHelper(promo, promptData) {
  const product = promptData.product;
  const campaign = promptData.goal || promptData.mode || "ai-promo";
  const existingCta = cleanText(promo?.cta, "Shop at localjagoff.com.");
  const firstLine = existingCta.split("\n")[0].replace(/^Main CTA:\s*/i, "").trim() || "Shop at localjagoff.com.";

  return {
    ...promo,
    cta: [
      `Main CTA: ${firstLine}`,
      `First comment: ${firstLine}${promptData.toneIntensity === "clean" ? "" : " 🖤💛"}`,
      `Product link: ${productUrl(product)}`,
      `Facebook tracked link: ${trackedUrl(product, "facebook", campaign)}`,
      `Instagram tracked link: ${trackedUrl(product, "instagram", campaign)}`,
      postingBundleGuidance(),
    ].join("\n"),
    warnings: [
      ...(Array.isArray(promo?.warnings) ? promo.warnings : []),
      "CTA helper includes direct product link, Facebook/Instagram UTM tracked social links, and posting bundle guidance.",
      ...postingQaChecklist(promptData),
    ],
  };
}

const promoSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand_angle: { type: "string" },
    facebook_post: { type: "string" },
    instagram_caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    image_overlay_text: { type: "array", items: { type: "string" } },
    alt_text: { type: "string" },
    clean_ad_version: { type: "string" },
    edgy_version: { type: "string" },
    cta: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "brand_angle",
    "facebook_post",
    "instagram_caption",
    "hashtags",
    "image_overlay_text",
    "alt_text",
    "clean_ad_version",
    "edgy_version",
    "cta",
    "warnings",
  ],
};

function buildPrompt(body) {
  const product = normalizeProduct(body.product);
  const requestedPlatform = cleanText(body.platform, "facebook");
  const platform = requestedPlatform === "instagram" ? "instagram" : "facebook";

  return {
    product,
    mode: cleanText(body.mode, "product_drop"),
    platform,
    goal: cleanText(body.goal, "sell_product"),
    toneIntensity: cleanText(body.toneIntensity, "balanced"),
    notes: cleanText(body.notes),
    recentPhrases: Array.isArray(body.recentPhrases)
      ? body.recentPhrases.map((p) => cleanText(p)).filter(Boolean).slice(0, 40)
      : [],
    variationSeed: cleanText(body.variationSeed, `${Date.now()}`),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = await readJson(req);
    const expectedKey = process.env.PROMO_ADMIN_KEY;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel environment variables." });
    }

    if (!expectedKey) {
      return res.status(500).json({ error: "PROMO_ADMIN_KEY is missing in Vercel environment variables." });
    }

    if (!safeEqual(body.adminKey, expectedKey)) {
      return res.status(401).json({ error: "Invalid promo generator password." });
    }

    const promptData = buildPrompt(body);

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        store: false,
        max_output_tokens: 1800,
        instructions: [
          "You are the private Local Jagoff Promo Generator.",
          "Create fresh Facebook and Instagram promo copy for Local Jagoff products.",
          "Brand voice: Pittsburgh / Western PA, black-and-gold energy, funny, gritty, confident, sarcastic, direct, not corporate.",
          "Use 'jagoff' naturally as brand language, but do not use hateful slurs, protected-class insults, threats, sexual content, or anything that would make ads harder to approve.",
          "Use emojis naturally but lightly when appropriate: Facebook 1-2 max, Instagram 2-4 max. Favor black/gold/energy emojis like 🖤 💛 ⚡ 👀 🔥. Clean Ad tone should use few or no emojis.",
          "If the product name or category includes 724, keep the copy focused on 724 / Western PA and do not mention 412 unless the user specifically asks for both.",
          "The CTA field should start with a short public CTA only. The server will append direct product links and Facebook/Instagram UTM tracked social links automatically.",
          "Never mention Printful, fulfillment vendors, supplier setup, internal APIs, production workflow, or private business operations.",
          "Do not claim exact material, weight, shipping time, origin, discounts, or guarantees unless the user supplied it in notes or product data.",
          "Avoid generic ecommerce fluff like elevate your wardrobe, premium quality, must-have, unleash your style, shop now before it is gone.",
          "Avoid overusing Pittsburgh clichés. Make each response feel like a new angle, not a canned sayings bank.",
          "If recentPhrases are supplied, do not reuse them closely.",
          "Return platform-ready Facebook and Instagram copy only.",
        ].join("\n"),
        input: [
          {
            role: "user",
            content: `Generate a Local Jagoff Facebook/Instagram promo package from this JSON:\n${JSON.stringify(promptData, null, 2)}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "local_jagoff_promo_package",
            strict: true,
            schema: promoSchema,
          },
        },
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({ error: data?.error?.message || "OpenAI request failed." });
    }

    const rawText = extractResponseText(data);
    let promo;

    try {
      promo = JSON.parse(stripJsonFence(rawText));
    } catch (err) {
      return res.status(500).json({ error: "The AI response was not valid JSON.", raw: rawText });
    }

    return res.status(200).json({ promo: appendCtaHelper(promo, promptData) });
  } catch (err) {
    console.error("PROMO GENERATOR ERROR:", err);
    return res.status(500).json({ error: "Failed to generate promo content.", message: err.message });
  }
}
