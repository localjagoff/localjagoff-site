import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import PromoCommandCenterBase from "./promo-command-center-v6";

const QUEUE_STORAGE_KEY = "localJagoffPromoQueue";
const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";
const PLATFORM_VALUES = new Set(["facebook", "instagram", "tiktok", "youtube_shorts"]);
let cachedProducts = [];

const DEFAULT_GENERATOR_PRESETS = [
  {
    id: "preset-new-drop",
    name: "New Drop Push",
    description: "General launch push for a fresh product drop.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 5,
    notes: "New gear is live. Keep it direct, product-focused, and local. Push urgency without sounding desperate. Mention Local Jagoff and make the product feel like part of Pittsburgh-area everyday gear.",
  },
  {
    id: "preset-hoodie-weather",
    name: "Hoodie Weather",
    description: "Cold-weather push for hoodies and heavier gear.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "Lean into hoodie weather, chilly Pittsburgh mornings, and comfort without sounding generic. Make the copy feel local, practical, and a little jagoff. Avoid overexplaining fabric unless useful.",
  },
  {
    id: "preset-724-local",
    name: "724 Local Push",
    description: "Focused campaign for 724-area gear only.",
    mode: "product_drop",
    tone: "more_jagoff",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "This is for 724-area products. Do not mention 412 unless the product itself is specifically 412. Keep it western PA, local, gritty, and proud. The 724 angle should feel intentional, not like an afterthought.",
  },
  {
    id: "preset-weekend-sale",
    name: "Weekend Sale",
    description: "Short weekend promo with a discount code.",
    mode: "sale",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 3,
    notes: "Weekend sale push. Mention the promo code if provided. Keep the CTA simple and make the post feel like a limited-time reason to shop, not a clearance dump.",
  },
  {
    id: "preset-holiday-promo",
    name: "Holiday Promo",
    description: "Holiday sale framework with promo code support.",
    mode: "holiday",
    tone: "clean",
    platforms: ["facebook", "instagram", "tiktok", "youtube_shorts"],
    days: 7,
    notes: "Holiday promo campaign. Use the selected holiday as the reason for the campaign. Mention the promo code if provided. Keep the copy festive but still Local Jagoff, not corporate or cheesy.",
  },
  {
    id: "preset-winner-reuse",
    name: "Best Winner Reuse",
    description: "Campaign designed around proven winners.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "Reuse proven Product Bank and Performance winners where possible. Keep the structure fresh, but borrow the angles that already worked. Do not copy the same wording over and over.",
  },
  {
    id: "preset-clean-ad-safe",
    name: "Clean Ad-Safe Campaign",
    description: "Safer copy for boosted posts or ad-style captions.",
    mode: "clean_ad",
    tone: "clean",
    platforms: ["facebook", "instagram"],
    days: 5,
    notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive. Focus on product, local pride, and a clean CTA.",
  },
  {
    id: "preset-savage-organic",
    name: "Savage Organic",
    description: "Sharper organic posts where attitude matters more than ad safety.",
    mode: "funny_pittsburgh",
    tone: "savage_but_safe",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 5,
    notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful. Do not sound like a generic brand. The copy should feel like a local jagoff wrote it on purpose.",
  },
];

