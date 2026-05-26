import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const QUEUE_KEY = "localJagoffPromoQueue";
const SAVED_KEY = "localJagoffSavedPromoPacks";
const PHRASES_KEY = "localJagoffRecentPromoPhrases";
const BANK_KEY = "localJagoffProductPromoBank";
const PERF_KEY = "localJagoffPromoPerformance";
const PRESETS_KEY = "localJagoffCampaignPresets";

const VALID_PLATFORMS = new Set(["facebook", "instagram", "tiktok", "youtube_shorts", "full_pack", "general"]);
const VALID_CAMPAIGN_PLATFORMS = new Set(["facebook", "instagram", "tiktok", "youtube_shorts"]);
const VALID_STATUSES = new Set(["Draft", "Ready", "Posted"]);
const VALID_BANK_TYPES = new Set(["caption", "hook", "cta", "overlay", "note"]);
const VALID_PRESET_MODES = new Set(["product_drop", "sale", "holiday", "short_video", "funny_pittsburgh", "clean_ad"]);
const VALID_PRESET_TONES = new Set(["balanced", "more_jagoff", "savage_but_safe", "clean"]);
const PERF_METRICS = ["views", "likes", "comments", "shares", "clicks", "sales"];

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

function fallbackId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizePlatform(value, fallback = "facebook") {
  return VALID_PLATFORMS.has(value) ? value : fallback;
}

function normalizeCampaignPlatform(value) {
  return VALID_CAMPAIGN_PLATFORMS.has(value) ? value : "facebook";
}

function normalizeStatus(value) {
  return VALID_STATUSES.has(value) ? value : "Draft";
}

function normalizeBankType(value) {
  return VALID_BANK_TYPES.has(value) ? value : "note";
}

function normalizePresetMode(value) {
  return VALID_PRESET_MODES.has(value) ? value : "product_drop";
}

function normalizePresetTone(value) {
  return VALID_PRESET_TONES.has(value) ? value : "balanced";
}

function normalizeQueueItem(item) {
  const platform = normalizePlatform(item.scheduledPlatform || item.displayPlatform || item.platform, "facebook");

  return {
    ...item,
    id: item.id || fallbackId("pack"),
    queueId: item.queueId || fallbackId("queue"),
    source: item.source || "Repaired Item",
    createdAt: item.createdAt || item.queuedAt || new Date().toISOString(),
    queuedAt: item.queuedAt || new Date().toISOString(),
    mode: item.mode || "product_drop",
    platform,
    displayPlatform: platform,
    scheduledPlatform: platform,
    scheduledDate: item.scheduledDate || "",
    status: normalizeStatus(item.status),
    product: item.product || {},
    promo: item.promo || {},
  };
}

function normalizeSavedItem(item) {
  const platform = normalizePlatform(item.displayPlatform || item.platform, "facebook");

  return {
    ...item,
    id: item.id || fallbackId("pack"),
    source: item.source || "Repaired Saved Pack",
    createdAt: item.createdAt || new Date().toISOString(),
    mode: item.mode || "product_drop",
    platform,
    displayPlatform: platform,
    product: item.product || {},
    promo: item.promo || {},
  };
}

function normalizeBankItem(item) {
  return {
    ...item,
    id: item.id || fallbackId("bank"),
    createdAt: item.createdAt || new Date().toISOString(),
    productId: String(item.productId || ""),
    productName: item.productName || item.product?.name || "Unknown product",
    productImage: item.productImage || item.product?.thumbnail_url || item.product?.image || "",
    productCategory: item.productCategory || item.product?.category || "gear",
    type: normalizeBankType(item.type),
    platform: normalizePlatform(item.platform, "general"),
    text: cleanText(item.text),
    source: item.source || "Repaired Bank Item",
    tag: cleanText(item.tag),
    status: item.status || "Approved",
  };
}

