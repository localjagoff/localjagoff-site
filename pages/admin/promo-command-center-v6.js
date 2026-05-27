import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  makeHolidayPromoPack,
  US_HOLIDAY_PROMOS,
} from "../../lib/holidayPromoTemplates";
import {
  findHolidayPromoPreset,
  HOLIDAY_PROMO_PRESETS,
} from "../../lib/holidayPromoPresets";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";
import {
  formatPromoHashtags,
  makeFreePromoPack,
  normalizePromoProduct,
} from "../../lib/promoTemplates";

const MODES = [
  ["product_drop", "Product Drop"],
  ["holiday", "Holiday"],
  ["funny_pittsburgh", "Funny Pittsburgh"],
  ["clean_ad", "Clean Ad Safe"],
  ["short_video", "Short Video"],
  ["regenerate_no_repeat", "Regenerate / No Repeat"],
];

const PLATFORMS = [
  ["full_pack", "Full Pack"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const TONES = [
  ["clean", "Clean"],
  ["balanced", "Balanced"],
  ["more_jagoff", "More Jagoff"],
  ["savage_but_safe", "Savage but Safe"],
];

const CAMPAIGN_STYLES = [
  ["sale_announcement", "Sale Announcement"],
  ["gift_guide", "Gift Guide"],
  ["weekend_push", "Weekend Push"],
  ["last_chance", "Last Chance"],
];

const QUEUE_STATUSES = ["Draft", "Ready", "Posted"];
const BANK_KEY = "localJagoffProductPromoBank";

const SECTION_LABELS = {
  create: "Create",
  results: "Output",
  saved: "Saved",
  queue: "Queue",
  products: "Products",
  rules: "Rules",
};

const PLATFORM_LABELS = Object.fromEntries(PLATFORMS);
const CAMPAIGN_STYLE_LABELS = Object.fromEntries(CAMPAIGN_STYLES);

function copyText(value) {
  if (!value || typeof navigator === "undefined") return;
  navigator.clipboard.writeText(value);
}

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
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

function niceDate(value) {
  if (!value) return "Not scheduled";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function scriptToText(scenes) {
  return Array.isArray(scenes)
    ? scenes
        .map(
          (s) =>
            `${s.scene}\nVisual: ${s.visual}\nText: ${s.on_screen_text}\nVoiceover: ${s.voiceover}`
        )
        .join("\n\n")
    : "";
}

function fieldText(field) {
  if (!field) return "";
  if (field.type === "hashtags") return formatPromoHashtags(field.value);
  if (field.type === "script") return scriptToText(field.value);
  if (Array.isArray(field.value)) return field.value.join("\n");
  return String(field.value || "");
}

function getBundleFields(pack, selectedPlatform) {
  if (!pack) return [];

  const platforms = selectedPlatform === "full_pack"
    ? ["facebook", "instagram", "tiktok", "youtube_shorts"]
    : [selectedPlatform].filter((value) => value && value !== "full_pack");

  return platforms
    .map((platform) => ({
      title: `${PLATFORM_LABELS[platform] || platform} Bundle`,
      value: formatPlatformBundle(pack, platform),
      pre: true,
    }))
    .filter((field) => field.value);
}

function getDisplayFields(pack, selectedPlatform) {
  if (!pack) return [];

  const shared = [{ title: "Brand Angle", value: pack.brand_angle }];
  const support = [
    { title: "Image Overlay Text", value: pack.image_overlay_text, pre: true },
    { title: "Alt Text", value: pack.alt_text },
    { title: "CTA / Link Helper", value: pack.cta, pre: true },
  ];

  const map = {
    facebook: [
      { title: "Facebook Post", value: pack.facebook_post },
      { title: "Clean Ad Version", value: pack.clean_ad_version },
      { title: "Edgy Version", value: pack.edgy_version },
      ...support,
      ...shared,
    ],
    instagram: [
      { title: "Instagram Caption", value: pack.instagram_caption },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
      ...shared,
    ],
    tiktok: [
      { title: "TikTok Caption", value: pack.tiktok_caption },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
      ...shared,
    ],
    youtube_shorts: [
      { title: "YouTube Shorts Title", value: pack.youtube_shorts_title },
      { title: "YouTube Shorts Description", value: pack.youtube_shorts_description },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
      ...shared,
    ],
    full_pack: [
      { title: "Facebook Post", value: pack.facebook_post },
      { title: "Instagram Caption", value: pack.instagram_caption },
      { title: "TikTok Caption", value: pack.tiktok_caption },
      { title: "YouTube Shorts Title", value: pack.youtube_shorts_title },
      { title: "YouTube Shorts Description", value: pack.youtube_shorts_description },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Image Overlay Text", value: pack.image_overlay_text, pre: true },
      { title: "Alt Text", value: pack.alt_text },
      { title: "Clean Ad Version", value: pack.clean_ad_version },
      { title: "Edgy Version", value: pack.edgy_version },
      { title: "CTA / Link Helper", value: pack.cta, pre: true },
      ...shared,
    ],
  };

  const fields = map[selectedPlatform] || map.full_pack;
  const bundleFields = getBundleFields(pack, selectedPlatform);
  const cleanFields = fields.filter((field) => fieldText(field));
  const fieldsWithBundles = [...cleanFields, ...bundleFields];

  return pack.warnings?.length
    ? [...fieldsWithBundles, { title: "Warnings / Notes", value: pack.warnings, pre: true }]
    : fieldsWithBundles;
}

function formatPackText(pack, selectedPlatform = "full_pack") {
  return getDisplayFields(pack, selectedPlatform)
    .map((field) => `${field.title}:\n${fieldText(field)}`)
    .join("\n\n---\n\n");
}

function getReadyToPasteText(pack, selectedPlatform = "facebook") {
  if (!pack) return "";
  const hashtags = formatPromoHashtags(pack.hashtags);

  if (selectedPlatform === "facebook") {
    return [pack.facebook_post, pack.cta].filter(Boolean).join("\n\n");
  }

  if (selectedPlatform === "instagram") {
    return [pack.instagram_caption, hashtags].filter(Boolean).join("\n\n");
  }

  if (selectedPlatform === "tiktok") {
    return [pack.tiktok_caption, hashtags].filter(Boolean).join("\n\n");
  }

  if (selectedPlatform === "youtube_shorts") {
    return [
      pack.youtube_shorts_title,
      pack.youtube_shorts_description,
      hashtags,
    ].filter(Boolean).join("\n\n");
  }

  return formatPackText(pack, "full_pack");
}

function downloadJson(filename, data) {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildPartsEntry({ product, field, platform }) {
  const text = fieldText(field);
  const title = field.title || "Generated Result";
  const lower = title.toLowerCase();
  let type = "note";
  let entryPlatform = platform === "full_pack" ? "general" : platform;

  if (lower.includes("post") || lower.includes("caption") || lower.includes("description") || lower.includes("bundle")) type = "caption";
  if (lower.includes("hook") || lower.includes("title")) type = "hook";
  if (lower.includes("cta")) type = "cta";
  if (lower.includes("overlay")) type = "overlay";
  if (lower.includes("facebook")) entryPlatform = "facebook";
  if (lower.includes("instagram")) entryPlatform = "instagram";
  if (lower.includes("tiktok")) entryPlatform = "tiktok";
  if (lower.includes("youtube")) entryPlatform = "youtube_shorts";

  return {
    id: `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    productId: String(product?.id || ""),
    productName: product?.name || "Unknown product",
    productImage: product?.thumbnail_url || product?.image || "",
    productCategory: product?.category || "gear",
    type,
    platform: entryPlatform || "general",
    text,
    source: "Promo Studio Result",
    tag: title,
    status: "Approved",
  };
}

function ResultBlock({ field, product, platform, onSaved }) {
  const text = fieldText(field);

  const saveToParts = () => {
    if (!text) return;
    const entry = buildPartsEntry({ product, field, platform });
    writeArray(BANK_KEY, [entry, ...readArray(BANK_KEY)].slice(0, 800));
    onSaved?.(`Saved ${field.title} to Promo Parts.`);
  };

  return (
    <article className="resultBlock">
      <div className="resultTop">
        <h3>{field.title}</h3>
        <div>
          <button type="button" onClick={() => copyText(text)}>Copy</button>
          <button type="button" className="saveToBankButton" onClick={saveToParts}>Save to Parts</button>
        </div>
      </div>
      {field.pre || field.type === "script" ? <pre>{text}</pre> : <p>{text}</p>}
    </article>
  );
}

function PlatformSwitcher({ value, onChange }) {
  return (
    <div className="platformSwitch" aria-label="Displayed platform">
      {PLATFORMS.map(([platformValue, label]) => (
        <button key={platformValue} type="button" className={value === platformValue ? "active" : ""} onClick={() => onChange(platformValue)}>{label}</button>
      ))}
    </div>
  );
}

function SavedPackCard({ item, onLoad, onDelete, onQueue }) {
  const displayPlatform = item.displayPlatform || item.platform || "full_pack";
  return (
    <article className="savedCard">
      <div className="savedTop">
        <div><p className="miniKicker">{item.source || "Saved Pack"}</p><h3>{item.product?.name || "Promo Pack"}</h3></div>
        {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={item.product.name || "Product"} />}
      </div>
      <p className="savedMeta">{PLATFORM_LABELS[displayPlatform] || displayPlatform} • {item.mode || "mode"} • {niceDate(item.createdAt)}</p>
      <p className="savedCaption">{item.promo?.brand_angle || item.promo?.facebook_post || "Saved promo pack"}</p>
      <div className="savedActions"><button type="button" onClick={() => onLoad(item)}>Open Pack</button><button type="button" onClick={() => copyText(formatPackText(item.promo, displayPlatform))}>Copy</button><button type="button" onClick={() => onQueue(item)}>Queue</button><button type="button" className="danger" onClick={() => onDelete(item.id)}>Delete</button></div>
    </article>
  );
}

export default function PromoCommandCenterV6() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [mode, setMode] = useState("product_drop");
  const [platform, setPlatform] = useState("full_pack");
  const [toneIntensity, setToneIntensity] = useState("balanced");
  const [goal, setGoal] = useState("sell_product");
  const [notes, setNotes] = useState("");
  const [holidayPreset, setHolidayPreset] = useState("");
  const [holidayValue, setHolidayValue] = useState("black_friday");
  const [campaignStyle, setCampaignStyle] = useState("sale_announcement");
  const [promoCodeDetails, setPromoCodeDetails] = useState("");
  const [recentPhrases, setRecentPhrases] = useState([]);
  const [promo, setPromo] = useState(null);
  const [promoSource, setPromoSource] = useState("");
  const [displayPlatform, setDisplayPlatform] = useState("full_pack");
  const [savedPacks, setSavedPacks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState("create");
  const [productSearch, setProductSearch] = useState("");
  const [queueDate, setQueueDate] = useState("");
  const [queuePlatform, setQueuePlatform] = useState("instagram");

  useEffect(() => {
    setAdminKey(localStorage.getItem("localJagoffPromoKey") || "");
    setRecentPhrases(safeJson(localStorage.getItem("localJagoffRecentPromoPhrases"), []));
    setSavedPacks(safeJson(localStorage.getItem("localJagoffSavedPromoPacks"), []));
    setQueue(safeJson(localStorage.getItem("localJagoffPromoQueue"), []));
  }, []);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const clean = Array.isArray(data) ? data.map(normalizePromoProduct) : [];
        setProducts(clean);
        setSelectedId(clean[0]?.id ? String(clean[0].id) : "");
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(() => products.find((product) => String(product.id) === String(selectedId)), [products, selectedId]);
  const selectedHoliday = useMemo(() => US_HOLIDAY_PROMOS.find((holiday) => holiday.value === holidayValue), [holidayValue]);
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => [product.name, product.category, product.id].join(" ").toLowerCase().includes(q));
  }, [products, productSearch]);

  const stats = useMemo(() => ({
    productCount: products.length,
    savedCount: savedPacks.length,
    queuedCount: queue.length,
    readyCount: queue.filter((item) => item.status === "Ready").length,
    postedCount: queue.filter((item) => item.status === "Posted").length,
  }), [products, savedPacks, queue]);

  const applyHolidayPreset = (value) => {
    setHolidayPreset(value);
    const preset = findHolidayPromoPreset(value);
    if (!preset) return;
    setMode("holiday");
    setHolidayValue(preset.holidayValue);
    setCampaignStyle(preset.campaignStyle);
    setToneIntensity(preset.toneIntensity);
    setPlatform(preset.platform || "full_pack");
    setPromoCodeDetails(preset.promoCodeDetails || "");
    setNotes(preset.notes || "");
  };

  const saveRecentPhrases = (nextPromo) => {
    const newPhrases = [nextPromo?.brand_angle, nextPromo?.cta, nextPromo?.facebook_post, nextPromo?.instagram_caption, nextPromo?.tiktok_caption, ...(nextPromo?.video_hooks || []), ...(nextPromo?.image_overlay_text || [])].filter(Boolean).map((item) => String(item).slice(0, 180));
    const next = [...newPhrases, ...recentPhrases].slice(0, 60);
    setRecentPhrases(next);
    localStorage.setItem("localJagoffRecentPromoPhrases", JSON.stringify(next));
  };

  const showPack = (pack, source) => {
    setPromo(pack);
    setPromoSource(source);
    setDisplayPlatform(platform);
    saveRecentPhrases(pack);
    setActiveSection("results");
  };

  const buildHolidayNotes = () => {
    const preset = findHolidayPromoPreset(holidayPreset);
    return [notes, selectedHoliday?.label ? `Holiday/Event: ${selectedHoliday.label}` : "", campaignStyle ? `Campaign style: ${CAMPAIGN_STYLE_LABELS[campaignStyle] || campaignStyle}` : "", preset?.label ? `Quick preset: ${preset.label}` : "", promoCodeDetails ? `Real promo/offer details: ${promoCodeDetails}` : "Do not invent a discount or promo code."].filter(Boolean).join("\n");
  };

  const generateAiPromo = async () => {
    setError("");
    setMessage("");
    setPromo(null);
    if (!adminKey.trim()) return setError("Enter the promo generation key first.");
    if (!selectedProduct) return setError("Pick a product first.");
    setLoading(true);
    localStorage.setItem("localJagoffPromoKey", adminKey.trim());

    try {
      const res = await fetch("/api/generate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          product: selectedProduct,
          mode,
          platform,
          goal: mode === "holiday" ? "holiday_promo" : goal,
          toneIntensity,
          notes: mode === "holiday" ? buildHolidayNotes() : notes,
          recentPhrases: recentPhrases.filter(Boolean).slice(0, 40),
          variationSeed: `${Date.now()}-${Math.random()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Promo generation failed.");
      showPack(data.promo, "AI Generated");
    } catch (err) {
      setError(err.message || "Promo generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const generateFreePromo = () => {
    setError("");
    setMessage("");
    if (!selectedProduct) return setError("Pick a product first.");
    const pack = mode === "holiday"
      ? makeHolidayPromoPack(selectedProduct, { holidayValue, platform, toneIntensity, campaignStyle, offerDetails: promoCodeDetails, notes })
      : makeFreePromoPack(selectedProduct, { mode, platform, goal, toneIntensity, notes });
    showPack(pack, mode === "holiday" ? "Holiday Template" : "Free Template");
  };

  const buildCurrentItem = () => promo && selectedProduct ? {
    id: `pack-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: promoSource || "Current Pack",
    createdAt: new Date().toISOString(),
    mode,
    platform,
    displayPlatform,
    toneIntensity,
    goal,
    notes,
    holidayValue: mode === "holiday" ? holidayValue : "",
    holidayPreset: mode === "holiday" ? holidayPreset : "",
    campaignStyle: mode === "holiday" ? campaignStyle : "",
    promoCodeDetails: mode === "holiday" ? promoCodeDetails : "",
    product: selectedProduct,
    promo,
  } : null;

  const saveCurrentPack = () => {
    const item = buildCurrentItem();
    if (!item) return;
    const next = [item, ...savedPacks].slice(0, 80);
    setSavedPacks(next);
    localStorage.setItem("localJagoffSavedPromoPacks", JSON.stringify(next));
    setMessage("Pack saved.");
  };

  const loadSavedPack = (item) => {
    setPromo(item.promo);
    setPromoSource(item.source || "Saved Pack");
    setDisplayPlatform(item.displayPlatform || item.platform || "full_pack");
    setSelectedId(String(item.product?.id || selectedId));
    setMode(item.mode || mode);
    setPlatform(item.displayPlatform || item.platform || platform);
    setToneIntensity(item.toneIntensity || toneIntensity);
    setGoal(item.goal || goal);
    setNotes(item.notes || "");
    setHolidayValue(item.holidayValue || holidayValue);
    setHolidayPreset(item.holidayPreset || "");
    setCampaignStyle(item.campaignStyle || campaignStyle);
    setPromoCodeDetails(item.promoCodeDetails || "");
    setActiveSection("results");
  };

  const deleteSavedPack = (id) => {
    const next = savedPacks.filter((item) => item.id !== id);
    setSavedPacks(next);
    localStorage.setItem("localJagoffSavedPromoPacks", JSON.stringify(next));
  };

  const addToQueue = (item) => {
    const packItem = item || buildCurrentItem();
    if (!packItem) return;
    const nextItem = { ...packItem, queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`, queuedAt: new Date().toISOString(), scheduledDate: queueDate || "", scheduledPlatform: queuePlatform, status: "Draft" };
    const next = [nextItem, ...queue].slice(0, 80);
    setQueue(next);
    localStorage.setItem("localJagoffPromoQueue", JSON.stringify(next));
    setMessage("Added to queue as Draft.");
    setActiveSection("queue");
  };

  const updateQueueStatus = (queueId, status) => {
    const next = queue.map((item) => item.queueId === queueId ? { ...item, status } : item);
    setQueue(next);
    localStorage.setItem("localJagoffPromoQueue", JSON.stringify(next));
  };

  const removeQueueItem = (queueId) => {
    const next = queue.filter((item) => item.queueId !== queueId);
    setQueue(next);
    localStorage.setItem("localJagoffPromoQueue", JSON.stringify(next));
  };

  const exportDashboard = () => downloadJson("local-jagoff-promo-dashboard.json", { exportedAt: new Date().toISOString(), savedPacks, queue });
  const clearMemory = () => { setRecentPhrases([]); localStorage.removeItem("localJagoffRecentPromoPhrases"); setMessage("No-repeat memory cleared."); };

  const displayFields = getDisplayFields(promo, displayPlatform);
  const readyToPasteText = getReadyToPasteText(promo, displayPlatform === "full_pack" ? "facebook" : displayPlatform);

  return (
    <div className="promoPage">
      <Head><title>Local Jagoff Promo Studio</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className="wrap">
        <header className="hero"><div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Studio</h1><p>Create Local Jagoff post copy, image captions, video scripts, tracked links, saved packs, and queue drafts from one cleaner studio screen.</p></div><div className="heroCard"><p>No auto-posting yet.</p><strong>You approve everything before it goes public.</strong></div></header>

        <section className="statsGrid"><div className="statCard"><span>{stats.productCount}</span><p>Products loaded</p></div><div className="statCard"><span>{stats.savedCount}</span><p>Saved packs</p></div><div className="statCard"><span>{stats.queuedCount}</span><p>Queued drafts</p></div><div className="statCard"><span>{stats.readyCount}</span><p>Ready to post</p></div><div className="statCard"><span>{stats.postedCount}</span><p>Posted</p></div></section>
        <nav className="dashboardNav">{Object.entries(SECTION_LABELS).map(([value, label]) => <button key={value} type="button" className={activeSection === value ? "active" : ""} onClick={() => setActiveSection(value)}>{label}</button>)}</nav>
        {message && <section className="message">{message}</section>}

        {activeSection === "create" && <section className="dashboardGrid"><div className="panel controls"><div className="panelHead"><p className="miniKicker">CREATE PACK</p><h2>Generate content</h2></div><div className="field full"><label>Promo generation key</label><input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Enter your private generation key" autoComplete="off" /></div><div className="field full"><label>Product</label><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={productsLoading}>{productsLoading && <option>Loading products...</option>}{!productsLoading && products.length === 0 && <option>No products found</option>}{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div className="field"><label>Mode</label><select value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label>Platform</label><select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label>Tone</label><select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>{TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label>Goal</label><input value={mode === "holiday" ? "holiday_promo" : goal} onChange={(e) => setGoal(e.target.value)} placeholder="sell_product, product_drop, brand_awareness..." disabled={mode === "holiday"} /></div>{mode === "holiday" && <><div className="field"><label>Quick Preset</label><select value={holidayPreset} onChange={(e) => applyHolidayPreset(e.target.value)}><option value="">Manual / Custom Holiday Promo</option>{HOLIDAY_PROMO_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></div><div className="field"><label>Holiday / Sales Event</label><select value={holidayValue} onChange={(e) => { setHolidayValue(e.target.value); setHolidayPreset(""); }}>{US_HOLIDAY_PROMOS.map((holiday) => <option key={holiday.value} value={holiday.value}>{holiday.label}</option>)}</select></div><div className="field"><label>Campaign Style</label><select value={campaignStyle} onChange={(e) => { setCampaignStyle(e.target.value); setHolidayPreset(""); }}>{CAMPAIGN_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label>Promo Code / Offer Details</label><input value={promoCodeDetails} onChange={(e) => setPromoCodeDetails(e.target.value)} placeholder="Example: 15% off with code JAGOFF15" /></div><div className="holidayNotice full"><strong>Holiday mode:</strong> Pick a preset or customize manually. If promo details are blank, no discount is invented.</div></>}<div className="field full"><label>Extra notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "holiday" ? "Example: less salesy, gift angle, last chance, more 724, keep clean..." : "Example: make it more 724, less salesy, mention hoodie season, avoid Steelers references, etc."} /></div><div className="actions full"><button type="button" className="primary" onClick={generateAiPromo} disabled={loading}>{loading ? "Generating..." : "Generate With AI"}</button><button type="button" className="freeBtn" onClick={generateFreePromo}>{mode === "holiday" ? "Generate Free Holiday Pack" : "Generate Free Template Pack"}</button><button type="button" className="ghost" onClick={clearMemory}>Clear No-Repeat Memory</button></div>{error && <div className="error full">{error}</div>}</div><aside className="sidePanel"><div className="selectedProduct">{selectedProduct?.thumbnail_url && <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} />}<div><p className="miniKicker">SELECTED PRODUCT</p><h2>{selectedProduct?.name || "No product selected"}</h2><p>{selectedProduct?.category || "gear"} {selectedProduct?.retail_price && `• $${selectedProduct.retail_price}`}</p></div></div><div className="costCard"><p className="miniKicker">DISPLAY FILTER</p><h3>{PLATFORM_LABELS[platform]}</h3><p>Results start with this platform, but you can switch views after generating.</p>{mode === "holiday" && <><p><strong>Holiday:</strong> {selectedHoliday?.label || "Holiday"}</p><p><strong>Campaign:</strong> {CAMPAIGN_STYLE_LABELS[campaignStyle]}</p>{holidayPreset && <p><strong>Preset:</strong> {findHolidayPromoPreset(holidayPreset)?.label}</p>}</>}</div><div className="queueSetup"><p className="miniKicker">QUEUE DEFAULTS</p><label>Planned date</label><input type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} /><label>Planned platform</label><select value={queuePlatform} onChange={(e) => setQueuePlatform(e.target.value)}>{PLATFORMS.filter(([value]) => value !== "full_pack").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></aside></section>}

        {activeSection === "results" && <section>{!promo && <div className="emptyPanel"><h2>No current promo pack yet.</h2><p>Generate one with AI or free template mode first.</p><button type="button" className="primary" onClick={() => setActiveSection("create")}>Create One</button></div>}{promo && <><div className="resultToolbar"><div><p className="miniKicker">{promoSource || "CURRENT PACK"} • {PLATFORM_LABELS[displayPlatform] || displayPlatform}</p><h2>{selectedProduct?.name || "Promo Pack"}</h2></div><div className="toolbarActions"><button type="button" className="primary" onClick={() => copyText(readyToPasteText)}>Copy Ready Post</button><button type="button" onClick={() => copyText(formatPackText(promo, displayPlatform))}>Copy Shown Pack</button><button type="button" onClick={() => copyText(formatPackText(promo, "full_pack"))}>Copy Full Pack</button><button type="button" onClick={saveCurrentPack}>Save Pack</button><button type="button" onClick={() => addToQueue()}>Add to Queue</button><button type="button" onClick={() => downloadJson("local-jagoff-current-promo.json", promo)}>Export JSON</button></div></div><div className="switchWrap"><p className="miniKicker">VIEW OUTPUT AS</p><PlatformSwitcher value={displayPlatform} onChange={setDisplayPlatform} /></div><section className="studioOutput"><aside className="finalPreview"><p className="miniKicker">READY TO PASTE</p><h2>{displayPlatform === "full_pack" ? "Facebook-ready preview" : `${PLATFORM_LABELS[displayPlatform]} preview`}</h2><textarea readOnly value={readyToPasteText} /><div className="previewActions"><button type="button" className="primary" onClick={() => copyText(readyToPasteText)}>Copy Ready Post</button><button type="button" onClick={() => copyText(formatPackText(promo, "full_pack"))}>Copy Full Pack</button><button type="button" onClick={() => addToQueue()}>Add to Queue</button></div><p className="previewNote">Facebook and Instagram are paste-ready. TikTok and YouTube Shorts keep scripts/hooks in the detailed cards below.</p></aside><div className="results">{displayFields.map((field) => <ResultBlock key={field.title} field={field} product={selectedProduct} platform={displayPlatform} onSaved={setMessage} />)}</div></section></>}</section>}

        {activeSection === "saved" && <section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">CONTENT LIBRARY</p><h2>Saved promo packs</h2></div><button type="button" onClick={exportDashboard}>Export Dashboard</button></div>{savedPacks.length === 0 && <p className="muted">No saved packs yet.</p>}<div className="savedGrid">{savedPacks.map((item) => <SavedPackCard key={item.id} item={item} onLoad={loadSavedPack} onDelete={deleteSavedPack} onQueue={addToQueue} />)}</div></section>}
        {activeSection === "queue" && <section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">CAMPAIGN QUEUE</p><h2>Draft schedule board</h2></div><button type="button" onClick={exportDashboard}>Export Queue</button></div><p className="muted">Planning queue only. It does not publish to Facebook, Instagram, TikTok, or YouTube yet.</p>{queue.length === 0 && <p className="muted">Nothing queued yet.</p>}<div className="queueList">{queue.map((item) => <article key={item.queueId} className="queueItem"><div><p className="miniKicker">{item.scheduledPlatform} • {niceDate(item.scheduledDate)}</p><h3>{item.product?.name || "Queued Promo"}</h3><span className={`statusPill status${item.status || "Draft"}`}>{item.status || "Draft"}</span><p>{item.promo?.brand_angle || item.promo?.facebook_post}</p><div className="statusButtons">{QUEUE_STATUSES.map((status) => <button key={status} type="button" className={(item.status || "Draft") === status ? "active" : ""} onClick={() => updateQueueStatus(item.queueId, status)}>{status}</button>)}</div></div><div className="queueActions"><button type="button" onClick={() => loadSavedPack(item)}>Open Pack</button><button type="button" onClick={() => copyText(formatPackText(item.promo, item.displayPlatform || item.platform || "full_pack"))}>Copy</button><button type="button" className="danger" onClick={() => removeQueueItem(item.queueId)}>Remove</button></div></article>)}</div></section>}
        {activeSection === "products" && <section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">PRODUCT LIBRARY</p><h2>Loaded from your store API</h2></div><input className="searchInput" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." /></div><div className="productGrid">{filteredProducts.map((product) => <button key={product.id} type="button" className={`productTile ${String(product.id) === String(selectedId) ? "selected" : ""}`} onClick={() => { setSelectedId(String(product.id)); setActiveSection("create"); }}><img src={product.thumbnail_url || "/images/placeholder.jpg"} alt={product.name} /><strong>{product.name}</strong><span>{product.category} {product.retail_price && `• $${product.retail_price}`}</span></button>)}</div></section>}
        {activeSection === "rules" && <section className="brandGrid"><div className="panel brandCard"><p className="miniKicker">BRAND BRAIN</p><h2>Hard rules</h2><ul><li>Never mention fulfillment vendors, supplier setup, internal APIs, or production workflow.</li><li>Do not make fake claims about material, shipping speed, discounts, guarantees, or origin.</li><li>Holiday mode must only mention a sale/promo code when you enter real offer details.</li><li>UTM/tracked links are helper links only; use the plain product link anywhere that looks cleaner.</li><li>Keep it Pittsburgh / Western PA, black-and-gold, gritty, funny, and direct.</li><li>Avoid generic ecommerce phrases like “elevate your wardrobe” or “must-have.”</li><li>Generate options that still need your approval before posting.</li></ul></div><div className="panel brandCard"><p className="miniKicker">NEXT PHASE</p><h2>What this does not do yet</h2><ul><li>No Facebook, Instagram, TikTok, or YouTube publishing yet.</li><li>Saved packs live in this browser, not on a database yet.</li><li>No image/video rendering yet; this plans scripts and overlay text.</li><li>No analytics dashboard yet; UTM links are ready for analytics tools.</li></ul></div></section>}
      </main>

      <style jsx>{`.promoPage{min-height:100vh;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),radial-gradient(circle at bottom right,rgba(255,230,0,.08),transparent 26%),linear-gradient(180deg,rgba(0,0,0,.95),rgba(0,0,0,.99));padding:34px 16px 70px}.wrap{max-width:1280px;margin:0 auto}.hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:end;margin-bottom:20px}.kicker,.miniKicker{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.miniKicker{font-size:11px;letter-spacing:1.4px}h1{font-size:clamp(38px,7vw,86px);line-height:.92;text-transform:uppercase}h2,h3{text-transform:uppercase}.hero p:last-child{max-width:780px;color:#d8d8d8;font-size:16px;line-height:1.6}.heroCard,.panel,.resultBlock,.statCard,.savedCard,.queueItem,.selectedProduct,.costCard,.queueSetup,.emptyPanel,.switchWrap,.holidayNotice,.finalPreview,.message{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 22px 80px rgba(0,0,0,.42)}.heroCard,.statCard,.selectedProduct,.costCard,.queueSetup,.emptyPanel,.switchWrap,.holidayNotice,.message{padding:16px}.message{margin-bottom:14px;color:#ffe600;font-weight:900}.heroCard p{margin:0 0 8px;color:#ffe600;font-weight:900}.heroCard strong{display:block;line-height:1.35}.statsGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.statCard span{display:block;color:#ffe600;font-size:28px;font-weight:900}.statCard p{margin:4px 0 0;color:#ccc;font-size:12px;text-transform:uppercase;letter-spacing:1px}.dashboardNav,.platformSwitch{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}.platformSwitch{margin:0}.holidayNotice{color:#ddd;line-height:1.5}.holidayNotice strong{color:#ffe600}button{border:none;border-radius:14px;padding:12px 16px;cursor:pointer;font-weight:900;letter-spacing:.5px}.dashboardNav button,.platformSwitch button,.ghost,.resultTop button,.toolbarActions button,.savedActions button,.queueActions button,.rowHead button,.statusButtons button,.previewActions button{color:#fff;background:#1b1b1b;border:1px solid #333}.dashboardNav button.active,.platformSwitch button.active,.primary,.statusButtons button.active{color:#000!important;background:#ffe600!important;border-color:#ffe600!important;box-shadow:0 12px 28px rgba(255,230,0,.16)}.saveToBankButton{color:#000!important;background:#ffe600!important;border-color:#ffe600!important}.freeBtn{color:#ffe600;background:rgba(255,230,0,.08);border:1px solid rgba(255,230,0,.42)}.danger{color:#ff9a9a!important}button:disabled,input:disabled{opacity:.6;cursor:not-allowed}.dashboardGrid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}.panelHead{grid-column:1/-1}.panelHead h2{font-size:30px}.full{grid-column:1/-1}.field label,.queueSetup label{display:block;margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:13px 14px;outline:none}textarea{min-height:118px;resize:vertical}input:focus,select:focus,textarea:focus{border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.12)}.sidePanel{display:grid;gap:14px;align-content:start}.selectedProduct{display:grid;gap:14px}.selectedProduct img{width:100%;max-height:230px;object-fit:contain;border-radius:16px;background:#070707}.selectedProduct h2{font-size:24px}.selectedProduct p:last-child{color:#bbb;text-transform:uppercase;letter-spacing:1px;font-size:12px;font-weight:800}.costCard p,.queueSetup p,.muted{color:#cfcfcf;line-height:1.55}.queueSetup label{margin-top:12px}.actions,.toolbarActions,.savedActions,.queueActions,.statusButtons,.previewActions,.resultTop div{display:flex;flex-wrap:wrap;gap:10px}.error{color:#fff;background:rgba(170,0,0,.35);border:1px solid rgba(255,90,90,.5);border-radius:14px;padding:12px 14px;font-weight:800}.resultToolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:16px;padding:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px}.studioOutput{display:grid;grid-template-columns:minmax(330px,.82fr) minmax(0,1.18fr);gap:16px;align-items:start}.finalPreview{position:sticky;top:74px;padding:18px}.finalPreview h2{margin:0 0 12px;color:#ffe600}.finalPreview textarea{min-height:360px;line-height:1.55;white-space:pre-wrap}.previewActions{margin-top:12px}.previewNote{color:#aaa;line-height:1.45;font-size:13px}.results{display:grid;grid-template-columns:1fr;gap:16px}.resultBlock{padding:18px}.resultTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.resultTop h3{color:#ffe600;font-size:18px}.resultBlock p,.resultBlock pre{margin:0;color:#f3f3f3;font-size:15px;line-height:1.58;white-space:pre-wrap}.emptyPanel{text-align:center}.libraryPanel{padding:20px}.rowHead{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:16px}.searchInput{max-width:320px}.savedGrid,.productGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.savedCard{padding:16px}.savedTop{display:grid;grid-template-columns:minmax(0,1fr) 72px;gap:10px;align-items:start}.savedTop img{width:72px;height:72px;object-fit:contain;background:#070707;border-radius:12px}.savedCard h3{font-size:18px}.savedMeta{color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px}.savedCaption{color:#ddd;line-height:1.5}.queueList{display:grid;gap:12px}.queueItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:16px;align-items:center}.queueItem h3{font-size:18px}.queueItem p{color:#ddd}.statusPill{display:inline-flex;align-items:center;width:max-content;margin:8px 0;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;border:1px solid rgba(255,255,255,.18)}.statusDraft{color:#ddd;background:#191919}.statusReady{color:#000;background:#ffe600}.statusPosted{color:#9affb7;background:rgba(35,150,75,.2);border-color:rgba(154,255,183,.35)}.productTile{text-align:left;color:#fff;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px;display:grid;gap:10px}.productTile.selected{border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.08)}.productTile img{width:100%;height:160px;object-fit:contain;background:#070707;border-radius:14px}.productTile strong{font-size:15px}.productTile span{color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px}.brandGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.brandCard{padding:22px}.brandCard ul{margin:16px 0 0;padding-left:22px;color:#ddd;line-height:1.7}@media(max-width:980px){.hero,.dashboardGrid,.brandGrid,.studioOutput{grid-template-columns:1fr}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.savedGrid,.productGrid{grid-template-columns:1fr}.queueItem,.resultToolbar,.rowHead{grid-template-columns:1fr;display:grid}.finalPreview{position:static}}@media(max-width:620px){.promoPage{padding-top:22px}.controls{grid-template-columns:1fr}.actions button,.toolbarActions button,.savedActions button,.queueActions button,.platformSwitch button,.statusButtons button,.previewActions button,.resultTop button{width:100%}.statsGrid{grid-template-columns:1fr}.resultTop{display:grid}}`}</style>
    </div>
  );
}
