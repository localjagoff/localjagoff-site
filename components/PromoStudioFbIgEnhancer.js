import { useEffect } from "react";

function clean(value) {
  return String(value || "").trim();
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

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProductName() {
  return document.querySelector(".resultToolbar h2")?.textContent?.trim()
    || document.querySelector(".selectedProduct h2")?.textContent?.trim()
    || "Local Jagoff gear";
}

function getPlatform() {
  const active = document.querySelector(".platformSwitch button.active")?.textContent?.toLowerCase() || "facebook";
  return active.includes("instagram") ? "instagram" : "facebook";
}

function optionType(title) {
  const lower = title.toLowerCase();
  if (lower.includes("bundle") || lower.includes("warning") || lower.includes("note")) return "ignore";
  if (lower.includes("hashtag")) return "hashtags";
  if (lower.includes("cta") || lower.includes("link")) return "link";
  if (lower.includes("facebook") || lower.includes("instagram") || lower.includes("clean ad") || lower.includes("edgy")) return "main";
  return "support";
}

function getBlocks() {
  return Array.from(document.querySelectorAll(".resultBlock")).map((block, index) => {
    const title = block.querySelector("h3")?.textContent?.trim() || `Option ${index + 1}`;
    const body = block.querySelector("pre, p")?.textContent?.trim() || "";
    return { title, body, type: optionType(title) };
  }).filter((item) => item.body && item.type !== "ignore");
}

function platformMatch(item, platform) {
  if (item.type !== "main") return true;
  const title = item.title.toLowerCase();
  if (title.includes("clean ad") || title.includes("edgy")) return true;
  return platform === "instagram" ? title.includes("instagram") : title.includes("facebook");
}

function stripTags(text) {
  return clean(text).replace(/(?:^|\s)#\S+/g, "").replace(/\s{2,}/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = clean(value).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function five(values, fallbacks) {
  return unique([...values, ...fallbacks]).slice(0, 5);
}

function linkFor(platform) {
  const linkText = getBlocks().find((item) => item.type === "link")?.body || "";
  const label = platform === "instagram" ? "instagram link" : "facebook link";
  const lines = linkText.split(/\n+/);
  const index = lines.findIndex((line) => line.toLowerCase().includes(label));
  if (index >= 0) {
    const same = lines[index].match(/https?:\/\/\S+/i)?.[0];
    const next = lines[index + 1]?.match(/https?:\/\/\S+/i)?.[0];
    if (same || next) return clean(same || next);
  }
  return clean(linkText.match(/https?:\/\/\S+/i)?.[0] || "https://www.localjagoff.com");
}

function partsFor(platform) {
  const product = getProductName();
  const blocks = getBlocks();
  const generatedMain = blocks.filter((item) => item.type === "main" && platformMatch(item, platform)).map((item) => stripTags(item.body));
  const generatedTags = blocks.filter((item) => item.type === "hashtags").map((item) => item.body);
  const link = linkFor(platform);

  return {
    opening: five([], [
      "Fresh Local Jagoff gear, built for people who get the joke.",
      "Western PA energy, cleaned up just enough for public viewing.",
      "For the locals, the loud ones, and the beautifully difficult ones.",
      "A little local pride. A little smart mouth. That is the brand.",
      "Yeah, it says jagoff. That is kind of the point.",
    ]),
    main: five(generatedMain, [
      `${product}. Local gear for anyone who knows a jagoff when they see one.`,
      `${product} brings the Local Jagoff attitude without trying too hard.`,
      "Built for Western PA locals who like their gear with a little mouth on it.",
      "Not tourist gear. Not fake tough. Just Local Jagoff.",
      "If you get it, you get it. If not, ask a jagoff from around here.",
    ]),
    extra: five([], [
      "Wear it like you got somewhere to be and still stopped to talk.",
      "Good for errands, bad decisions, and being seen in public.",
      "Pittsburgh-area attitude without the boring souvenir-shop feel.",
      "Local enough to get the nod. Loud enough to get the look.",
      "Made for the people who know exactly what jagoff means.",
    ]),
    shop: five([], [
      `Grab yours: ${link}`,
      `Shop it here: ${link}`,
      `Get it at localjagoff.com: ${link}`,
      `Check it out when you get a minute: ${link}`,
      `Local gear is waiting: ${link}`,
    ]),
    hashtags: five(generatedTags, [
      "#LocalJagoff #Pittsburgh #Yinzer #WesternPA #412 #724 #PittsburghStyle",
      "#LocalJagoff #PittsburghGear #YinzerStyle #WesternPA #412 #724",
      "#LocalJagoff #Jagoff #Pittsburgh #Yinzer #PAStyle #WesternPA",
      "#LocalJagoff #PittsburghClothing #Yinzers #WesternPA #ShopLocal",
      "#LocalJagoff #BlackAndGold #Pittsburgh #Yinzer #412 #724",
    ]),
  };
}

function field(builder, key) {
  return builder?.querySelector(`[data-builder-field=\"${key}\"]`);
}

function finalText(builder) {
  const platform = builder.dataset.platform || "facebook";
  const values = ["opening", "main", "extra", "shop"].map((key) => clean(field(builder, key)?.value));
  if (platform === "instagram") values.push(clean(field(builder, "hashtags")?.value));
  return values.filter(Boolean).join("\n\n");
}

function updatePreview() {
  const builder = document.querySelector(".postWorkbench");
  const textarea = document.querySelector(".finalPreview textarea");
  if (builder && textarea) textarea.value = finalText(builder);
}

function renderPart(title, key, values) {
  return `<section class="partCard"><div class="partHead"><h3>${esc(title)}</h3><span>5 options</span></div><div class="optionList">${values.map((value, index) => `<button type="button" class="usePartButton ${index === 0 ? "selected" : ""}" data-field="${key}" data-value="${esc(value)}"><strong>Use ${index + 1}</strong><span>${esc(value)}</span></button>`).join("")}</div><label>Custom ${esc(title.toLowerCase())}<textarea data-builder-field="${key}">${esc(values[0] || "")}</textarea></label></section>`;
}

function buildWorkbench() {
  const output = document.querySelector(".studioOutput");
  const preview = document.querySelector(".finalPreview");
  const results = document.querySelector(".results");
  if (!output || !preview || !results) return;

  const platform = getPlatform();
  const parts = partsFor(platform);
  const signature = JSON.stringify({ platform, product: getProductName(), parts });
  let builder = document.querySelector(".postWorkbench");
  if (!builder) {
    builder = document.createElement("section");
    builder.className = "postWorkbench";
    output.insertBefore(builder, results);
  }
  if (builder.dataset.signature === signature) return updatePreview();

  builder.dataset.signature = signature;
  builder.dataset.platform = platform;
  builder.innerHTML = `<div class="workbenchHead"><div><p class="miniKicker">PICK YOUR PARTS</p><h2>${platform === "instagram" ? "Instagram" : "Facebook"} Builder</h2><p>Pick one option per section or type your own. The live preview updates immediately.</p></div><button type="button" class="regenerateInlineButton">Regenerate All</button></div>${renderPart("Opening Statement", "opening", parts.opening)}${renderPart("Main Copy", "main", parts.main)}${renderPart("Extra Line", "extra", parts.extra)}${renderPart("Shop Line", "shop", parts.shop)}${platform === "instagram" ? renderPart("Hashtags", "hashtags", parts.hashtags) : ""}`;
  builder.querySelectorAll("textarea").forEach((input) => input.addEventListener("input", updatePreview));
  const heading = preview.querySelector("h2");
  if (heading) heading.textContent = `${platform === "instagram" ? "Instagram" : "Facebook"} live preview`;
  updatePreview();
}

function cleanControls() {
  document.querySelectorAll("select").forEach((select) => {
    Array.from(select.options).forEach((option) => {
      const text = `${option.value} ${option.textContent}`.toLowerCase();
      if (text.includes("tiktok") || text.includes("youtube") || text.includes("full_pack")) option.remove();
    });
    if (!["facebook", "instagram"].includes(select.value) && Array.from(select.options).some((option) => option.value === "facebook")) setNativeValue(select, "facebook");
  });

  document.querySelectorAll(".platformSwitch button").forEach((button) => {
    const text = button.textContent.toLowerCase();
    if (text.includes("full pack") || text.includes("tiktok") || text.includes("youtube")) button.style.display = "none";
  });

  document.querySelectorAll("button").forEach((button) => {
    const text = button.textContent.toLowerCase().trim();
    if (["copy shown pack", "copy full pack", "save pack", "save to parts"].some((bad) => text.includes(bad))) button.style.display = "none";
  });

  const active = document.querySelector(".platformSwitch button.active");
  if (!active || active.style.display === "none") {
    Array.from(document.querySelectorAll(".platformSwitch button")).find((button) => button.textContent.toLowerCase().includes("facebook"))?.click();
  }
}

function installClicks() {
  if (document.__localJagoffFbIgClicks) return;
  document.__localJagoffFbIgClicks = true;
  document.addEventListener("click", (event) => {
    const use = event.target.closest?.(".usePartButton");
    if (use) {
      event.preventDefault();
      const builder = document.querySelector(".postWorkbench");
      const target = field(builder, use.dataset.field);
      if (target) {
        setNativeValue(target, use.dataset.value || "");
        use.closest(".partCard")?.querySelectorAll(".usePartButton").forEach((button) => button.classList.remove("selected"));
        use.classList.add("selected");
        updatePreview();
      }
      return;
    }

    const regen = event.target.closest?.(".regenerateInlineButton");
    if (regen) {
      event.preventDefault();
      const generate = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Generate With AI"));
      if (generate) {
        regen.textContent = "Regenerating...";
        regen.disabled = true;
        generate.click();
        window.setTimeout(() => Array.from(document.querySelectorAll(".dashboardNav button")).find((button) => button.textContent.trim() === "Output")?.click(), 1200);
      }
      return;
    }

    const button = event.target.closest?.("button");
    if (button && button.textContent.trim() === "Copy Ready Post") {
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

function stylePage() {
  if (document.getElementById("local-jagoff-fbig-style")) return;
  const style = document.createElement("style");
  style.id = "local-jagoff-fbig-style";
  style.textContent = `.platformSwitch{display:flex!important;gap:8px!important;flex-wrap:wrap!important}.platformSwitch button{border:1px solid #333!important;border-radius:999px!important;background:#151515!important;color:#fff!important;padding:10px 14px!important;font-weight:900!important;text-transform:uppercase!important;box-shadow:none!important}.platformSwitch button.active{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.studioOutput{display:grid!important;grid-template-columns:minmax(280px,390px) minmax(0,1fr)!important;gap:16px!important;align-items:start!important;overflow:hidden!important}.finalPreview{position:sticky!important;top:74px!important;align-self:start!important}.finalPreview textarea{min-height:390px!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}.postWorkbench{display:grid!important;gap:12px!important}.workbenchHead,.partCard{background:rgba(13,13,13,.92)!important;border:1px solid rgba(255,230,0,.2)!important;border-radius:18px!important;padding:16px!important;box-shadow:0 18px 56px rgba(0,0,0,.32)!important;overflow:hidden!important}.workbenchHead{display:flex!important;justify-content:space-between!important;gap:14px!important;align-items:center!important}.workbenchHead h2,.partHead h3{margin:0!important;color:#ffe600!important;text-transform:uppercase!important}.workbenchHead p{margin:8px 0 0!important;color:#ddd!important}.regenerateInlineButton{border:1px solid #ffe600!important;border-radius:14px!important;background:#ffe600!important;color:#000!important;padding:12px 14px!important;font-weight:900!important;cursor:pointer!important;white-space:nowrap!important}.partHead{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:center!important;margin-bottom:12px!important}.partHead span{color:#aaa!important;font-size:11px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important}.partCard label{display:grid!important;gap:7px!important;color:#ffe600!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:1px!important;margin-top:12px!important}.partCard textarea{width:100%!important;box-sizing:border-box!important;border:1px solid #333!important;border-radius:14px!important;background:#050505!important;color:#fff!important;padding:12px!important;font-size:13px!important;line-height:1.45!important;min-height:76px!important;resize:vertical!important}.optionList{display:grid!important;gap:8px!important}.usePartButton{display:grid!important;grid-template-columns:auto 1fr!important;gap:4px 10px!important;width:100%!important;text-align:left!important;border:1px solid #333!important;border-radius:14px!important;background:#101010!important;color:#fff!important;padding:12px!important;box-sizing:border-box!important;cursor:pointer!important}.usePartButton strong{grid-row:1/3!important;color:#000!important;background:#ffe600!important;border-radius:999px!important;padding:7px 9px!important;font-size:11px!important;text-transform:uppercase!important;align-self:start!important;white-space:nowrap!important}.usePartButton span{color:#ddd!important;font-size:13px!important;line-height:1.4!important;overflow-wrap:anywhere!important}.usePartButton:hover,.usePartButton.selected{border-color:#ffe600!important;background:rgba(255,230,0,.12)!important}.results{display:none!important}.previewNote,.saveToBankButton{display:none!important}@media(max-width:1120px){.studioOutput{grid-template-columns:1fr!important}.finalPreview{position:static!important}.postWorkbench{order:2}.workbenchHead{display:grid!important}.regenerateInlineButton{width:100%!important}}`;
  document.head.appendChild(style);
}

function refresh() {
  stylePage();
  cleanControls();
  buildWorkbench();
}

export default function PromoStudioFbIgEnhancer() {
  useEffect(() => {
    installClicks();
    refresh();
    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__localJagoffFbIgRefresh);
      window.__localJagoffFbIgRefresh = window.setTimeout(refresh, 90);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