function normalizePerformanceItem(item) {
  return {
    ...item,
    id: item.id || fallbackId("perf"),
    queueId: String(item.queueId || ""),
    createdAt: item.createdAt || new Date().toISOString(),
    postedDate: item.postedDate || item.scheduledDate || new Date().toISOString().slice(0, 10),
    platform: normalizePlatform(item.platform, "facebook"),
    productId: String(item.productId || item.product?.id || ""),
    productName: item.productName || item.product?.name || "Unknown product",
    productImage: item.productImage || item.product?.thumbnail_url || item.product?.image || "",
    source: item.source || "Repaired Performance Item",
    copy: cleanText(item.copy),
    postUrl: cleanText(item.postUrl),
    views: cleanNumber(item.views),
    likes: cleanNumber(item.likes),
    comments: cleanNumber(item.comments),
    shares: cleanNumber(item.shares),
    clicks: cleanNumber(item.clicks),
    sales: cleanNumber(item.sales),
    notes: cleanText(item.notes),
    winner: Boolean(item.winner),
  };
}

function normalizeCampaignPreset(item) {
  const rawPlatforms = Array.isArray(item.platforms) ? item.platforms : [];
  const platforms = rawPlatforms.map(normalizeCampaignPlatform).filter(Boolean);

  return {
    ...item,
    id: item.id || fallbackId("preset"),
    name: cleanText(item.name) || "Untitled Preset",
    description: cleanText(item.description),
    mode: normalizePresetMode(item.mode),
    tone: normalizePresetTone(item.tone),
    platforms: platforms.length ? Array.from(new Set(platforms)) : ["facebook", "instagram"],
    days: Math.max(1, Math.min(Number(item.days) || 7, 31)),
    notes: cleanText(item.notes),
    promoCode: cleanText(item.promoCode),
    holiday: cleanText(item.holiday),
    system: Boolean(item.system),
  };
}

function dedupeById(items, keyName) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.[keyName];
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeBank(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.productId, item.productName, item.type, item.platform, item.text].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePerformance(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.queueId || item.id, item.productName, item.platform, item.postedDate, item.copy].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeCampaignPresets(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.id || item.name, item.name, item.mode, item.tone, item.notes].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countDuplicateIds(items, keyName) {
  const seen = new Set();
  let duplicates = 0;

  items.forEach((item) => {
    const key = item?.[keyName];
    if (!key) return;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  });

  return duplicates;
}

function queueIssues(queue) {
  const issues = [];
  const duplicateQueueIds = countDuplicateIds(queue, "queueId");

  if (duplicateQueueIds > 0) issues.push(`${duplicateQueueIds} duplicate queue item(s).`);

  queue.forEach((item, index) => {
    const label = item.product?.name || `Queue item ${index + 1}`;
    if (!item.queueId) issues.push(`${label}: missing queueId.`);
    if (!item.id) issues.push(`${label}: missing pack id.`);
    if (!VALID_STATUSES.has(item.status || "Draft")) issues.push(`${label}: invalid status.`);
    if (!VALID_PLATFORMS.has(item.scheduledPlatform || item.displayPlatform || item.platform || "")) issues.push(`${label}: missing/invalid platform.`);
    if (!item.product?.name) issues.push(`${label}: missing product name.`);
    if (!item.promo) issues.push(`${label}: missing promo data.`);
  });

  return issues;
}

function savedIssues(saved) {
  const issues = [];
  const duplicateIds = countDuplicateIds(saved, "id");

  if (duplicateIds > 0) issues.push(`${duplicateIds} duplicate saved pack(s).`);

  saved.forEach((item, index) => {
    const label = item.product?.name || `Saved pack ${index + 1}`;
    if (!item.id) issues.push(`${label}: missing id.`);
    if (!VALID_PLATFORMS.has(item.displayPlatform || item.platform || "")) issues.push(`${label}: missing/invalid platform.`);
    if (!item.product?.name) issues.push(`${label}: missing product name.`);
    if (!item.promo) issues.push(`${label}: missing promo data.`);
  });

  return issues;
}

