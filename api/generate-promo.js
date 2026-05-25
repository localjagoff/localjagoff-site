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
  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }

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

const promoSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand_angle: { type: "string" },
    facebook_post: { type: "string" },
    instagram_caption: { type: "string" },
    tiktok_caption: { type: "string" },
    youtube_shorts_title: { type: "string" },
    youtube_shorts_description: { type: "string" },
    hashtags: {
      type: "array",
      items: { type: "string" },
    },
    video_hooks: {
      type: "array",
      items: { type: "string" },
    },
    short_video_script: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scene: { type: "string" },
          visual: { type: "string" },
          on_screen_text: { type: "string" },
          voiceover: { type: "string" },
        },
        required: ["scene", "visual", "on_screen_text", "voiceover"],
      },
    },
    image_overlay_text: {
      type: "array",
      items: { type: "string" },
    },
    alt_text: { type: "string" },
    clean_ad_version: { type: "string" },
    edgy_version: { type: "string" },
    cta: { type: "string" },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "brand_angle",
    "facebook_post",
    "instagram_caption",
    "tiktok_caption",
    "youtube_shorts_title",
    "youtube_shorts_description",
    "hashtags",
    "video_hooks",
    "short_video_script",
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

  return {
    product,
    mode: cleanText(body.mode, "product_drop"),
    platform: cleanText(body.platform, "full_pack"),
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const expectedKey = process.env.PROMO_ADMIN_KEY;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing in Vercel environment variables.",
      });
    }

    if (!expectedKey) {
      return res.status(500).json({
        error: "PROMO_ADMIN_KEY is missing in Vercel environment variables.",
      });
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
        max_output_tokens: 2600,
        instructions: [
          "You are the private Local Jagoff Promo Generator.",
          "Create fresh social media promo copy for Local Jagoff products.",
          "Brand voice: Pittsburgh / Western PA, black-and-gold energy, funny, gritty, confident, sarcastic, direct, not corporate.",
          "Use 'jagoff' naturally as brand language, but do not use hateful slurs, protected-class insults, threats, sexual content, or anything that would make ads harder to approve.",
          "Use emojis naturally but lightly when appropriate: Facebook 1-2 max, Instagram 2-4 max, TikTok 1-3 max, YouTube Shorts 0-2 max. Favor black/gold/energy emojis like 🖤 💛 ⚡ 👀 🔥. Clean Ad tone should use few or no emojis.",
          "If the product name or category includes 724, keep the copy focused on 724 / Western PA and do not mention 412 unless the user specifically asks for both.",
          "Never mention Printful, fulfillment vendors, supplier setup, internal APIs, production workflow, or private business operations.",
          "Do not claim exact material, weight, shipping time, origin, discounts, or guarantees unless the user supplied it in notes or product data.",
          "Avoid generic ecommerce fluff like elevate your wardrobe, premium quality, must-have, unleash your style, shop now before it is gone.",
          "Avoid overusing Pittsburgh clichés. Make each response feel like a new angle, not a canned sayings bank.",
          "If recentPhrases are supplied, do not reuse them closely.",
          "Return platform-ready copy. Keep the captions usable without extra editing.",
        ].join("\n"),
        input: [
          {
            role: "user",
            content: `Generate a Local Jagoff promo package from this JSON:\n${JSON.stringify(
              promptData,
              null,
              2
            )}`,
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
      return res.status(openaiRes.status).json({
        error: data?.error?.message || "OpenAI request failed.",
      });
    }

    const rawText = extractResponseText(data);
    let promo;

    try {
      promo = JSON.parse(stripJsonFence(rawText));
    } catch (err) {
      return res.status(500).json({
        error: "The AI response was not valid JSON.",
        raw: rawText,
      });
    }

    return res.status(200).json({ promo });
  } catch (err) {
    console.error("PROMO GENERATOR ERROR:", err);
    return res.status(500).json({
      error: "Failed to generate promo content.",
      message: err.message,
    });
  }
}
