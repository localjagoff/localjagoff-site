import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import PromoCommandCenterBase from "./promo-command-center-v6";

const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";

const DEFAULT_GENERATOR_PRESETS = [
  { id: "preset-new-drop", name: "New Drop Push", description: "General launch push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "New gear is live. Keep it direct, product-focused, and local. Push urgency without sounding desperate. Mention Local Jagoff and make the product feel like part of Pittsburgh-area everyday gear." },
  { id: "preset-hoodie-weather", name: "Hoodie Weather", description: "Cold-weather push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "Lean into hoodie weather, chilly Pittsburgh mornings, and comfort without sounding generic. Make the copy feel local, practical, and a little jagoff." },
  { id: "preset-724-local", name: "724 Local Push", description: "Focused 724 campaign", mode: "product_drop", tone: "more_jagoff", platforms: ["facebook", "instagram", "tiktok"], notes: "This is for 724-area products. Do not mention 412 unless the product itself is specifically 412. Keep it western PA, local, gritty, and proud." },
  { id: "preset-weekend-sale", name: "Weekend Sale", description: "Short weekend promo", mode: "sale", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "Weekend sale push. Mention the promo code if provided. Keep the CTA simple and make the post feel like a limited-time reason to shop, not a clearance dump." },
  { id: "preset-clean-ad-safe", name: "Clean Ad-Safe Campaign", description: "Safer copy", mode: "clean_ad", tone: "clean", platforms: ["facebook", "instagram"], notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive." },
  { id: "preset-savage-organic", name: "Savage Organic", description: "Sharper organic posts", mode: "funny_pittsburgh", tone: "savage_but_safe", platforms: ["facebook", "instagram", "tiktok"], notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful." },
];

function clean(value) {
  return String(value || "").trim();
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

function readCampaignPresets() {
  const saved = safeJsonArray(PRESETS_KEY);
  const savedIds = new Set(saved.map((preset) => preset.id));
  const defaults = DEFAULT_GENERATOR_PRESETS.filter((preset) => !savedIds.has(preset.id));
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
    Array.isArray(preset.platforms) && preset.platforms.length ? `Platforms: ${preset.platforms.join(", ")}` : "",
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

function inferPlatform(preset) {
  const platforms = Array.isArray(preset.platforms) ? preset.platforms : [];
  return platforms.length === 1 ? platforms[0] : "full_pack";
}

function applyCampaignPreset(preset, statusNode) {
  setSelectByLabel("Mode", clean(preset.mode) || "product_drop");
  setSelectByLabel("Platform", inferPlatform(preset));
  setSelectByLabel("Tone", clean(preset.tone) || "balanced");
  setFieldByLabel("Extra notes", presetSummary(preset));
  if (preset.platforms?.[0]) setSelectByLabel("Planned platform", preset.platforms[0]);
  showStatus(statusNode, `Applied ${preset.name}`);
}

function showStatus(statusNode, text) {
  if (!statusNode) return;
  statusNode.textContent = text;
  window.clearTimeout(statusNode.__timer);
  statusNode.__timer = window.setTimeout(() => { statusNode.textContent = ""; }, 1600);
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
      <p class="presetHelp">Pick a saved/default campaign setup, then apply it to this Promo Studio pack.</p>
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

function getCurrentProductName() {
  if (typeof document === "undefined") return "Current Promo Product";
  return document.querySelector(".resultToolbar h2")?.textContent?.trim() || document.querySelector(".selectedProduct h2")?.textContent?.trim() || "Current Promo Product";
}

function attachProductBankWinnerHelper() {
  if (typeof document === "undefined") return;
  const controls = document.querySelector(".controls");
  if (!controls) return;
  const row = smartRowForControls(controls);
  if (row.querySelector(".productBankWinnerHelper")) return;

  const productName = getCurrentProductName();
  const bank = safeJsonArray(BANK_KEY).filter((entry) => !entry.status || entry.status === "Approved");
  const productEntries = bank.filter((entry) => clean(entry.productName).toLowerCase() === clean(productName).toLowerCase()).slice(0, 6);

  const panel = document.createElement("section");
  panel.className = "productBankWinnerHelper";
  panel.innerHTML = `
    <div class="helperTop">
      <p class="miniKicker">PROMO PARTS</p>
      <h3>Reuse winners</h3>
      <p class="presetHelp">${productEntries.length ? `${productEntries.length} approved part${productEntries.length === 1 ? "" : "s"} found for this product.` : "No approved Promo Parts found for this product yet."}</p>
    </div>
    <div class="presetControls compactOnly">
      <a href="/admin/promo-product-bank">Open Promo Parts</a>
    </div>
  `;

  row.appendChild(panel);
}

function hideWarningBlocks() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".resultBlock").forEach((block) => {
    const title = block.querySelector("h3")?.textContent?.trim().toLowerCase() || "";
    if (title.includes("warnings") || title.includes("notes")) block.style.display = "none";
  });
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById("local-jagoff-generator-wrapper-style")) return;
  const style = document.createElement("style");
  style.id = "local-jagoff-generator-wrapper-style";
  style.textContent = `
    .controls{min-width:0!important;align-items:start!important}
    .controls>.full,.controls>.promoSmartRow{grid-column:1/-1!important;min-width:0!important;width:100%!important}
    .promoSmartRow{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))!important;gap:14px!important;align-items:stretch!important;margin:0!important;padding:0!important}
    .campaignPresetHelper,.productBankWinnerHelper{min-width:0!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:1fr!important;gap:14px!important;align-content:start!important;padding:18px!important;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(5,5,5,.96))!important;border:1px solid rgba(255,230,0,.34)!important;border-radius:18px!important;overflow:hidden!important}
    .productBankWinnerHelper{background:linear-gradient(135deg,rgba(255,230,0,.08),rgba(5,5,5,.96))!important;border-color:rgba(255,230,0,.24)!important}
    .campaignPresetHelper h3,.productBankWinnerHelper h3{margin:0!important;color:#ffe600!important;text-transform:uppercase!important;font-size:26px!important;line-height:1.05!important;word-break:normal!important}
    .campaignPresetHelper .presetHelp,.productBankWinnerHelper .presetHelp{margin:8px 0 0!important;color:#ddd!important;line-height:1.45!important;max-width:62ch!important;word-break:normal!important}
    .presetControls{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:center!important;min-width:0!important;width:100%!important}
    .presetControls select{grid-column:1/-1!important;min-width:0!important;width:100%!important;max-width:100%!important;min-height:46px!important;margin:0!important;box-sizing:border-box!important;color:#fff!important;background:#050505!important;border:1px solid #333!important;border-radius:14px!important;padding:12px 14px!important}
    .presetControls button,.presetControls a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;width:100%!important;border:1px solid #333!important;border-radius:14px!important;padding:11px 14px!important;font-weight:900!important;color:#fff!important;background:#1b1b1b!important;text-decoration:none!important;cursor:pointer!important;white-space:nowrap!important;line-height:1.1!important;box-sizing:border-box!important}
    .presetControls .applyPresetButton{color:#000!important;background:#ffe600!important;border-color:#ffe600!important}
    .presetControls.compactOnly{grid-template-columns:1fr!important}
    .presetStatus{grid-column:1/-1;color:#ffe600!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;min-height:16px!important}
    @media(max-width:980px){.promoSmartRow{grid-template-columns:1fr!important}.presetControls{grid-template-columns:1fr!important}.presetControls button,.presetControls a,.presetControls select{width:100%!important;text-align:center!important}}
  `;
  document.head.appendChild(style);
}

export default function PromoCommandCenter() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectStyles();
    attachPresetHelper();
    attachProductBankWinnerHelper();
    hideWarningBlocks();
    setReady(true);

    const observer = new MutationObserver(() => {
      attachPresetHelper();
      attachProductBankWinnerHelper();
      hideWarningBlocks();
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