function readBank() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(BANK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBank(items) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BANK_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function safeJsonArray(key) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePreset(item) {
  return {
    id: item?.id || `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: clean(item?.name) || "Untitled Preset",
    description: clean(item?.description),
    mode: clean(item?.mode) || "product_drop",
    tone: clean(item?.tone) || "balanced",
    platforms: Array.isArray(item?.platforms) && item.platforms.length ? item.platforms.filter((platform) => PLATFORM_VALUES.has(platform)) : ["facebook", "instagram"],
    days: Math.max(1, Math.min(Number(item?.days) || 7, 31)),
    notes: clean(item?.notes),
    promoCode: clean(item?.promoCode),
    holiday: clean(item?.holiday),
  };
}

function readCampaignPresets() {
  const saved = safeJsonArray(PRESETS_KEY).map(normalizePreset);
  const savedIds = new Set(saved.map((preset) => preset.id));
  const defaults = DEFAULT_GENERATOR_PRESETS.filter((preset) => !savedIds.has(preset.id)).map(normalizePreset);
  const merged = [...defaults, ...saved];

  if (typeof window !== "undefined" && saved.length === 0) {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(merged));
  }

  return merged;
}

function presetSummary(preset) {
  return [
    `Campaign preset: ${preset.name}`,
    preset.mode ? `Mode: ${preset.mode}` : "",
    preset.tone ? `Tone: ${preset.tone}` : "",
    preset.platforms?.length ? `Platforms: ${preset.platforms.join(", ")}` : "",
    preset.holiday ? `Holiday: ${preset.holiday}` : "",
    preset.promoCode ? `Promo code: ${preset.promoCode}` : "",
    "",
    preset.notes,
  ].filter(Boolean).join("\n");
}

function setNativeValue(element, value) {
  if (!element) return false;

  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function fieldControlByLabel(labelText) {
  if (typeof document === "undefined") return null;
  const target = labelText.toLowerCase();
  const fields = Array.from(document.querySelectorAll(".field, .queueSetup"));
  const field = fields.find((item) => item.querySelector("label")?.textContent?.trim().toLowerCase() === target);
  return field?.querySelector("select, input, textarea") || null;
}

function setFieldByLabel(labelText, value) {
  return setNativeValue(fieldControlByLabel(labelText), value);
}

function setSelectByLabel(labelText, value) {
  const control = fieldControlByLabel(labelText);
  if (!control || control.tagName !== "SELECT") return false;
  const values = Array.from(control.options).map((option) => option.value);
  if (!values.includes(value)) return false;
  return setNativeValue(control, value);
}

function setSelectByOptionText(labelText, text) {
  const control = fieldControlByLabel(labelText);
  if (!control || control.tagName !== "SELECT" || !text) return false;
  const normalized = normalizeName(text);
  const option = Array.from(control.options).find((item) => normalizeName(item.textContent).includes(normalized) || normalized.includes(normalizeName(item.textContent)));
  if (!option) return false;
  return setNativeValue(control, option.value);
}

function inferGeneratorMode(preset) {
  if (preset.mode === "holiday") return "holiday";
  if (preset.mode === "clean_ad") return "clean_ad";
  if (preset.mode === "funny_pittsburgh") return "funny_pittsburgh";
  if (preset.mode === "short_video") return "short_video";
  return "product_drop";
}

function inferGeneratorPlatform(preset) {
  const platforms = Array.isArray(preset.platforms) ? preset.platforms.filter((platform) => PLATFORM_VALUES.has(platform)) : [];
  if (platforms.length !== 1) return "full_pack";
  return platforms[0];
}

function inferCampaignStyle(preset) {
  const haystack = normalizeName(`${preset.name} ${preset.description} ${preset.notes}`);
  if (haystack.includes("gift")) return "gift_guide";
  if (haystack.includes("last chance")) return "last_chance";
  if (haystack.includes("weekend")) return "weekend_push";
  return "sale_announcement";
}

function applyCampaignPreset(preset, statusNode) {
  const generatorMode = inferGeneratorMode(preset);
  const generatorPlatform = inferGeneratorPlatform(preset);
  const noteText = presetSummary(preset);

  setSelectByLabel("Mode", generatorMode);
  setSelectByLabel("Platform", generatorPlatform);
  setSelectByLabel("Tone", preset.tone || "balanced");
  setFieldByLabel("Extra notes", noteText);

  if (preset.platforms?.[0]) setSelectByLabel("Planned platform", preset.platforms[0]);

  window.setTimeout(() => {
    if (generatorMode === "holiday") {
      setFieldByLabel("Promo Code / Offer Details", preset.promoCode || "");
      setSelectByOptionText("Holiday / Sales Event", preset.holiday || preset.name);
      setSelectByLabel("Campaign Style", inferCampaignStyle(preset));
    }
  }, 80);

  if (statusNode) {
    statusNode.textContent = `Applied: ${preset.name}`;
    window.setTimeout(() => {
      statusNode.textContent = "";
    }, 1800);
  }
}

async function hydrateProducts() {
  if (cachedProducts.length > 0) return cachedProducts;

  try {
    const res = await fetch("/api/get-products");
    const data = await res.json();
    cachedProducts = Array.isArray(data) ? data : [];
  } catch {
    cachedProducts = [];
  }

  return cachedProducts;
}

function getCurrentProductName() {
  if (typeof document === "undefined") return "Current Promo Product";

  return (
    document.querySelector(".resultToolbar h2")?.textContent?.trim() ||
    document.querySelector(".selectedProduct h2")?.textContent?.trim() ||
    "Current Promo Product"
  );
}

function findProductByName(productName) {
  const target = normalizeName(productName);
  if (!target) return null;

  return cachedProducts.find((product) => normalizeName(product.name) === target)
    || cachedProducts.find((product) => normalizeName(product.name).includes(target))
    || cachedProducts.find((product) => target.includes(normalizeName(product.name)))
    || null;
}

function getCurrentProduct() {
  const productName = getCurrentProductName();
  const matchedProduct = findProductByName(productName);

  return {
    id: matchedProduct?.id ? String(matchedProduct.id) : "",
    name: matchedProduct?.name || productName,
    image: matchedProduct?.thumbnail_url || matchedProduct?.image || "",
    category: matchedProduct?.category || "gear",
  };
}

function normalizeQueuePlatformCopy() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return;

    const nextQueue = queue.map((item) => {
      const plannedPlatform = item?.scheduledPlatform;
      if (!PLATFORM_VALUES.has(plannedPlatform)) return item;

      return {
        ...item,
        displayPlatform: plannedPlatform,
      };
    });

    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
  } catch {
    // Keep dashboard usable even if old localStorage data is malformed.
  }
}

function relabelLoadButtons() {
  if (typeof document === "undefined") return;

  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent?.trim() === "Load") {
      button.textContent = "Open Pack";
    }
  });
}

function classifyResultBlock(title = "") {
  const lower = title.toLowerCase();

  if (lower.includes("facebook post") || lower.includes("facebook bundle")) return { type: "caption", platform: "facebook" };
  if (lower.includes("instagram caption") || lower.includes("instagram bundle")) return { type: "caption", platform: "instagram" };
  if (lower.includes("tiktok caption") || lower.includes("tiktok bundle")) return { type: "caption", platform: "tiktok" };
  if (lower.includes("youtube shorts title")) return { type: "hook", platform: "youtube_shorts" };
  if (lower.includes("youtube shorts description") || lower.includes("youtube shorts bundle")) return { type: "caption", platform: "youtube_shorts" };
  if (lower.includes("video hooks")) return { type: "hook", platform: "general" };
  if (lower.includes("short video script")) return { type: "note", platform: "general" };
  if (lower.includes("image overlay")) return { type: "overlay", platform: "general" };
  if (lower.includes("cta")) return { type: "cta", platform: "general" };
  if (lower.includes("brand angle")) return { type: "note", platform: "general" };
  if (lower.includes("clean ad") || lower.includes("edgy version")) return { type: "caption", platform: "general" };

  return { type: "note", platform: "general" };
}

function getResultText(block) {
  const contentNode = block.querySelector("pre") || block.querySelector("p");
  return contentNode?.textContent?.trim() || "";
}

function saveBlockToBank(block, button) {
  const title = block.querySelector("h3")?.textContent?.trim() || "Generated result";
  const text = getResultText(block);

  if (!text) {
    button.textContent = "No Text";
    window.setTimeout(() => {
      button.textContent = "Save to Bank";
    }, 1200);
    return;
  }

  const { type, platform } = classifyResultBlock(title);
  const product = getCurrentProduct();

  const entry = {
    id: `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    productCategory: product.category,
    type,
    platform,
    text,
    source: product.id ? "Generator Result" : "Generator Result - Product Match Needed",
    tag: title,
    status: product.id ? "Approved" : "Needs Review",
  };

  writeBank([entry, ...readBank()].slice(0, 800));

  button.textContent = product.id ? "Saved" : "Saved - Review";
  button.classList.add("bankSaved");
  window.setTimeout(() => {
    button.textContent = "Save to Bank";
    button.classList.remove("bankSaved");
  }, 1400);
}

function attachBankButtons() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".resultBlock").forEach((block) => {
    if (block.querySelector(".saveToBankButton")) return;

    const title = block.querySelector("h3")?.textContent?.trim() || "";
    if (title.toLowerCase().includes("warnings")) return;

    const top = block.querySelector(".resultTop");
    if (!top) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "saveToBankButton";
    button.textContent = "Save to Bank";
    button.addEventListener("click", () => saveBlockToBank(block, button));
    top.appendChild(button);
  });
}

