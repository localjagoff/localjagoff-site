import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import PromoCommandCenterBase from "./promo-command-center-v6";

const QUEUE_STORAGE_KEY = "localJagoffPromoQueue";
const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";

const PLATFORM_VALUES = new Set(["facebook", "instagram", "tiktok", "youtube_shorts"]);
const PLATFORM_LABEL_TO_VALUE = {
  "full pack": "full_pack",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  "youtube shorts": "youtube_shorts",
};

let cachedProducts = [];

const DEFAULT_GENERATOR_PRESETS = [
  { id: "preset-new-drop", name: "New Drop Push", description: "General launch push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], days: 5, notes: "New gear is live. Keep it direct, product-focused, and local. Push urgency without sounding desperate. Mention Local Jagoff and make the product feel like part of Pittsburgh-area everyday gear." },
  { id: "preset-hoodie-weather", name: "Hoodie Weather", description: "Cold-weather push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], days: 7, notes: "Lean into hoodie weather, chilly Pittsburgh mornings, and comfort without sounding generic. Make the copy feel local, practical, and a little jagoff." },
  { id: "preset-724-local", name: "724 Local Push", description: "Focused 724 campaign", mode: "product_drop", tone: "more_jagoff", platforms: ["facebook", "instagram", "tiktok"], days: 7, notes: "This is for 724-area products. Do not mention 412 unless the product itself is specifically 412. Keep it western PA, local, gritty, and proud." },
  { id: "preset-weekend-sale", name: "Weekend Sale", description: "Short weekend promo", mode: "sale", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], days: 3, notes: "Weekend sale push. Mention the promo code if provided. Keep the CTA simple and make the post feel like a limited-time reason to shop, not a clearance dump." },
  { id: "preset-holiday-promo", name: "Holiday Promo", description: "Holiday sale framework", mode: "holiday", tone: "clean", platforms: ["facebook", "instagram", "tiktok", "youtube_shorts"], days: 7, notes: "Holiday promo campaign. Use the selected holiday as the reason for the campaign. Mention the promo code if provided. Keep the copy festive but still Local Jagoff, not corporate or cheesy." },
  { id: "preset-winner-reuse", name: "Best Winner Reuse", description: "Reuse winners", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], days: 7, notes: "Reuse proven Promo Parts and Performance winners where possible. Keep the structure fresh, but borrow the angles that already worked." },
  { id: "preset-clean-ad-safe", name: "Clean Ad-Safe Campaign", description: "Safer copy", mode: "clean_ad", tone: "clean", platforms: ["facebook", "instagram"], days: 5, notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive." },
  { id: "preset-savage-organic", name: "Savage Organic", description: "Sharper organic posts", mode: "funny_pittsburgh", tone: "savage_but_safe", platforms: ["facebook", "instagram", "tiktok"], days: 5, notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful." },
];

function clean(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function readBank() {
  return safeJsonArray(BANK_KEY);
}

function writeBank(items) {
  if (typeof window !== "undefined") window.localStorage.setItem(BANK_KEY, JSON.stringify(Array.isArray(items) ? items : []));
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
  if (typeof window !== "undefined" && saved.length === 0) window.localStorage.setItem(PRESETS_KEY, JSON.stringify(merged));
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

function appendExtraNotes(value, statusNode) {
  const control = fieldControlByLabel("Extra notes");
  const existing = clean(control?.value || "");
  setFieldByLabel("Extra notes", [existing, clean(value)].filter(Boolean).join("\n\n"));
  showStatus(statusNode, "Added to notes");
}

function showStatus(statusNode, text) {
  if (!statusNode) return;
  statusNode.textContent = text;
  window.setTimeout(() => { statusNode.textContent = ""; }, 1600);
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
  setSelectByLabel("Mode", generatorMode);
  setSelectByLabel("Platform", inferGeneratorPlatform(preset));
  setSelectByLabel("Tone", preset.tone || "balanced");
  setFieldByLabel("Extra notes", presetSummary(preset));
  if (preset.platforms?.[0]) setSelectByLabel("Planned platform", preset.platforms[0]);

  window.setTimeout(() => {
    if (generatorMode === "holiday") {
      setFieldByLabel("Promo Code / Offer Details", preset.promoCode || "");
      setSelectByOptionText("Holiday / Sales Event", preset.holiday || preset.name);
      setSelectByLabel("Campaign Style", inferCampaignStyle(preset));
    }
  }, 80);

  showStatus(statusNode, `Applied: ${preset.name}`);
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
  return document.querySelector(".resultToolbar h2")?.textContent?.trim() || document.querySelector(".selectedProduct h2")?.textContent?.trim() || "Current Promo Product";
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

function getCurrentDisplayPlatform() {
  if (typeof document === "undefined") return "full_pack";
  const activeButton = document.querySelector(".platformSwitch button.active");
  const activeLabel = normalizeName(activeButton?.textContent || "");
  if (PLATFORM_LABEL_TO_VALUE[activeLabel]) return PLATFORM_LABEL_TO_VALUE[activeLabel];
  const toolbarText = normalizeName(document.querySelector(".resultToolbar .miniKicker")?.textContent || "");
  const matchedLabel = Object.keys(PLATFORM_LABEL_TO_VALUE).find((label) => toolbarText.includes(label));
  return matchedLabel ? PLATFORM_LABEL_TO_VALUE[matchedLabel] : "full_pack";
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
      return { ...item, displayPlatform: plannedPlatform };
    });
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
  } catch {}
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
    window.setTimeout(() => { button.textContent = "Save to Parts"; }, 1200);
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
  window.setTimeout(() => { button.textContent = "Save to Parts"; button.classList.remove("bankSaved"); }, 1400);
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
    button.textContent = "Save to Parts";
    button.addEventListener("click", () => saveBlockToBank(block, button));
    top.appendChild(button);
  });
}

