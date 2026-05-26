import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";
import { makeFreePromoPack, normalizePromoProduct } from "../../lib/promoTemplates";

const QUEUE_KEY = "localJagoffPromoQueue";
const SAVED_KEY = "localJagoffSavedPromoPacks";
const BANK_KEY = "localJagoffProductPromoBank";
const SELECTED_PRESET_KEY = "localJagoffSelectedCampaignPreset";

const PLATFORM_OPTIONS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const MODE_OPTIONS = [
  ["product_drop", "Product Drop"],
  ["sale", "Sale"],
  ["holiday", "Holiday"],
  ["short_video", "Short Video"],
  ["funny_pittsburgh", "Funny Pittsburgh"],
  ["clean_ad", "Clean Ad Safe"],
];

const TONE_OPTIONS = [
  ["balanced", "Balanced"],
  ["more_jagoff", "More Jagoff"],
  ["savage_but_safe", "Savage but Safe"],
  ["clean", "Clean"],
];

const VALID_PLATFORMS = new Set(PLATFORM_OPTIONS.map(([value]) => value));
const VALID_MODES = new Set(MODE_OPTIONS.map(([value]) => value));
const VALID_TONES = new Set(TONE_OPTIONS.map(([value]) => value));

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, amount) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function readArray(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  }
}

function readSelectedPreset() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SELECTED_PRESET_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearSelectedPreset() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SELECTED_PRESET_KEY);
}

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function platformLabel(platform) {
  return PLATFORM_OPTIONS.find(([value]) => value === platform)?.[1] || platform;
}

function modeLabel(value) {
  return MODE_OPTIONS.find(([key]) => key === value)?.[1] || value;
}

function toneLabel(value) {
  return TONE_OPTIONS.find(([key]) => key === value)?.[1] || value;
}

function cleanPresetText(value) {
  return String(value || "").trim();
}

function presetNotes(preset) {
  if (!preset) return "";

  return [
    preset.name ? `Campaign preset: ${preset.name}` : "",
    preset.holiday ? `Holiday: ${preset.holiday}` : "",
    preset.promoCode ? `Promo code: ${preset.promoCode}` : "",
    cleanPresetText(preset.notes),
  ].filter(Boolean).join("\n");
}

function productMatches(product, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.category, product.id].join(" ").toLowerCase().includes(q);
}

function isApprovedBankEntry(entry) {
  return !entry.status || entry.status === "Approved";
}

function bankMatchesProduct(entry, product) {
  return String(entry.productId || "") === String(product.id || "") || String(entry.productName || "") === String(product.name || "");
}

function getApprovedBank(bank) {
  return bank.filter(isApprovedBankEntry);
}

function getBankHints(product, platform, bank) {
  return getApprovedBank(bank)
    .filter((entry) => bankMatchesProduct(entry, product))
    .filter((entry) => entry.platform === platform || entry.platform === "general")
    .slice(0, 5);
}

function formatBankHints(hints) {
  if (!hints.length) return "";
  return [
    "Approved Product Bank lines to consider:",
    ...hints.map((entry) => `- ${entry.type || "note"} / ${entry.platform || "general"}: ${entry.text}`),
  ].join("\n");
}