function bankIssues(bank) {
  const issues = [];
  const duplicateIds = countDuplicateIds(bank, "id");
  const contentKeys = new Set();
  let duplicateContent = 0;

  if (duplicateIds > 0) issues.push(`${duplicateIds} duplicate Product Bank id(s).`);

  bank.forEach((item, index) => {
    const label = item.productName || `Product Bank item ${index + 1}`;
    const contentKey = [item.productId, item.productName, item.type, item.platform, item.text].join("|").toLowerCase();

    if (contentKeys.has(contentKey)) duplicateContent += 1;
    contentKeys.add(contentKey);

    if (!item.id) issues.push(`${label}: missing id.`);
    if (!item.productName) issues.push(`${label}: missing product name.`);
    if (!VALID_BANK_TYPES.has(item.type || "")) issues.push(`${label}: missing/invalid type.`);
    if (!VALID_PLATFORMS.has(item.platform || "")) issues.push(`${label}: missing/invalid platform.`);
    if (!cleanText(item.text)) issues.push(`${label}: missing saved text.`);
  });

  if (duplicateContent > 0) issues.push(`${duplicateContent} duplicate Product Bank text item(s).`);

  return issues;
}

function performanceIssues(performance) {
  const issues = [];
  const duplicateIds = countDuplicateIds(performance, "id");
  const duplicateQueueIds = countDuplicateIds(performance, "queueId");

  if (duplicateIds > 0) issues.push(`${duplicateIds} duplicate Performance id(s).`);
  if (duplicateQueueIds > 0) issues.push(`${duplicateQueueIds} duplicate Performance queue reference(s).`);

  performance.forEach((item, index) => {
    const label = item.productName || `Performance item ${index + 1}`;
    if (!item.id) issues.push(`${label}: missing id.`);
    if (!item.postedDate) issues.push(`${label}: missing posted date.`);
    if (!VALID_PLATFORMS.has(item.platform || "")) issues.push(`${label}: missing/invalid platform.`);
    if (!item.productName) issues.push(`${label}: missing product name.`);
    if (!cleanText(item.copy)) issues.push(`${label}: missing post copy.`);

    PERF_METRICS.forEach((metric) => {
      const value = Number(item[metric]);
      if (!Number.isFinite(value) || value < 0) issues.push(`${label}: invalid ${metric}.`);
    });
  });

  return issues;
}

function campaignPresetIssues(presets) {
  const issues = [];
  const duplicateIds = countDuplicateIds(presets, "id");
  const nameKeys = new Set();
  let duplicateNames = 0;

  if (duplicateIds > 0) issues.push(`${duplicateIds} duplicate Campaign Preset id(s).`);

  presets.forEach((item, index) => {
    const label = item.name || `Campaign Preset ${index + 1}`;
    const nameKey = cleanText(item.name).toLowerCase();
    if (nameKey && nameKeys.has(nameKey)) duplicateNames += 1;
    if (nameKey) nameKeys.add(nameKey);

    if (!item.id) issues.push(`${label}: missing id.`);
    if (!cleanText(item.name)) issues.push(`${label}: missing name.`);
    if (!VALID_PRESET_MODES.has(item.mode || "")) issues.push(`${label}: missing/invalid mode.`);
    if (!VALID_PRESET_TONES.has(item.tone || "")) issues.push(`${label}: missing/invalid tone.`);
    if (!Array.isArray(item.platforms) || item.platforms.length === 0) issues.push(`${label}: missing platforms.`);
    if (Array.isArray(item.platforms) && item.platforms.some((platform) => !VALID_CAMPAIGN_PLATFORMS.has(platform))) issues.push(`${label}: invalid platform value.`);
    if (!Number.isFinite(Number(item.days)) || Number(item.days) < 1 || Number(item.days) > 31) issues.push(`${label}: invalid day count.`);
    if (!cleanText(item.notes)) issues.push(`${label}: missing strategy notes.`);
  });

  if (duplicateNames > 0) issues.push(`${duplicateNames} duplicate Campaign Preset name(s).`);

  return issues;
}