function bankMatchesProduct(entry, product) {
  const entryId = String(entry.productId || "");
  const productId = String(product.id || "");
  const entryName = normalizeName(entry.productName || "");
  const productName = normalizeName(product.name || "");
  return (entryId && productId && entryId === productId) || (entryName && productName && (entryName === productName || entryName.includes(productName) || productName.includes(entryName)));
}

function bankEntryScore(entry) {
  let score = 0;
  if (entry.source?.toLowerCase?.().includes("winner")) score += 10;
  if (entry.status === "Approved") score += 5;
  if (entry.type === "caption") score += 3;
  if (entry.type === "hook") score += 2;
  return score;
}

function getRelevantBankEntries(product, platform) {
  const currentPlatform = platform === "full_pack" ? "general" : platform;
  return readBank()
    .filter((entry) => !entry.status || entry.status === "Approved")
    .filter((entry) => bankMatchesProduct(entry, product))
    .filter((entry) => entry.platform === currentPlatform || entry.platform === "general" || platform === "full_pack")
    .sort((a, b) => bankEntryScore(b) - bankEntryScore(a))
    .slice(0, 8);
}

function bankEntrySummary(entry) {
  return `Promo Parts winner (${entry.type || "note"} / ${entry.platform || "general"}): ${entry.text || ""}`;
}

function relabelLoadButtons() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent?.trim() === "Load") button.textContent = "Open Pack";
  });
}

function smartRowForControls(controls) {
  let row = controls.querySelector(".promoSmartRow");
  if (row) return row;

  row = document.createElement("div");
  row.className = "promoSmartRow full";
  const panelHead = controls.querySelector(".panelHead");
  if (panelHead?.nextSibling) controls.insertBefore(row, panelHead.nextSibling);
  else controls.prepend(row);
  return row;
}

function attachPresetHelper() {
  if (typeof document === "undefined") return;
  const controls = document.querySelector(".controls");
  if (!controls) return;
  const row = smartRowForControls(controls);
  if (row.querySelector(".campaignPresetHelper")) return;

  const presets = readCampaignPresets();
  if (!presets.length) return;

  const panel = document.createElement("section");
  panel.className = "campaignPresetHelper";
  panel.innerHTML = `
    <div class="helperTop">
      <p class="miniKicker">CAMPAIGN PRESET</p>
      <h3>Apply strategy</h3>
      <p class="presetHelp">Use a saved/default preset to fill mode, tone, platform, and notes for this promo pack.</p>
    </div>
    <div class="presetControls">
      <select aria-label="Campaign preset">${presets.map((preset, index) => `<option value="${index}">${escapeHtml(preset.name)}${preset.description ? ` — ${escapeHtml(preset.description)}` : ""}</option>`).join("")}</select>
      <button type="button" class="applyPresetButton">Apply Preset</button>
      <button type="button" class="copyPresetButton">Copy Notes</button>
      <a href="/admin/promo-campaign-presets">Open Presets</a>
      <span class="presetStatus" aria-live="polite"></span>
    </div>
  `;

  const select = panel.querySelector("select");
  const statusNode = panel.querySelector(".presetStatus");
  panel.querySelector(".applyPresetButton")?.addEventListener("click", () => applyCampaignPreset(presets[Number(select.value)] || presets[0], statusNode));
  panel.querySelector(".copyPresetButton")?.addEventListener("click", () => {
    const preset = presets[Number(select.value)] || presets[0];
    navigator.clipboard?.writeText(presetSummary(preset));
    showStatus(statusNode, "Copied preset notes");
  });

  row.prepend(panel);
}

