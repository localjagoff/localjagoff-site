import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";

const QUEUE_KEY = "localJagoffPromoQueue";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  full_pack: "Full Pack",
};

const STATUS_OPTIONS = ["Draft", "Ready", "Posted"];
const VIEW_OPTIONS = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["ready", "Ready"],
  ["draft", "Draft"],
  ["posted", "Posted"],
  ["all", "All"],
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readQueue() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (typeof window !== "undefined") window.localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
}

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, type = "text/plain") {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function niceDate(value) {
  if (!value) return "No date";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function queuePlatform(item) {
  return item.scheduledPlatform || item.displayPlatform || item.platform || "facebook";
}

function productUrl(item) {
  return item.product?.id ? `/product/${item.product.id}` : "/";
}

function bundleText(item) {
  const platform = queuePlatform(item);
  const platformBundle = formatPlatformBundle(item.promo, platform);
  if (platformBundle) return platformBundle;

  return [
    item.promo?.facebook_post,
    item.promo?.instagram_caption,
    item.promo?.tiktok_caption,
    item.promo?.youtube_shorts_title,
    item.promo?.youtube_shorts_description,
    item.promo?.cta,
  ].filter(Boolean).join("\n\n");
}

function buildCsv(items) {
  const headers = ["date", "platform", "status", "product", "source", "copy"];
  const rows = items.map((item) => [
    item.scheduledDate || "",
    PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item),
    item.status || "Draft",
    item.product?.name || "",
    item.source || "",
    bundleText(item),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function matchView(item, view) {
  const status = item.status || "Draft";
  const date = item.scheduledDate || "";
  const today = todayIso();

  if (view === "today") return date === today;
  if (view === "upcoming") return date >= today && status !== "Posted";
  if (view === "ready") return status === "Ready";
  if (view === "draft") return status === "Draft";
  if (view === "posted") return status === "Posted";
  return true;
}

export default function PromoPostingBoard() {
  const [queue, setQueue] = useState([]);
  const [view, setView] = useState("today");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => setQueue(readQueue()), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue
      .filter((item) => matchView(item, view))
      .filter((item) => platformFilter === "all" || queuePlatform(item) === platformFilter)
      .filter((item) => {
        if (!q) return true;
        return [
          item.product?.name,
          item.source,
          item.mode,
          item.status,
          queuePlatform(item),
          item.promo?.brand_angle,
          item.promo?.facebook_post,
          item.promo?.instagram_caption,
          item.promo?.tiktok_caption,
        ].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.scheduledDate || "9999").localeCompare(String(b.scheduledDate || "9999")));
  }, [queue, view, platformFilter, search]);

  const stats = useMemo(() => ({
    today: queue.filter((item) => item.scheduledDate === todayIso()).length,
    ready: queue.filter((item) => item.status === "Ready").length,
    draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
    posted: queue.filter((item) => item.status === "Posted").length,
  }), [queue]);

  const saveQueue = (next) => {
    setQueue(next);
    writeQueue(next);
  };

  const updateStatus = (queueId, status) => {
    saveQueue(queue.map((item) => item.queueId === queueId ? { ...item, status } : item));
    setMessage(`Marked ${status}.`);
  };

  const copyBundle = (item) => {
    copyText(bundleText(item));
    setMessage("Copied posting bundle.");
  };

  const exportCsv = () => downloadFile("local-jagoff-posting-board.csv", buildCsv(filtered), "text/csv");

  const exportText = () => {
    const text = filtered.map((item) => [
      `${niceDate(item.scheduledDate)} • ${PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item)} • ${item.status || "Draft"}`,
      item.product?.name || "Queued Promo",
      bundleText(item),
    ].join("\n")).join("\n\n====================\n\n");
    downloadFile("local-jagoff-posting-board.txt", text || "No posting items.");
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Posting Board</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Posting Board</h1>
          <p>Use this screen when you are actually posting or scheduling manually. Copy clean platform bundles, open the product page, and mark drafts as Ready or Posted.</p>
        </header>

        <section className="stats">
          <button type="button" onClick={() => setView("today")}><strong>{stats.today}</strong><span>Today</span></button>
          <button type="button" onClick={() => setView("ready")}><strong>{stats.ready}</strong><span>Ready</span></button>
          <button type="button" onClick={() => setView("draft")}><strong>{stats.draft}</strong><span>Draft</span></button>
          <button type="button" onClick={() => setView("posted")}><strong>{stats.posted}</strong><span>Posted</span></button>
        </section>

        <section className="toolbar">
          <select value={view} onChange={(e) => setView(e.target.value)}>{VIEW_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="all">All Platforms</option>{Object.entries(PLATFORM_LABELS).filter(([value]) => value !== "full_pack").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posting board..." />
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={exportText}>Export TXT</button>
        </section>

        {message && <section className="message">{message}</section>}
        {filtered.length === 0 && <section className="empty">No posting items match this view.</section>}

        <section className="board">
          {filtered.map((item) => {
            const platform = queuePlatform(item);
            const text = bundleText(item);
            return <article key={item.queueId || item.id} className="card">
              <div className="top">
                <div>
                  <p className="mini">{niceDate(item.scheduledDate)} • {PLATFORM_LABELS[platform] || platform}</p>
                  <h2>{item.product?.name || "Queued Promo"}</h2>
                  <span className={`pill pill${(item.status || "Draft").replace(/\s+/g, "")}`}>{item.status || "Draft"}</span>
                </div>
                {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={item.product?.name || "Product"} />}
              </div>
              <pre>{text}</pre>
              <div className="actions">
                <button type="button" className="primary" onClick={() => copyBundle(item)}>Copy Post</button>
                <a href={productUrl(item)} target="_blank" rel="noreferrer">Open Product</a>
                {STATUS_OPTIONS.map((status) => <button key={status} type="button" className={(item.status || "Draft") === status ? "active" : ""} onClick={() => updateStatus(item.queueId, status)}>{status}</button>)}
              </div>
            </article>;
          })}
        </section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero,.stats button,.toolbar,.message,.empty,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:22px;margin-bottom:14px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats button{text-align:left;color:#fff;padding:16px;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:32px}.stats span{color:#ccc;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:1px}.toolbar{display:grid;grid-template-columns:1fr 1fr 2fr auto auto;gap:10px;padding:14px;margin-bottom:14px}input,select{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}button,.actions a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333;text-decoration:none}.primary,.active{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.message,.empty{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{padding:16px}.top{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:12px}.top h2{text-transform:uppercase}.top img{width:88px;height:88px;object-fit:contain;background:#070707;border-radius:14px}.pill{display:inline-flex;width:max-content;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;text-transform:uppercase;background:#191919;color:#ddd;border:1px solid #333}.pillReady{background:#ffe600;color:#000;border-color:#ffe600}.pillPosted{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px;max-height:330px;overflow:auto}.actions{display:flex;flex-wrap:wrap;gap:8px}@media(max-width:900px){.stats,.toolbar,.board{grid-template-columns:1fr}.actions button,.actions a,.toolbar button{width:100%;text-align:center}.top{grid-template-columns:1fr}.top img{width:100%;height:150px}}`}</style>
    </div>
  );
}