function attachPresetHelper() {
  if (typeof document === "undefined") return;
  const controls = document.querySelector(".controls");
  if (!controls || controls.querySelector(".campaignPresetHelper")) return;

  const presets = readCampaignPresets();
  if (!presets.length) return;

  const panel = document.createElement("div");
  panel.className = "campaignPresetHelper full";
  panel.innerHTML = `
    <div>
      <p class="miniKicker">CAMPAIGN PRESET</p>
      <h3>Apply strategy</h3>
      <p class="presetHelp">Use a saved/default campaign preset to fill mode, tone, platform, and notes for this single promo pack.</p>
    </div>
    <div class="presetControls">
      <select aria-label="Campaign preset">
        ${presets.map((preset, index) => `<option value="${index}">${preset.name}${preset.description ? ` — ${preset.description}` : ""}</option>`).join("")}
      </select>
      <button type="button" class="applyPresetButton">Apply Preset</button>
      <button type="button" class="copyPresetButton">Copy Notes</button>
      <a href="/admin/promo-campaign-presets">Open Presets</a>
      <span class="presetStatus" aria-live="polite"></span>
    </div>
  `;

  const select = panel.querySelector("select");
  const statusNode = panel.querySelector(".presetStatus");
  panel.querySelector(".applyPresetButton")?.addEventListener("click", () => {
    const preset = presets[Number(select.value)] || presets[0];
    applyCampaignPreset(preset, statusNode);
  });
  panel.querySelector(".copyPresetButton")?.addEventListener("click", () => {
    const preset = presets[Number(select.value)] || presets[0];
    navigator.clipboard?.writeText(presetSummary(preset));
    if (statusNode) {
      statusNode.textContent = "Copied preset notes";
      window.setTimeout(() => {
        statusNode.textContent = "";
      }, 1500);
    }
  });

  const panelHead = controls.querySelector(".panelHead");
  if (panelHead?.nextSibling) controls.insertBefore(panel, panelHead.nextSibling);
  else controls.prepend(panel);
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById("local-jagoff-generator-wrapper-style")) return;

  const style = document.createElement("style");
  style.id = "local-jagoff-generator-wrapper-style";
  style.textContent = `
    .saveToBankButton {
      color: #000 !important;
      background: #ffe600 !important;
      border-color: #ffe600 !important;
    }

    .saveToBankButton.bankSaved {
      color: #000 !important;
      background: #9affb7 !important;
      border-color: #9affb7 !important;
    }

    .campaignPresetHelper {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1.25fr;
      gap: 14px;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, rgba(255,230,0,.13), rgba(5,5,5,.96));
      border: 1px solid rgba(255,230,0,.34);
      border-radius: 18px;
    }

    .campaignPresetHelper h3 {
      margin: 0;
      color: #ffe600;
      text-transform: uppercase;
      font-size: 22px;
    }

    .campaignPresetHelper .presetHelp {
      margin: 6px 0 0;
      color: #ddd;
      line-height: 1.45;
    }

    .presetControls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .presetControls select {
      min-width: 240px;
      flex: 1 1 260px;
      margin-top: 0 !important;
    }

    .presetControls button,
    .presetControls a {
      border: 1px solid #333;
      border-radius: 14px;
      padding: 12px 14px;
      font-weight: 900;
      color: #fff;
      background: #1b1b1b;
      text-decoration: none;
      cursor: pointer;
    }

    .presetControls .applyPresetButton {
      color: #000;
      background: #ffe600;
      border-color: #ffe600;
    }

    .presetStatus {
      color: #ffe600;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    @media (max-width: 760px) {
      .campaignPresetHelper { grid-template-columns: 1fr; }
      .presetControls button,
      .presetControls a,
      .presetControls select,
      .saveToBankButton { width: 100%; text-align: center; }
    }
  `;
  document.head.appendChild(style);
}

export default function PromoCommandCenter() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    normalizeQueuePlatformCopy();
    hydrateProducts();
    injectStyles();
    attachPresetHelper();
    attachBankButtons();
    relabelLoadButtons();
    setReady(true);

    const observer = new MutationObserver(() => {
      attachPresetHelper();
      attachBankButtons();
      relabelLoadButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!ready) return null;

  return (
    <>
      <PromoAdminNav />
      <PromoCommandCenterBase />
    </>
  );
}
