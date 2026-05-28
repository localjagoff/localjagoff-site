import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import PromoCommandCenterBase from "./promo-command-center-v6";

const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";

const DEFAULT_GENERATOR_PRESETS = [
  { id: "preset-savage-organic", name: "Savage Organic", description: "Sharper organic posts", mode: "funny_pittsburgh", tone: "savage_but_safe", platforms: ["facebook", "instagram", "tiktok"], notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful. Do not default to generic new-drop wording unless the user specifically asks for a launch/new drop post." },
  { id: "preset-724-local", name: "724 Local Push", description: "Focused 724 campaign", mode: "funny_pittsburgh", tone: "more_jagoff", platforms: ["facebook", "instagram", "tiktok"], notes: "This is for 724-area products. Do not mention 412 unless the product itself is specifically 412. Keep it western PA, local, gritty, and proud. Avoid generic new-drop scripting." },
  { id: "preset-hoodie-weather", name: "Hoodie Weather", description: "Cold-weather push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "Lean into hoodie weather, chilly Pittsburgh mornings, and comfort without sounding generic. Make the copy feel local, practical, and a little jagoff." },
  { id: "preset-clean-ad-safe", name: "Clean Ad-Safe Campaign", description: "Safer copy", mode: "clean_ad", tone: "clean", platforms: ["facebook", "instagram"], notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive." },
  { id: "preset-weekend-sale", name: "Weekend Sale", description: "Short weekend promo", mode: "sale", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "Weekend sale push. Mention the promo code if provided. Keep the CTA simple and make the post feel like a limited-time reason to shop, not a clearance dump." },
  { id: "preset-new-drop", name: "New Drop Push", description: "General launch push", mode: "product_drop", tone: "balanced", platforms: ["facebook", "instagram", "tiktok"], notes: "New gear is live. Keep it direct, product-focused, and local. Push urgency without sounding desperate. Mention Local Jagoff and make the product feel like part of Pittsburgh-area everyday gear." },
];

const PLATFORM_LABELS = {
  full_pack: "Facebook",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
};

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
  setSelectByLabel("Mode", clean(preset.mode) || "funny_pittsburgh");
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
      <p class="presetHelp">Pick a campaign direction before generating. New Drop is no longer the default.</p>
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

function defaultAwayFromNewDrop() {
  if (typeof document === "undefined") return;
  const mode = fieldControlByLabel("Mode");
  const notes = fieldControlByLabel("Extra notes");
  if (!mode || mode.dataset.localJagoffDefaultChecked) return;
  mode.dataset.localJagoffDefaultChecked = "true";
  if (mode.value === "product_drop") {
    setNativeValue(mode, "funny_pittsburgh");
    if (notes && !clean(notes.value)) {
      setNativeValue(notes, "Keep it local and useful. Do not default to generic new-drop wording unless I specifically pick a launch/new-drop preset.");
    }
  }
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

function getActivePlatform() {
  if (typeof document === "undefined") return "facebook";
  const active = document.querySelector(".platformSwitch button.active")?.textContent?.trim().toLowerCase() || "facebook";
  if (active.includes("instagram")) return "instagram";
  if (active.includes("tiktok")) return "tiktok";
  if (active.includes("youtube")) return "youtube_shorts";
  return "facebook";
}

function platformLinkLabel(platform) {
  if (platform === "instagram") return "Instagram link";
  if (platform === "tiktok") return "TikTok link";
  if (platform === "youtube_shorts") return "YouTube Shorts link";
  return "Facebook link";
}

function extractPlatformLink(ctaText, platform) {
  const text = String(ctaText || "");
  const label = platformLinkLabel(platform).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${label}:\\s*(https?:\\/\\/\\S+)`, "i"));
  if (match?.[1]) return match[1].trim();
  const first = text.match(/https?:\/\/\S+/i);
  return first?.[0]?.trim() || "";
}

function getResultBlocks() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(".resultBlock")).map((block, index) => {
    const title = block.querySelector("h3")?.textContent?.trim() || `Option ${index + 1}`;
    const body = block.querySelector("pre, p")?.textContent?.trim() || "";
    return { block, index, title, body };
  }).filter((item) => item.body);
}

function optionType(title) {
  const lower = title.toLowerCase();
  if (lower.includes("hashtag")) return "hashtags";
  if (lower.includes("overlay")) return "overlay";
  if (lower.includes("alt text")) return "alt";
  if (lower.includes("hook")) return "hook";
  if (lower.includes("script")) return "script";
  if (lower.includes("cta") || lower.includes("link")) return "link";
  if (lower.includes("facebook") || lower.includes("instagram") || lower.includes("tiktok") || lower.includes("description") || lower.includes("clean ad") || lower.includes("edgy")) return "main";
  return "support";
}

function fieldMatchesPlatform(title, platform) {
  const lower = title.toLowerCase();
  if (optionType(title) !== "main") return true;
  if (lower.includes("clean ad") || lower.includes("edgy")) return platform === "facebook" || platform === "instagram";
  if (platform === "facebook") return lower.includes("facebook") || lower.includes("clean ad") || lower.includes("edgy");
  if (platform === "instagram") return lower.includes("instagram") || lower.includes("clean ad") || lower.includes("edgy");
  if (platform === "tiktok") return lower.includes("tiktok");
  if (platform === "youtube_shorts") return lower.includes("youtube") || lower.includes("description");
  return true;
}

function getBuilderGroups(platform) {
  const blocks = getResultBlocks();
  const cta = blocks.find((item) => optionType(item.title) === "link")?.body || "";
  const link = extractPlatformLink(cta, platform);
  const main = blocks.filter((item) => optionType(item.title) === "main" && fieldMatchesPlatform(item.title, platform));
  return {
    main: main.length ? main : blocks.filter((item) => optionType(item.title) === "main").slice(0, 3),
    hashtags: blocks.filter((item) => optionType(item.title) === "hashtags"),
    overlay: blocks.filter((item) => optionType(item.title) === "overlay"),
    alt: blocks.filter((item) => optionType(item.title) === "alt"),
    hooks: blocks.filter((item) => optionType(item.title) === "hook"),
    script: blocks.filter((item) => optionType(item.title) === "script"),
    link,
  };
}

function shortPreview(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 165 ? `${text.slice(0, 165)}...` : text;
}

function builderFieldValue(builder, key) {
  return builder.querySelector(`[data-builder-field="${key}"]`)?.value?.trim() || "";
}

function buildFinalTextFromBuilder(builder) {
  const platform = builder.dataset.platform || "facebook";
  const opening = builderFieldValue(builder, "opening");
  const main = builderFieldValue(builder, "main");
  const extra = builderFieldValue(builder, "extra");
  const hashtags = builderFieldValue(builder, "hashtags");
  const link = builderFieldValue(builder, "link");
  const script = builderFieldValue(builder, "script");

  if (platform === "tiktok" || platform === "youtube_shorts") {
    return [opening, main, extra, hashtags, link ? `Shop: ${link}` : "", script ? `Script / shot list:\n${script}` : ""].filter(Boolean).join("\n\n");
  }

  if (platform === "instagram") {
    return [opening, main, extra, hashtags, link ? `Shop: ${link}` : ""].filter(Boolean).join("\n\n");
  }

  return [opening, main, extra, link ? `Shop: ${link}` : ""].filter(Boolean).join("\n\n");
}

function updateFinalPreviewFromBuilder() {
  const builder = document.querySelector(".postWorkbench");
  const textarea = document.querySelector(".finalPreview textarea");
  if (!builder || !textarea) return;
  textarea.value = buildFinalTextFromBuilder(builder);
}

function useOption(builder, key, value) {
  const field = builder.querySelector(`[data-builder-field="${key}"]`);
  if (!field) return;
  field.value = value || "";
  updateFinalPreviewFromBuilder();
}

function renderUseOptions(title, key, options) {
  if (!options.length) return "";
  return `
    <div class="partOptions">
      <div class="partHead"><strong>${escapeHtml(title)}</strong><span>${options.length} option${options.length === 1 ? "" : "s"}</span></div>
      ${options.map((option, index) => `
        <button type="button" class="usePartButton" data-use-key="${key}" data-use-value="${escapeHtml(option.body)}">
          <em>Use Option ${index + 1}</em>
          <span>${escapeHtml(shortPreview(option.body))}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function ensurePostWorkbench() {
  if (typeof document === "undefined") return;
  const output = document.querySelector(".studioOutput");
  const preview = document.querySelector(".finalPreview");
  const textarea = preview?.querySelector("textarea");
  const results = document.querySelector(".results");
  if (!output || !preview || !textarea || !results) return;

  const platform = getActivePlatform();
  const groups = getBuilderGroups(platform);
  if (!groups.main.length && !groups.script.length) return;

  let workbench = document.querySelector(".postWorkbench");
  if (!workbench) {
    workbench = document.createElement("section");
    workbench.className = "postWorkbench";
    output.insertBefore(workbench, results);
  }

  const signature = JSON.stringify({
    platform,
    main: groups.main.map((item) => item.title + item.body.slice(0, 80)),
    hashtags: groups.hashtags.map((item) => item.title + item.body.slice(0, 80)),
    hooks: groups.hooks.map((item) => item.title + item.body.slice(0, 80)),
    script: groups.script.map((item) => item.title + item.body.slice(0, 80)),
    link: groups.link,
  });

  if (workbench.dataset.signature === signature) {
    updateFinalPreviewFromBuilder();
    return;
  }

  workbench.dataset.signature = signature;
  workbench.dataset.platform = platform;

  const firstMain = groups.main[0]?.body || "";
  const firstHashtags = groups.hashtags[0]?.body || "";
  const firstHook = groups.hooks[0]?.body || "";
  const firstScript = groups.script[0]?.body || "";

  workbench.innerHTML = `
    <div class="builderTitle">
      <p class="miniKicker">POST BUILDER</p>
      <h2>Build your own ${escapeHtml(PLATFORM_LABELS[platform] || "post")}</h2>
      <p>Use generated parts, rewrite any section, add your own line, then copy the final preview.</p>
      <div class="builderTopActions">
        <button type="button" class="regenerateAllButton">Regenerate All</button>
        <button type="button" class="copyBuilderButton">Copy Builder Preview</button>
      </div>
    </div>

    <section class="builderEditor">
      <label>Opening / hook<textarea data-builder-field="opening" placeholder="Optional opener or hook...">${escapeHtml(firstHook)}</textarea></label>
      <label>Main copy<textarea data-builder-field="main" placeholder="Write or use one generated main copy option...">${escapeHtml(firstMain)}</textarea></label>
      <label>Extra line / add-on<textarea data-builder-field="extra" placeholder="Add anything extra you want in the final post..."></textarea></label>
      <label>Hashtags<textarea data-builder-field="hashtags" placeholder="Hashtags...">${escapeHtml(firstHashtags)}</textarea></label>
      <label>Platform link<input data-builder-field="link" value="${escapeHtml(groups.link)}" placeholder="Platform/product link..." /></label>
      <label>Script / shot list<textarea data-builder-field="script" placeholder="Optional TikTok/Shorts script, voiceover, or shot list...">${escapeHtml(firstScript)}</textarea></label>
    </section>

    <section class="builderSourceParts">
      ${renderUseOptions("Main copy options", "main", groups.main)}
      ${renderUseOptions("Hook options", "opening", groups.hooks)}
      ${renderUseOptions("Hashtag options", "hashtags", groups.hashtags)}
      ${renderUseOptions("Script options", "script", groups.script)}
    </section>
  `;

  workbench.querySelectorAll("textarea,input").forEach((field) => {
    field.addEventListener("input", updateFinalPreviewFromBuilder);
  });

  workbench.querySelectorAll(".usePartButton").forEach((button) => {
    button.addEventListener("click", () => useOption(workbench, button.dataset.useKey, button.dataset.useValue));
  });

  workbench.querySelector(".copyBuilderButton")?.addEventListener("click", () => {
    navigator.clipboard?.writeText(document.querySelector(".finalPreview textarea")?.value || "");
  });

  workbench.querySelector(".regenerateAllButton")?.addEventListener("click", () => {
    const createButton = Array.from(document.querySelectorAll(".dashboardNav button")).find((button) => clean(button.textContent) === "Create");
    createButton?.click();
    window.setTimeout(() => {
      const generateButton = Array.from(document.querySelectorAll("button")).find((button) => clean(button.textContent).includes("Generate With AI"));
      generateButton?.click();
    }, 180);
  });

  updateFinalPreviewFromBuilder();

  const heading = preview.querySelector("h2");
  if (heading) heading.textContent = `${PLATFORM_LABELS[platform] || "Post"} final preview`;
}

function installCopyReadyOverride() {
  if (typeof document === "undefined" || document.__localJagoffCopyReadyOverride) return;
  document.__localJagoffCopyReadyOverride = true;
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button || clean(button.textContent) !== "Copy Ready Post") return;
    const text = document.querySelector(".finalPreview textarea")?.value || "";
    if (!text) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    navigator.clipboard?.writeText(text);
  }, true);
}

function hideWarningBlocks() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".resultBlock").forEach((block) => {
    const title = block.querySelector("h3")?.textContent?.trim().toLowerCase() || "";
    if (title.includes("warnings") || title.includes("notes") || title.includes("bundle") || title.includes("cta / link helper")) block.style.display = "none";
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
    .studioOutput{display:grid!important;grid-template-columns:minmax(280px,380px) minmax(0,1fr)!important;gap:16px!important;align-items:start!important;width:100%!important;max-width:100%!important;overflow:hidden!important}
    .finalPreview,.postWorkbench,.results{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
    .finalPreview{position:sticky!important;top:74px!important;align-self:start!important;overflow:hidden!important}
    .finalPreview textarea{width:100%!important;max-width:100%!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;font-size:13px!important;line-height:1.45!important;resize:vertical!important;min-height:330px!important}
    .postWorkbench{display:grid!important;gap:12px!important}
    .builderTitle,.builderEditor,.builderSourceParts,.partOptions{background:rgba(13,13,13,.92)!important;border:1px solid rgba(255,230,0,.2)!important;border-radius:18px!important;padding:16px!important;box-shadow:0 18px 56px rgba(0,0,0,.32)!important;min-width:0!important;overflow:hidden!important}
    .builderTitle h2,.partOptions strong{margin:0!important;color:#ffe600!important;text-transform:uppercase!important;line-height:1.08!important}
    .builderTitle p{margin:8px 0 0!important;color:#ddd!important;line-height:1.45!important;overflow-wrap:anywhere!important}
    .builderTopActions{display:flex!important;gap:10px!important;flex-wrap:wrap!important;margin-top:14px!important}
    .builderTopActions button,.usePartButton{border:1px solid #333!important;border-radius:14px!important;background:#1b1b1b!important;color:#fff!important;padding:12px 14px!important;font-weight:900!important;cursor:pointer!important}
    .builderTopActions .regenerateAllButton{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}
    .builderEditor{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
    .builderEditor label{display:grid!important;gap:7px!important;color:#ffe600!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important}
    .builderEditor label:nth-child(2),.builderEditor label:nth-child(6){grid-column:1/-1!important}
    .builderEditor textarea,.builderEditor input{width:100%!important;box-sizing:border-box!important;border:1px solid #333!important;border-radius:14px!important;background:#050505!important;color:#fff!important;padding:12px!important;font-size:13px!important;line-height:1.45!important;min-height:74px!important;resize:vertical!important}
    .builderEditor label:nth-child(2) textarea,.builderEditor label:nth-child(6) textarea{min-height:126px!important}
    .builderSourceParts{display:grid!important;gap:12px!important}
    .partHead{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:center!important;margin-bottom:10px!important}
    .partHead span{color:#aaa!important;font-size:11px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;white-space:nowrap!important}
    .partOptions{display:grid!important;gap:8px!important}
    .usePartButton{display:grid!important;gap:6px!important;width:100%!important;text-align:left!important;background:#101010!important;min-width:0!important;box-sizing:border-box!important}
    .usePartButton em{font-style:normal!important;color:#ffe600!important;text-transform:uppercase!important;font-size:12px!important;letter-spacing:1px!important}
    .usePartButton span{color:#ddd!important;font-size:13px!important;line-height:1.4!important;overflow-wrap:anywhere!important;white-space:normal!important}
    .usePartButton:hover{border-color:#ffe600!important;background:rgba(255,230,0,.12)!important}
    .results{display:none!important}
    .previewNote{display:none!important}
    @media(max-width:1100px){.studioOutput{grid-template-columns:1fr!important}.finalPreview{position:static!important}.postWorkbench{order:2}}
    @media(max-width:980px){.promoSmartRow{grid-template-columns:1fr!important}.presetControls{grid-template-columns:1fr!important}.presetControls button,.presetControls a,.presetControls select{width:100%!important;text-align:center!important}.builderEditor{grid-template-columns:1fr!important}.builderEditor label{grid-column:1/-1!important}.builderTopActions button{width:100%!important}}
  `;
  document.head.appendChild(style);
}

function refreshPromoStudioEnhancements() {
  attachPresetHelper();
  attachProductBankWinnerHelper();
  defaultAwayFromNewDrop();
  hideWarningBlocks();
  ensurePostWorkbench();
}

export default function PromoCommandCenter() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectStyles();
    installCopyReadyOverride();
    refreshPromoStudioEnhancements();
    setReady(true);

    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__localJagoffPromoStudioRefresh);
      window.__localJagoffPromoStudioRefresh = window.setTimeout(refreshPromoStudioEnhancements, 80);
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
