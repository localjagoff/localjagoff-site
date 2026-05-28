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
      <p class="presetHelp">Pick a campaign direction before generating. New Drop is not the default.</p>
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

function optionType(title) {
  const lower = title.toLowerCase();
  if (lower.includes("bundle")) return "ignore";
  if (lower.includes("warning") || lower.includes("notes")) return "ignore";
  if (lower.includes("hashtag")) return "hashtags";
  if (lower.includes("overlay")) return "overlay";
  if (lower.includes("alt text")) return "alt";
  if (lower.includes("hook")) return "hook";
  if (lower.includes("script")) return "script";
  if (lower.includes("cta") || lower.includes("link")) return "link";
  if (lower.includes("facebook") || lower.includes("instagram") || lower.includes("tiktok") || lower.includes("description") || lower.includes("clean ad") || lower.includes("edgy")) return "main";
  return "support";
}

function getResultBlocks() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(".resultBlock")).map((block, index) => {
    const title = block.querySelector("h3")?.textContent?.trim() || `Option ${index + 1}`;
    const body = block.querySelector("pre, p")?.textContent?.trim() || "";
    return { block, index, title, body, type: optionType(title) };
  }).filter((item) => item.body && item.type !== "ignore");
}

function blockMatchesPlatform(item, platform) {
  const lower = item.title.toLowerCase();
  if (item.type !== "main") return true;
  if (lower.includes("clean ad") || lower.includes("edgy")) return platform === "facebook" || platform === "instagram";
  if (platform === "facebook") return lower.includes("facebook") || lower.includes("clean ad") || lower.includes("edgy");
  if (platform === "instagram") return lower.includes("instagram") || lower.includes("clean ad") || lower.includes("edgy");
  if (platform === "tiktok") return lower.includes("tiktok");
  if (platform === "youtube_shorts") return lower.includes("youtube") || lower.includes("description");
  return true;
}

function platformLinkLabel(platform) {
  if (platform === "instagram") return "Instagram link";
  if (platform === "tiktok") return "TikTok link";
  if (platform === "youtube_shorts") return "YouTube Shorts link";
  return "Facebook link";
}

function extractLink(platform) {
  const blocks = getResultBlocks();
  const linkBlock = blocks.find((item) => item.type === "link")?.body || "";
  const label = platformLinkLabel(platform);
  const lines = linkBlock.split(/\n+/);
  const index = lines.findIndex((line) => line.toLowerCase().includes(label.toLowerCase()));
  if (index >= 0) {
    const sameLine = lines[index].match(/https?:\/\/\S+/i)?.[0];
    const nextLine = lines[index + 1]?.match(/https?:\/\/\S+/i)?.[0];
    return clean(sameLine || nextLine || "");
  }
  return clean(linkBlock.match(/https?:\/\/\S+/i)?.[0] || "");
}

function getGroups(platform) {
  const blocks = getResultBlocks();
  const main = blocks.filter((item) => item.type === "main" && blockMatchesPlatform(item, platform));
  return {
    main: main.length ? main : blocks.filter((item) => item.type === "main").slice(0, 4),
    hashtags: blocks.filter((item) => item.type === "hashtags"),
    hooks: blocks.filter((item) => item.type === "hook"),
    script: blocks.filter((item) => item.type === "script"),
    link: extractLink(platform),
  };
}