function campaignItemToQueueItem(item) {
  const sourceParts = ["Weekly Builder"];
  if (item.presetName) sourceParts.push(item.presetName);
  if (item.bankHints?.length) sourceParts.push("Product Bank");

  return {
    id: `pack-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: sourceParts.join(" + "),
    createdAt: new Date().toISOString(),
    queuedAt: new Date().toISOString(),
    mode: item.mode,
    platform: item.platform,
    displayPlatform: item.platform,
    scheduledPlatform: item.platform,
    scheduledDate: item.date,
    status: "Draft",
    toneIntensity: item.toneIntensity,
    goal: "weekly_campaign",
    notes: item.notes,
    product: item.product,
    promo: item.promo,
    bankHints: item.bankHints || [],
    presetName: item.presetName || "",
  };
}

export default function PromoWeekBuilder() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productBank, setProductBank] = useState([]);
  const [useProductBank, setUseProductBank] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState("product_drop");
  const [toneIntensity, setToneIntensity] = useState("balanced");
  const [platforms, setPlatforms] = useState(["facebook", "instagram", "tiktok", "youtube_shorts"]);
  const [notes, setNotes] = useState("weekly campaign, rotate products, keep each post fresh");
  const [activePreset, setActivePreset] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProductBank(readArray(BANK_KEY));

    const preset = readSelectedPreset();
    if (preset) {
      const nextMode = VALID_MODES.has(preset.mode) ? preset.mode : "product_drop";
      const nextTone = VALID_TONES.has(preset.tone) ? preset.tone : "balanced";
      const nextPlatforms = Array.isArray(preset.platforms)
        ? preset.platforms.filter((platform) => VALID_PLATFORMS.has(platform))
        : [];
      const nextNotes = presetNotes(preset);

      setMode(nextMode);
      setToneIntensity(nextTone);
      setPlatforms(nextPlatforms.length ? nextPlatforms : ["facebook", "instagram", "tiktok"]);
      setDays(Math.max(1, Math.min(Number(preset.days) || 7, 31)));
      if (nextNotes) setNotes(nextNotes);
      setActivePreset({
        name: cleanPresetText(preset.name) || "Campaign Preset",
        mode: nextMode,
        tone: nextTone,
        platforms: nextPlatforms.length ? nextPlatforms : ["facebook", "instagram", "tiktok"],
      });
      clearSelectedPreset();
    }

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const clean = Array.isArray(data) ? data.map(normalizePromoProduct) : [];
        setProducts(clean);
        setSelectedIds(clean.slice(0, 7).map((product) => String(product.id)));
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.includes(String(product.id))),
    [products, selectedIds]
  );

  const filteredProducts = useMemo(
    () => products.filter((product) => productMatches(product, search)),
    [products, search]
  );

  const approvedProductBankCount = useMemo(() => getApprovedBank(productBank).length, [productBank]);
  const totalProductBankCount = useMemo(() => productBank.length, [productBank]);

  const toggleProduct = (id) => {
    const key = String(id);
    setSelectedIds((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]
    );
  };

  const togglePlatform = (platform) => {
    setPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]
    );
  };

  const selectVisibleProducts = () => {
    setSelectedIds(filteredProducts.map((product) => String(product.id)));
  };

  const clearProducts = () => setSelectedIds([]);

  const clearPreset = () => {
    setActivePreset(null);
    setMessage("Campaign preset cleared from this builder view. Current settings were kept.");
  };

  const buildPreview = () => {
    setMessage("");
    const latestBank = readArray(BANK_KEY);
    setProductBank(latestBank);

    if (selectedProducts.length === 0) {
      setPreviewItems([]);
      setMessage("Pick at least one product first.");
      return;
    }

    if (platforms.length === 0) {
      setPreviewItems([]);
      setMessage("Pick at least one platform first.");
      return;
    }

    const totalDays = Math.max(1, Math.min(Number(days) || 7, 31));
    const nextItems = Array.from({ length: totalDays }).map((_, index) => {
      const product = selectedProducts[index % selectedProducts.length];
      const platform = platforms[index % platforms.length];
      const date = addDays(startDate, index);
      const bankHints = useProductBank ? getBankHints(product, platform, latestBank) : [];
      const bankHintText = formatBankHints(bankHints);
      const presetLine = activePreset?.name ? `Active campaign preset: ${activePreset.name}.` : "";
      const combinedNotes = [notes, presetLine, bankHintText].filter(Boolean).join("\n");
      const promo = makeFreePromoPack(product, {
        mode,
        platform,
        goal: "weekly_campaign",
        toneIntensity,
        notes: [
          combinedNotes,
          `Weekly campaign day ${index + 1}. Platform: ${platformLabel(platform)}.`,
        ].filter(Boolean).join("\n"),
      });

      return {
        date,
        product,
        platform,
        mode,
        toneIntensity,
        notes: combinedNotes,
        promo,
        bankHints,
        presetName: activePreset?.name || "",
      };
    });

    setPreviewItems(nextItems);
    setMessage(`${nextItems.length} draft promos built${activePreset?.name ? ` from ${activePreset.name}` : ""}${useProductBank ? " with approved Product Bank hints where available" : ""}. Review, then add to queue.`);
  };

  const addPreviewToQueue = () => {
    if (previewItems.length === 0) {
      setMessage("Build a preview first.");
      return;
    }

    const existingQueue = readArray(QUEUE_KEY);
    const newQueueItems = previewItems.map(campaignItemToQueueItem);
    writeArray(QUEUE_KEY, [...newQueueItems, ...existingQueue].slice(0, 200));
    setMessage(`${newQueueItems.length} promos added to the queue.`);
  };

  const addPreviewToSaved = () => {
    if (previewItems.length === 0) {
      setMessage("Build a preview first.");
      return;
    }

    const existingSaved = readArray(SAVED_KEY);
    const newSaved = previewItems.map((item) => ({
      ...campaignItemToQueueItem(item),
      queueId: undefined,
      source: item.presetName ? `Weekly Builder Save + ${item.presetName}` : "Weekly Builder Save",
    }));
    writeArray(SAVED_KEY, [...newSaved, ...existingSaved].slice(0, 200));
    setMessage(`${newSaved.length} promos saved to the library.`);
  };

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Weekly Promo Builder</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Week Builder</h1>
            <p>Build a full run of free promo drafts in one shot, then push them into Queue, Calendar, and Library. Optional Product Bank hints only use approved winners.</p>
          </div>
        </header>

        <section className="layout">
          <div className="panel controls">
            <div className="panelHead"><p className="mini">CAMPAIGN SETTINGS</p><h2>Build the week</h2></div>
            {activePreset && <div className="presetBanner full"><div><p className="mini">ACTIVE PRESET</p><strong>{activePreset.name}</strong><span>{modeLabel(activePreset.mode)} • {toneLabel(activePreset.tone)} • {activePreset.platforms.map(platformLabel).join(", ")}</span></div><button type="button" onClick={clearPreset}>Clear Preset Label</button></div>}
            <label>Start date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <label>Days<input type="number" min="1" max="31" value={days} onChange={(e) => setDays(e.target.value)} /></label>
            <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{MODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Tone<select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>{TONE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="full"><p className="mini">Platform rotation</p><div className="checks">{PLATFORM_OPTIONS.map(([value, label]) => <button key={value} type="button" className={platforms.includes(value) ? "active" : ""} onClick={() => togglePlatform(value)}>{label}</button>)}</div></div>
            <div className="full bankToggle"><button type="button" className={useProductBank ? "active" : ""} onClick={() => setUseProductBank(!useProductBank)}>{useProductBank ? "Using Approved Product Bank" : "Product Bank Off"}</button><span>{approvedProductBankCount} approved / {totalProductBankCount} total bank item{totalProductBankCount === 1 ? "" : "s"}</span><a href="/admin/promo-product-bank">Open Product Bank</a><a href="/admin/promo-campaign-presets">Open Presets</a></div>
            <label className="full">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: more 724, less salesy, hoodie-weather push..." /></label>
            <div className="actions full"><button type="button" className="primary" onClick={buildPreview}>Build Preview</button><button type="button" onClick={addPreviewToQueue}>Add Preview to Queue</button><button type="button" onClick={addPreviewToSaved}>Save Preview to Library</button></div>
            {message && <p className="message full">{message}</p>}
          </div>

          <aside className="panel productsPanel">
            <div className="panelHead"><p className="mini">PRODUCTS</p><h2>{selectedProducts.length} selected</h2></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
            <div className="productActions"><button type="button" onClick={selectVisibleProducts}>Select Visible</button><button type="button" onClick={clearProducts}>Clear</button></div>
            <div className="productList">
              {productsLoading && <p className="muted">Loading products...</p>}
              {!productsLoading && filteredProducts.map((product) => <button key={product.id} type="button" className={selectedIds.includes(String(product.id)) ? "selected" : ""} onClick={() => toggleProduct(product.id)}><span>{product.name}</span><small>{product.category || "gear"}</small></button>)}
            </div>
          </aside>
        </section>

        <section className="preview">
          <div className="previewHead"><div><p className="mini">PREVIEW</p><h2>{previewItems.length} queued draft{previewItems.length === 1 ? "" : "s"}</h2></div><a href="/admin/promo-queue">Open Queue</a></div>
          {previewItems.length === 0 && <div className="empty">No preview built yet.</div>}
          <div className="previewGrid">
            {previewItems.map((item, index) => {
              const bundle = formatPlatformBundle(item.promo, item.platform);
              return <article key={`${item.date}-${item.product.id}-${item.platform}-${index}`} className="previewCard"><p className="mini">{item.date} • {platformLabel(item.platform)}</p><h3>{item.product.name}</h3>{item.presetName && <span className="presetPill">{item.presetName}</span>}<p>{item.promo.brand_angle}</p>{item.bankHints?.length > 0 && <details><summary>Approved Product Bank hints used</summary><ul>{item.bankHints.map((hint) => <li key={hint.id}>{hint.type}: {hint.text}</li>)}</ul></details>}<details><summary>Preview bundle</summary><pre>{bundle}</pre></details><button type="button" onClick={() => copyText(bundle)}>Copy Bundle</button></article>;
            })}
          </div>
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1280px;margin:0 auto;padding-top:34px}.hero{margin-bottom:16px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p{max-width:820px;color:#ddd;line-height:1.55}.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px}.panel,.preview,.empty,.previewCard{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:18px}.panelHead,.full{grid-column:1/-1}.panelHead h2,.previewHead h2{font-size:26px;text-transform:uppercase}.presetBanner{display:flex;justify-content:space-between;gap:12px;align-items:center;background:linear-gradient(135deg,rgba(255,230,0,.16),rgba(5,5,5,.96));border:1px solid rgba(255,230,0,.36);border-radius:18px;padding:14px}.presetBanner strong{display:block;color:#ffe600;font-size:22px;text-transform:uppercase}.presetBanner span{display:block;color:#ddd;font-weight:900;text-transform:uppercase;font-size:12px;letter-spacing:.6px}label{display:block;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:150px}.checks,.actions,.productActions,.bankToggle{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bankToggle{background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.bankToggle span{color:#ccc;font-size:12px;font-weight:900;text-transform:uppercase}.bankToggle a{color:#ffe600;font-weight:900;text-decoration:none}button,.previewHead a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333;text-decoration:none}.primary,.checks button.active,.bankToggle button.active,.previewCard button{background:#ffe600;color:#000;border-color:#ffe600}.message{color:#ffe600;font-weight:900}.productsPanel{padding:18px}.productActions{margin:10px 0}.productList{display:grid;gap:8px;max-height:560px;overflow:auto;padding-right:4px}.productList button{text-align:left;display:grid;gap:4px}.productList button.selected{border-color:#ffe600;background:rgba(255,230,0,.1)}.productList span{font-weight:900}.productList small{color:#aaa;text-transform:uppercase}.muted{color:#ccc}.preview{padding:18px;margin-top:16px}.previewHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.previewGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.previewCard{padding:14px}.previewCard h3{text-transform:uppercase}.previewCard p{color:#ddd;line-height:1.5}.presetPill{display:inline-flex;width:max-content;max-width:100%;border-radius:999px;padding:6px 10px;background:rgba(255,230,0,.12);border:1px solid rgba(255,230,0,.34);color:#ffe600;font-size:11px;font-weight:900;text-transform:uppercase}details{background:#050505;border:1px solid #242424;border-radius:14px;padding:12px;margin:12px 0}summary{cursor:pointer;color:#ffe600;font-weight:900;text-transform:uppercase;font-size:12px}pre{white-space:pre-wrap;color:#f2f2f2}.previewCard ul{color:#ddd;line-height:1.5;padding-left:22px}.empty{padding:18px;text-align:center;color:#ddd}@media(max-width:980px){.layout{grid-template-columns:1fr}.previewGrid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.controls,.previewGrid{grid-template-columns:1fr}.presetBanner{display:grid}.actions button,.checks button,.productActions button,.previewHead a,.previewCard button,.bankToggle button,.bankToggle a,.presetBanner button{width:100%;text-align:center}.previewHead{display:grid}}`}</style>
    </div>
  );
}
