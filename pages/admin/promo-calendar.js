import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";

const STORAGE_KEY = "localJagoffPromoQueue";
const STATUSES = ["all", "Draft", "Ready", "Posted"];
const PLATFORMS = ["all", "facebook", "instagram", "tiktok", "youtube_shorts"];
const PLATFORM_LABELS = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube_shorts: "YouTube Shorts", full_pack: "Full Pack" };

function readQueue() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeQueue(queue) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function itemPlatform(item) {
  return item.scheduledPlatform || item.displayPlatform || item.platform || "full_pack";
}

function itemBundle(item) {
  const platform = itemPlatform(item);
  if (["facebook", "instagram", "tiktok", "youtube_shorts"].includes(platform)) return formatPlatformBundle(item.promo, platform);
  return [item.promo?.brand_angle, item.promo?.facebook_post, item.promo?.instagram_caption, item.promo?.tiktok_caption, item.promo?.cta].filter(Boolean).join("\n\n---\n\n");
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function labelDate(value) {
  if (!value) return "Unscheduled";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return value; }
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

function buildCsv(items) {
  const headers = ["date", "platform", "status", "product", "brand_angle", "copy_bundle"];
  const rows = items.map((item) => [
    item.scheduledDate || "Unscheduled",
    PLATFORM_LABELS[itemPlatform(item)] || itemPlatform(item),
    item.status || "Draft",
    item.product?.name || "",
    item.promo?.brand_angle || "",
    itemBundle(item),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export default function PromoCalendar() {
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  useEffect(() => setQueue(readQueue()), []);

  const filtered = useMemo(() => queue.filter((item) => {
    const status = item.status || "Draft";
    const platform = itemPlatform(item);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (platformFilter !== "all" && platform !== platformFilter) return false;
    return true;
  }), [queue, statusFilter, platformFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = item.scheduledDate || "unscheduled";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "unscheduled") return 1;
      if (b === "unscheduled") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const updateItem = (queueId, updates) => {
    const next = queue.map((item) => item.queueId === queueId ? { ...item, ...updates } : item);
    setQueue(next);
    writeQueue(next);
  };

  const moveDate = (item, days) => {
    const base = item.scheduledDate || isoToday();
    const date = new Date(`${base}T12:00:00`);
    date.setDate(date.getDate() + days);
    updateItem(item.queueId, { scheduledDate: date.toISOString().slice(0, 10) });
  };

  const exportCsv = () => downloadFile("local-jagoff-promo-calendar.csv", buildCsv(filtered), "text/csv");

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Calendar</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero"><div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Calendar</h1><p>Calendar-style view of queued Local Jagoff promos. Move dates, change status, and copy platform bundles.</p></div></header>
        <section className="filters"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>)}</select><select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>{PLATFORMS.map((p) => <option key={p} value={p}>{p === "all" ? "All Platforms" : PLATFORM_LABELS[p]}</option>)}</select><button type="button" onClick={exportCsv}>Export CSV</button></section>
        <section className="days">{grouped.length === 0 && <div className="empty">No queued promos match this view.</div>}{grouped.map(([date, items]) => <div key={date} className="day"><div className="dayHead"><h2>{labelDate(date === "unscheduled" ? "" : date)}</h2><span>{items.length} promo{items.length === 1 ? "" : "s"}</span></div>{items.map((item) => <article key={item.queueId} className="card"><p className="mini">{PLATFORM_LABELS[itemPlatform(item)] || itemPlatform(item)} • {item.status || "Draft"}</p><h3>{item.product?.name || "Queued Promo"}</h3><p>{item.promo?.brand_angle || item.promo?.facebook_post || "No preview available."}</p><div className="row"><button onClick={() => moveDate(item, -1)}>← Day</button><input type="date" value={item.scheduledDate || ""} onChange={(e) => updateItem(item.queueId, { scheduledDate: e.target.value })} /><button onClick={() => moveDate(item, 1)}>Day →</button></div><div className="row"><select value={item.status || "Draft"} onChange={(e) => updateItem(item.queueId, { status: e.target.value })}>{STATUSES.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}</select><button onClick={() => copyText(itemBundle(item))}>Copy Bundle</button></div></article>)}</div>)}</section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,92px);line-height:.9;text-transform:uppercase}.hero p{color:#ddd;max-width:760px;line-height:1.55}button{border:none;border-radius:14px;padding:12px 14px;background:#ffe600;color:#000;font-weight:900;text-decoration:none;cursor:pointer}.filters{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:14px;margin-bottom:16px}select,input{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}.days{display:grid;gap:14px}.day,.empty{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.dayHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.dayHead h2{color:#ffe600;text-transform:uppercase}.dayHead span{color:#ccc;font-weight:900}.card{border:1px solid #242424;background:#070707;border-radius:18px;padding:14px;margin-top:10px}.card h3{text-transform:uppercase}.card p{color:#ddd;line-height:1.5}.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}.row:last-child{grid-template-columns:1fr 1fr}button{background:#1b1b1b;color:#fff;border:1px solid #333}.filters button,.row button:last-child{background:#ffe600;color:#000}@media(max-width:760px){.hero{display:grid}.filters,.row,.row:last-child{grid-template-columns:1fr}button{width:100%;text-align:center}}`}</style>
    </div>
  );
}