function shortPreview(value) {
  const text = clean(value).replace(/\s+/g, " ");
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

function fieldValue(builder, key) {
  return clean(builder.querySelector(`[data-builder-field="${key}"]`)?.value || "");
}

function buildFinalText(builder) {
  const platform = builder.dataset.platform || "facebook";
  const hook = fieldValue(builder, "hook");
  const main = fieldValue(builder, "main");
  const extra = fieldValue(builder, "extra");
  const hashtags = fieldValue(builder, "hashtags");
  const link = fieldValue(builder, "link");
  const script = fieldValue(builder, "script");
  const linkLine = link ? `Shop: ${link}` : "";

  if (platform === "tiktok" || platform === "youtube_shorts") {
    return [hook, main, extra, hashtags, linkLine, script ? `Script / shot list:\n${script}` : ""].filter(Boolean).join("\n\n");
  }

  if (platform === "instagram") return [hook, main, extra, hashtags, linkLine].filter(Boolean).join("\n\n");
  return [hook, main, extra, linkLine].filter(Boolean).join("\n\n");
}

function updatePreview() {
  const builder = document.querySelector(".postWorkbench");
  const textarea = document.querySelector(".finalPreview textarea");
  if (!builder || !textarea) return;
  textarea.value = buildFinalText(builder);
}

function storeOptions(groups) {
  window.__localJagoffBuilderOptions = {};
  ["main", "hashtags", "hooks", "script"].forEach((key) => {
    groups[key]?.forEach((item, index) => {
      window.__localJagoffBuilderOptions[`${key}-${index}`] = item.body;
    });
  });
}

function renderOptions(title, targetField, key, options) {
  if (!options?.length) return "";
  return `
    <section class="partCard">
      <div class="partHead"><h3>${escapeHtml(title)}</h3><span>${options.length} option${options.length === 1 ? "" : "s"}</span></div>
      <div class="optionList">
        ${options.map((option, index) => `
          <button type="button" class="usePartButton" data-target-field="${targetField}" data-option-id="${key}-${index}">
            <strong>Use Option ${index + 1}</strong>
            <em>${escapeHtml(option.title)}</em>
            <span>${escapeHtml(shortPreview(option.body))}</span>
          </button>
        `).join("")}
      </div>
      <label>Custom ${escapeHtml(title.toLowerCase())}<textarea data-builder-field="${targetField}" placeholder="Write your own ${escapeHtml(title.toLowerCase())}..."></textarea></label>
    </section>
  `;
}

function ensureWorkbench() {
  if (typeof document === "undefined") return;
  const output = document.querySelector(".studioOutput");
  const preview = document.querySelector(".finalPreview");
  const textarea = preview?.querySelector("textarea");
  const results = document.querySelector(".results");
  if (!output || !preview || !textarea || !results) return;

  const platform = getActivePlatform();
  const groups = getGroups(platform);
  if (!groups.main.length && !groups.script.length) return;

  let builder = document.querySelector(".postWorkbench");
  if (!builder) {
    builder = document.createElement("section");
    builder.className = "postWorkbench";
    output.insertBefore(builder, results);
  }

  const signature = JSON.stringify({
    platform,
    main: groups.main.map((item) => item.title + item.body.slice(0, 80)),
    hashtags: groups.hashtags.map((item) => item.title + item.body.slice(0, 80)),
    hooks: groups.hooks.map((item) => item.title + item.body.slice(0, 80)),
    script: groups.script.map((item) => item.title + item.body.slice(0, 80)),
    link: groups.link,
  });

  if (builder.dataset.signature === signature) {
    updatePreview();
    return;
  }

  storeOptions(groups);
  builder.dataset.signature = signature;
  builder.dataset.platform = platform;

  builder.innerHTML = `
    <div class="workbenchHead">
      <div>
        <p class="miniKicker">PICK YOUR PARTS</p>
        <h2>${escapeHtml(PLATFORM_LABELS[platform] || "Post")} Builder</h2>
        <p>Use a generated option or type your own section. The live preview updates from your chosen parts.</p>
      </div>
      <button type="button" class="regenerateInlineButton">Regenerate All</button>
    </div>

    <section class="partCard smallPart">
      <div class="partHead"><h3>Platform link</h3><span>${groups.link ? "ready" : "empty"}</span></div>
      <label>Link<input data-builder-field="link" value="${escapeHtml(groups.link)}" placeholder="Paste or edit platform/product link..." /></label>
    </section>

    ${renderOptions("Main Copy", "main", "main", groups.main)}
    ${renderOptions("Hook / Opening", "hook", "hooks", groups.hooks)}

    <section class="partCard smallPart">
      <div class="partHead"><h3>Extra Line</h3><span>optional</span></div>
      <label>Custom add-on<textarea data-builder-field="extra" placeholder="Add a line, sale note, reminder, or anything else..."></textarea></label>
    </section>

    ${renderOptions("Hashtags", "hashtags", "hashtags", groups.hashtags)}
    ${renderOptions("Script / Shot List", "script", "script", groups.script)}
  `;

  const firstMain = groups.main[0]?.body || "";
  const firstHashtags = groups.hashtags[0]?.body || "";
  const firstHook = "";
  const firstScript = platform === "tiktok" || platform === "youtube_shorts" ? groups.script[0]?.body || "" : "";

  setNativeValue(builder.querySelector('[data-builder-field="main"]'), firstMain);
  setNativeValue(builder.querySelector('[data-builder-field="hashtags"]'), firstHashtags);
  setNativeValue(builder.querySelector('[data-builder-field="hook"]'), firstHook);
  setNativeValue(builder.querySelector('[data-builder-field="script"]'), firstScript);

  builder.querySelectorAll("textarea,input").forEach((field) => field.addEventListener("input", updatePreview));

  const heading = preview.querySelector("h2");
  if (heading) heading.textContent = `${PLATFORM_LABELS[platform] || "Post"} live preview`;
  updatePreview();
}

function installBuilderDelegates() {
  if (typeof document === "undefined" || document.__localJagoffBuilderDelegates) return;
  document.__localJagoffBuilderDelegates = true;

  document.addEventListener("click", (event) => {
    const optionButton = event.target?.closest?.(".usePartButton");
    if (optionButton) {
      event.preventDefault();
      const builder = document.querySelector(".postWorkbench");
      const field = builder?.querySelector(`[data-builder-field="${optionButton.dataset.targetField}"]`);
      const value = window.__localJagoffBuilderOptions?.[optionButton.dataset.optionId] || "";
      if (field) {
        setNativeValue(field, value);
        optionButton.closest(".partCard")?.querySelectorAll(".usePartButton").forEach((button) => button.classList.remove("selected"));
        optionButton.classList.add("selected");
        updatePreview();
      }
      return;
    }

    const regenerateButton = event.target?.closest?.(".regenerateInlineButton");
    if (regenerateButton) {
      event.preventDefault();
      regenerateButton.textContent = "Regenerating...";
      regenerateButton.disabled = true;
      const createButton = Array.from(document.querySelectorAll(".dashboardNav button")).find((button) => clean(button.textContent) === "Create");
      createButton?.click();
      window.setTimeout(() => {
        const generateButton = Array.from(document.querySelectorAll("button")).find((button) => clean(button.textContent).includes("Generate With AI"));
        generateButton?.click();
      }, 140);
      return;
    }

    const button = event.target?.closest?.("button");
    if (button && clean(button.textContent) === "Copy Ready Post") {
      const text = document.querySelector(".finalPreview textarea")?.value || "";
      if (text) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        navigator.clipboard?.writeText(text);
      }
    }
  }, true);
}