export default function PromoHealth() {
  const [queue, setQueue] = useState([]);
  const [saved, setSaved] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [campaignPresets, setCampaignPresets] = useState([]);
  const [message, setMessage] = useState("");

  const refresh = () => {
    setQueue(readArray(QUEUE_KEY));
    setSaved(readArray(SAVED_KEY));
    setPhrases(readArray(PHRASES_KEY));
    setProductBank(readArray(BANK_KEY));
    setPerformance(readArray(PERF_KEY));
    setCampaignPresets(readArray(PRESETS_KEY));
  };

  useEffect(() => refresh(), []);

  const queueProblems = useMemo(() => queueIssues(queue), [queue]);
  const savedProblems = useMemo(() => savedIssues(saved), [saved]);
  const bankProblems = useMemo(() => bankIssues(productBank), [productBank]);
  const performanceProblems = useMemo(() => performanceIssues(performance), [performance]);
  const presetProblems = useMemo(() => campaignPresetIssues(campaignPresets), [campaignPresets]);
  const totalProblems = queueProblems.length + savedProblems.length + bankProblems.length + performanceProblems.length + presetProblems.length;

  const stats = useMemo(() => ({
    queued: queue.length,
    saved: saved.length,
    productBank: productBank.length,
    performance: performance.length,
    presets: campaignPresets.length,
    winners: performance.filter((item) => item.winner).length,
    phrases: phrases.length,
    draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
    ready: queue.filter((item) => item.status === "Ready").length,
    posted: queue.filter((item) => item.status === "Posted").length,
  }), [queue, saved, phrases, productBank, performance, campaignPresets]);

  const repairQueue = () => {
    const repaired = dedupeById(queue.map(normalizeQueueItem), "queueId");
    writeArray(QUEUE_KEY, repaired);
    refresh();
    setMessage("Queue repaired and saved in this browser.");
  };

  const repairSaved = () => {
    const repaired = dedupeById(saved.map(normalizeSavedItem), "id");
    writeArray(SAVED_KEY, repaired);
    refresh();
    setMessage("Saved library repaired and saved in this browser.");
  };

  const repairProductBank = () => {
    const repaired = dedupeBank(dedupeById(productBank.map(normalizeBankItem), "id")).filter((item) => item.text);
    writeArray(BANK_KEY, repaired);
    refresh();
    setMessage("Product Bank repaired and saved in this browser.");
  };

  const repairPerformance = () => {
    const repaired = dedupePerformance(dedupeById(performance.map(normalizePerformanceItem), "id"));
    writeArray(PERF_KEY, repaired);
    refresh();
    setMessage("Performance data repaired and saved in this browser.");
  };

  const repairCampaignPresets = () => {
    const repaired = dedupeCampaignPresets(dedupeById(campaignPresets.map(normalizeCampaignPreset), "id")).filter((item) => item.name && item.notes);
    writeArray(PRESETS_KEY, repaired);
    refresh();
    setMessage("Campaign Presets repaired and saved in this browser.");
  };

  const trimMemory = () => {
    const repaired = phrases.filter(Boolean).map((item) => String(item).slice(0, 180)).slice(0, 60);
    writeArray(PHRASES_KEY, repaired);
    refresh();
    setMessage("No-repeat memory cleaned and trimmed.");
  };

  const exportReport = () => downloadJson("local-jagoff-promo-health-report.json", {
    exportedAt: new Date().toISOString(),
    stats,
    queueProblems,
    savedProblems,
    bankProblems,
    performanceProblems,
    presetProblems,
    queue,
    saved,
    productBank,
    performance,
    campaignPresets,
    phrases,
  });

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Promo Health</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Promo Health</h1>
          <p>Check the browser-stored promo queue, saved library, Product Bank, Performance, Campaign Presets, and no-repeat memory. Repair old or malformed promo data before it causes weird copy/export behavior.</p>
        </header>

        <section className="stats">
          <div><strong>{stats.queued}</strong><span>Queued</span></div>
          <div><strong>{stats.saved}</strong><span>Saved</span></div>
          <div><strong>{stats.productBank}</strong><span>Product Bank</span></div>
          <div><strong>{stats.performance}</strong><span>Performance</span></div>
          <div><strong>{stats.presets}</strong><span>Presets</span></div>
          <div><strong>{stats.winners}</strong><span>Winners</span></div>
          <div><strong>{stats.phrases}</strong><span>Memory</span></div>
          <div><strong>{stats.draft}</strong><span>Draft</span></div>
          <div><strong>{stats.ready}</strong><span>Ready</span></div>
          <div><strong>{stats.posted}</strong><span>Posted</span></div>
        </section>

        <section className={`statusPanel ${totalProblems === 0 ? "good" : "warn"}`}>
          <h2>{totalProblems === 0 ? "System looks clean" : `${totalProblems} issue${totalProblems === 1 ? "" : "s"} found`}</h2>
          <p>{totalProblems === 0 ? "Queue, saved library, Product Bank, Performance, Campaign Presets, and memory data look usable." : "Use the repair buttons below to clean up old browser-stored promo data."}</p>
        </section>

        <section className="grid">
          <article className="panel">
            <h2>Queue Check</h2>
            {queueProblems.length === 0 ? <p className="muted">No queue issues found.</p> : <ul>{queueProblems.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            <button type="button" onClick={repairQueue}>Repair Queue</button>
          </article>

          <article className="panel">
            <h2>Saved Library Check</h2>
            {savedProblems.length === 0 ? <p className="muted">No saved library issues found.</p> : <ul>{savedProblems.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            <button type="button" onClick={repairSaved}>Repair Saved Library</button>
          </article>

          <article className="panel">
            <h2>Product Bank Check</h2>
            {bankProblems.length === 0 ? <p className="muted">No Product Bank issues found.</p> : <ul>{bankProblems.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            <button type="button" onClick={repairProductBank}>Repair Product Bank</button>
          </article>

          <article className="panel">
            <h2>Performance Check</h2>
            {performanceProblems.length === 0 ? <p className="muted">No Performance issues found.</p> : <ul>{performanceProblems.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            <button type="button" onClick={repairPerformance}>Repair Performance</button>
          </article>

          <article className="panel">
            <h2>Campaign Presets Check</h2>
            {presetProblems.length === 0 ? <p className="muted">No Campaign Presets issues found.</p> : <ul>{presetProblems.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            <button type="button" onClick={repairCampaignPresets}>Repair Campaign Presets</button>
          </article>

          <article className="panel">
            <h2>No-Repeat Memory</h2>
            <p className="muted">Keeps recent phrases so the generator can avoid repeating itself. This can be cleaned safely.</p>
            <button type="button" onClick={trimMemory}>Clean Memory</button>
          </article>

          <article className="panel">
            <h2>Health Report</h2>
            <p className="muted">Exports a JSON report with current counts, issues, queue, saved library, Product Bank, Performance, Campaign Presets, and memory.</p>
            <button type="button" onClick={exportReport}>Export Health Report</button>
          </article>
        </section>

        {message && <section className="message">{message}</section>}
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:26px;margin-bottom:16px;box-shadow:0 22px 80px rgba(0,0,0,.4)}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p,.muted,.statusPanel p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div,.statusPanel,.panel,.message{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.statusPanel{margin-bottom:14px}.statusPanel h2,.panel h2{text-transform:uppercase;color:#ffe600}.statusPanel.good{border-color:rgba(80,255,140,.35)}.statusPanel.warn{border-color:rgba(255,230,0,.4)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.panel ul{color:#eee;line-height:1.6;padding-left:22px;max-height:310px;overflow:auto}.panel li{margin-bottom:6px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#ffe600;color:#000}.message{margin-top:14px;color:#ffe600;font-weight:900}@media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:850px){.stats,.grid{grid-template-columns:1fr}button{width:100%}}`}</style>
    </div>
  );
}