function attachProductBankWinnerHelper() {
  if (typeof document === "undefined") return;
  const controls = document.querySelector(".controls");
  if (!controls) return;
  const row = smartRowForControls(controls);

  const product = getCurrentProduct();
  const platform = getCurrentDisplayPlatform();
  const productKey = `${product.id || product.name}|${platform}`;
  const existing = row.querySelector(".productBankWinnerHelper");
  if (existing?.dataset.productKey === productKey) return;
  if (existing) existing.remove();

  const entries = getRelevantBankEntries(product, platform);
  const panel = document.createElement("section");
  panel.className = "productBankWinnerHelper";
  panel.dataset.productKey = productKey;
  panel.innerHTML = `
    <div class="helperTop">
      <p class="miniKicker">PROMO PARTS WINNERS</p>
      <h3>Reuse what worked</h3>
      <p class="presetHelp">${entries.length ? `${entries.length} approved line${entries.length === 1 ? "" : "s"} found for this product/platform.` : "No approved Promo Parts winners found for the current product/platform yet."}</p>
    </div>
    <div class="presetControls">
      ${entries.length ? `<select aria-label="Promo Parts winner">${entries.map((entry, index) => `<option value="${index}">${escapeHtml(entry.type || "note")} / ${escapeHtml(entry.platform || "general")}: ${escapeHtml(String(entry.text || "").slice(0, 95))}</option>`).join("")}</select><button type="button" class="applyBankWinnerButton">Add to Notes</button><button type="button" class="copyBankWinnerButton">Copy Winner</button>` : ""}
      <a href="/admin/promo-product-bank">Open Promo Parts</a>
      <span class="presetStatus" aria-live="polite"></span>
    </div>
  `;

  const select = panel.querySelector("select");
  const statusNode = panel.querySelector(".presetStatus");
  panel.querySelector(".applyBankWinnerButton")?.addEventListener("click", () => {
    const entry = entries[Number(select.value)] || entries[0];
    if (entry) appendExtraNotes(bankEntrySummary(entry), statusNode);
  });
  panel.querySelector(".copyBankWinnerButton")?.addEventListener("click", () => {
    const entry = entries[Number(select.value)] || entries[0];
    if (entry) navigator.clipboard?.writeText(entry.text || "");
    showStatus(statusNode, "Copied winner");
  });

  row.appendChild(panel);
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById("local-jagoff-generator-wrapper-style")) return;
  const style = document.createElement("style");
  style.id = "local-jagoff-generator-wrapper-style";
  style.textContent = `
    .controls{min-width:0!important;align-items:start!important}
    .controls > .full,.controls > .promoSmartRow{grid-column:1/-1!important;min-width:0!important;width:100%!important}
    .promoSmartRow{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(330px,1fr))!important;gap:14px!important;align-items:stretch!important;margin:0!important;padding:0!important}
    .campaignPresetHelper,.productBankWinnerHelper{min-width:0!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:1fr!important;gap:14px!important;align-content:start!important;padding:18px!important;background:linear-gradient(135deg,rgba(255,230,0,.13),rgba(5,5,5,.96))!important;border:1px solid rgba(255,230,0,.34)!important;border-radius:18px!important;overflow:hidden!important}
    .productBankWinnerHelper{background:linear-gradient(135deg,rgba(255,230,0,.09),rgba(5,5,5,.96))!important;border-color:rgba(255,230,0,.24)!important}
    .campaignPresetHelper .helperTop,.productBankWinnerHelper .helperTop{min-width:0!important}
    .campaignPresetHelper h3,.productBankWinnerHelper h3{margin:0!important;color:#ffe600!important;text-transform:uppercase!important;font-size:24px!important;line-height:1.05!important;word-break:normal!important;overflow-wrap:normal!important}
    .campaignPresetHelper .presetHelp,.productBankWinnerHelper .presetHelp{margin:8px 0 0!important;color:#ddd!important;line-height:1.45!important;max-width:62ch!important;word-break:normal!important;overflow-wrap:normal!important}
    .presetControls{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto auto!important;gap:10px!important;align-items:center!important;min-width:0!important;width:100%!important}
    .presetControls select{min-width:0!important;width:100%!important;max-width:100%!important;margin-top:0!important;box-sizing:border-box!important;white-space:normal!important}
    .presetControls button,.presetControls a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;border:1px solid #333!important;border-radius:14px!important;padding:11px 14px!important;font-weight:900!important;color:#fff!important;background:#1b1b1b!important;text-decoration:none!important;cursor:pointer!important;white-space:nowrap!important;line-height:1.1!important;box-sizing:border-box!important}
    .presetControls .applyPresetButton,.presetControls .applyBankWinnerButton{color:#000!important;background:#ffe600!important;border-color:#ffe600!important}
    .presetStatus{grid-column:1/-1;color:#ffe600!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;min-height:16px!important}
    .saveToBankButton{color:#000!important;background:#ffe600!important;border-color:#ffe600!important}.saveToBankButton.bankSaved{color:#000!important;background:#9affb7!important;border-color:#9affb7!important}
    @media(max-width:980px){.promoSmartRow{grid-template-columns:1fr!important}.presetControls{grid-template-columns:1fr!important}.presetControls button,.presetControls a,.presetControls select,.saveToBankButton{width:100%!important;text-align:center!important}}
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
    attachProductBankWinnerHelper();
    attachBankButtons();
    relabelLoadButtons();
    setReady(true);

    const observer = new MutationObserver(() => {
      attachPresetHelper();
      attachProductBankWinnerHelper();
      attachBankButtons();
      relabelLoadButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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