function hideRawBlocks() {
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
    .studioOutput{display:grid!important;grid-template-columns:minmax(280px,390px) minmax(0,1fr)!important;gap:16px!important;align-items:start!important;width:100%!important;max-width:100%!important;overflow:hidden!important}
    .finalPreview,.postWorkbench,.results{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
    .finalPreview{position:sticky!important;top:74px!important;align-self:start!important;overflow:hidden!important}
    .finalPreview textarea{width:100%!important;max-width:100%!important;box-sizing:border-box!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;font-size:13px!important;line-height:1.45!important;resize:vertical!important;min-height:390px!important}
    .postWorkbench{display:grid!important;gap:12px!important;align-self:start!important}
    .workbenchHead,.partCard{background:rgba(13,13,13,.92)!important;border:1px solid rgba(255,230,0,.2)!important;border-radius:18px!important;padding:16px!important;box-shadow:0 18px 56px rgba(0,0,0,.32)!important;min-width:0!important;overflow:hidden!important}
    .workbenchHead{display:flex!important;justify-content:space-between!important;gap:14px!important;align-items:center!important}
    .workbenchHead h2,.partHead h3{margin:0!important;color:#ffe600!important;text-transform:uppercase!important;line-height:1.08!important}
    .workbenchHead p{margin:8px 0 0!important;color:#ddd!important;line-height:1.45!important}
    .regenerateInlineButton{border:1px solid #ffe600!important;border-radius:14px!important;background:#ffe600!important;color:#000!important;padding:12px 14px!important;font-weight:900!important;cursor:pointer!important;white-space:nowrap!important}
    .partHead{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:center!important;margin-bottom:12px!important}
    .partHead span{color:#aaa!important;font-size:11px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;white-space:nowrap!important}
    .partCard label{display:grid!important;gap:7px!important;color:#ffe600!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;margin-top:12px!important}
    .partCard textarea,.partCard input{width:100%!important;box-sizing:border-box!important;border:1px solid #333!important;border-radius:14px!important;background:#050505!important;color:#fff!important;padding:12px!important;font-size:13px!important;line-height:1.45!important;min-height:84px!important;resize:vertical!important}
    .partCard input{min-height:44px!important}
    .optionList{display:grid!important;gap:8px!important}
    .usePartButton{display:grid!important;grid-template-columns:auto 1fr!important;gap:4px 10px!important;width:100%!important;text-align:left!important;border:1px solid #333!important;border-radius:14px!important;background:#101010!important;color:#fff!important;padding:12px!important;min-width:0!important;box-sizing:border-box!important;cursor:pointer!important}
    .usePartButton strong{grid-row:1/3!important;color:#000!important;background:#ffe600!important;border-radius:999px!important;padding:7px 9px!important;font-size:11px!important;text-transform:uppercase!important;align-self:start!important;white-space:nowrap!important}
    .usePartButton em{font-style:normal!important;color:#ffe600!important;text-transform:uppercase!important;font-size:12px!important;letter-spacing:1px!important;overflow-wrap:anywhere!important}
    .usePartButton span{color:#ddd!important;font-size:13px!important;line-height:1.4!important;overflow-wrap:anywhere!important;white-space:normal!important}
    .usePartButton:hover,.usePartButton.selected{border-color:#ffe600!important;background:rgba(255,230,0,.12)!important}
    .results{display:none!important}
    .previewNote{display:none!important}
    @media(max-width:1120px){.studioOutput{grid-template-columns:1fr!important}.finalPreview{position:static!important}.postWorkbench{order:2}.workbenchHead{display:grid!important}.regenerateInlineButton{width:100%!important}}
    @media(max-width:980px){.promoSmartRow{grid-template-columns:1fr!important}.presetControls{grid-template-columns:1fr!important}.presetControls button,.presetControls a,.presetControls select{width:100%!important;text-align:center!important}.usePartButton{grid-template-columns:1fr!important}.usePartButton strong{grid-row:auto!important;width:max-content!important}}
  `;
  document.head.appendChild(style);
}

function refreshPromoStudioEnhancements() {
  attachPresetHelper();
  attachProductBankWinnerHelper();
  defaultAwayFromNewDrop();
  hideRawBlocks();
  ensureWorkbench();
}

export default function PromoCommandCenter() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectStyles();
    installBuilderDelegates();
    refreshPromoStudioEnhancements();
    setReady(true);

    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__localJagoffPromoStudioRefresh);
      window.__localJagoffPromoStudioRefresh = window.setTimeout(refreshPromoStudioEnhancements, 90);
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
