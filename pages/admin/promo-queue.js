import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";

const STORAGE_KEY = "localJagoffPromoQueue";
const PLATFORMS = [["all", "All Platforms"], ["facebook", "Facebook"], ["instagram", "Instagram"]];
const STATUSES = ["all", "Draft", "Needs Review", "Approved", "Ready", "Posted", "Rejected"];
const PLATFORM_LABELS = { facebook: "Facebook", instagram: "Instagram" };

function todayIso() { return new Date().toISOString().slice(0, 10); }
function readQueue() { if (typeof window === "undefined") return []; try { const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function writeQueue(queue) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(queue) ? queue : [])); }
function copyText(value) { if (!value || typeof navigator === "undefined") return false; navigator.clipboard.writeText(value); return true; }
function niceDate(value) { if (!value) return "Not scheduled"; try { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return value; } }
function csvEscape(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
function safeFilename(value) { return String(value || "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo"; }
function queuePlatform(item) { return item?.scheduledPlatform === "instagram" || item?.displayPlatform === "instagram" || item?.platform === "instagram" ? "instagram" : "facebook"; }
function queueProductName(item) { return item?.product?.name || item?.productName || "Queued Promo"; }
function queueStatus(item) { return item?.status || "Draft"; }
function queueBundle(item) { if (item?.promo?.builder_final) return item.promo.builder_final; return formatPlatformBundle(item?.promo, queuePlatform(item)) || [item?.promo?.facebook_post, item?.promo?.instagram_caption, item?.promo?.cta].filter(Boolean).join("\n\n---\n\n"); }
function downloadFile(filename, content, type = "text/plain") { if (typeof document === "undefined") return; const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function buildCsv(queue) { const headers = ["scheduled_date", "platform", "status", "product", "source", "mode", "created_at", "copy_bundle"]; const rows = queue.map((item) => [item.scheduledDate || "", PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item), queueStatus(item), queueProductName(item), item.source || "", item.mode || "", item.createdAt || item.queuedAt || "", queueBundle(item)]); return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n"); }
function buildTextPlan(items, title = "Local Jagoff Promo Queue Export") { if (!items.length) return `${title}\n\nNo queued promos.`; return [title, `Generated: ${new Date().toLocaleString()}`, "", ...items.map((item, index) => [`${index + 1}. ${niceDate(item.scheduledDate)} • ${PLATFORM_LABELS[queuePlatform(item)]} • ${queueStatus(item)}`, queueProductName(item), "", queueBundle(item)].join("\n"))].join("\n\n--------------------\n\n"); }

export default function PromoQueueManager() {
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { setQueue(readQueue()); }, []);

  const filteredQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queue.filter((item) => {
      const status = queueStatus(item);
      const platform = queuePlatform(item);
      const text = [queueProductName(item), item.source, item.mode, item.scheduledDate, item.promo?.brand_angle, item.promo?.builder_final, item.promo?.facebook_post, item.promo?.instagram_caption].join(" ").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (term && !text.includes(term)) return false;
      return true;
    }).sort((a, b) => String(a.scheduledDate || "9999-12-31").localeCompare(String(b.scheduledDate || "9999-12-31")));
  }, [queue, statusFilter, platformFilter, search]);

  const todayItems = useMemo(() => queue.filter((item) => item.scheduledDate === todayIso()), [queue]);
  const stats = useMemo(() => ({ total: queue.length, today: todayItems.length, draft: queue.filter((item) => queueStatus(item) === "Draft").length, review: queue.filter((item) => queueStatus(item) === "Needs Review").length, approved: queue.filter((item) => queueStatus(item) === "Approved").length, ready: queue.filter((item) => queueStatus(item) === "Ready").length, posted: queue.filter((item) => queueStatus(item) === "Posted").length, rejected: queue.filter((item) => queueStatus(item) === "Rejected").length }), [queue, todayItems]);
  const updateQueue = (nextQueue) => { setQueue(nextQueue); writeQueue(nextQueue); };
  const updateItem = (queueId, updates) => { updateQueue(queue.map((item) => item.queueId === queueId ? { ...item, ...updates } : item)); setMessage("Queue item updated."); };
  const removeItem = (queueId) => { updateQueue(queue.filter((item) => item.queueId !== queueId)); setMessage("Queue item removed."); };
  const markTodayReady = () => { const today = todayIso(); updateQueue(queue.map((item) => item.scheduledDate === today && ["Approved", "Ready"].includes(queueStatus(item)) ? { ...item, status: "Ready" } : item)); setMessage("Today’s approved items marked Ready."); };
  const markFilteredApproved = () => { const ids = new Set(filteredQueue.map((item) => item.queueId)); updateQueue(queue.map((item) => ids.has(item.queueId) && ["Draft", "Needs Review"].includes(queueStatus(item)) ? { ...item, status: "Approved" } : item)); setMessage("Filtered draft/review items approved."); };
  const clearPosted = () => { updateQueue(queue.filter((item) => queueStatus(item) !== "Posted")); setMessage("Posted items cleared from queue."); };
  const clearRejected = () => { updateQueue(queue.filter((item) => queueStatus(item) !== "Rejected")); setMessage("Rejected items cleared from queue."); };
  const copyBundle = (item) => { const ok = copyText(queueBundle(item)); setMessage(ok ? "Copied post." : "Nothing to copy for this item."); };
  const copyFilteredPlan = () => { const ok = copyText(buildTextPlan(filteredQueue)); setMessage(ok ? "Copied filtered queue plan." : "Nothing to copy."); };

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Queue</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero"><div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Queue</h1><p>Review, approve, schedule, copy, export, and clean up Facebook/Instagram promo drafts.</p></div><div className="heroActions"><a href="/admin/promo-posting-board">Open Posting Board</a><button type="button" onClick={markTodayReady}>Mark Today Ready</button></div></header>
        <section className="stats">{[["total","Total"],["today","Today"],["draft","Draft"],["review","Review"],["approved","Approved"],["ready","Ready"],["posted","Posted"],["rejected","Rejected"]].map(([key,label]) => <button key={key} type="button" onClick={() => key === "today" ? setSearch(todayIso()) : setStatusFilter(key === "total" ? "all" : label)}><strong>{stats[key]}</strong><span>{label}</span></button>)}</section>
        <section className="toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, date, source, caption..." /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? "All Statuses" : status}</option>)}</select><select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={markFilteredApproved}>Approve Filtered</button><button type="button" onClick={copyFilteredPlan}>Copy Filtered Plan</button><button type="button" onClick={() => downloadFile("local-jagoff-promo-queue.csv", buildCsv(filteredQueue), "text/csv")}>Export CSV</button><button type="button" onClick={() => downloadFile("local-jagoff-promo-queue.txt", buildTextPlan(filteredQueue))}>Export TXT</button><button type="button" onClick={() => downloadFile("local-jagoff-promo-queue-backup.json", JSON.stringify({ exportedAt: new Date().toISOString(), queue }, null, 2), "application/json")}>Backup JSON</button><button type="button" className="danger" onClick={clearPosted}>Clear Posted</button><button type="button" className="danger" onClick={clearRejected}>Clear Rejected</button></section>
        {message && <section className="message">{message}</section>}
        {filteredQueue.length === 0 && <section className="empty">No queued promos match this view.</section>}
        <section className="list">{filteredQueue.map((item) => { const platform = queuePlatform(item); const bundle = queueBundle(item); const status = queueStatus(item); const key = item.queueId || item.id || `${queueProductName(item)}-${item.scheduledDate}-${platform}`; return <article key={key} className={`card card${status.replace(/\s+/g, "")}`}><div className="top"><div><p className="mini">{PLATFORM_LABELS[platform]} • {niceDate(item.scheduledDate)}</p><h2>{queueProductName(item)}</h2><span className={`status status${status.replace(/\s+/g, "")}`}>{status}</span></div>{item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={queueProductName(item)} />}</div><p className="angle">{item.promo?.builder_final || item.promo?.facebook_post || item.promo?.instagram_caption || "No preview available."}</p><div className="editGrid"><label>Date<input type="date" value={item.scheduledDate || ""} onChange={(e) => updateItem(item.queueId, { scheduledDate: e.target.value })} /></label><label>Platform<select value={platform} onChange={(e) => updateItem(item.queueId, { scheduledPlatform: e.target.value, displayPlatform: e.target.value, platform: e.target.value })}>{PLATFORMS.filter(([value]) => value !== "all").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Status<select value={status} onChange={(e) => updateItem(item.queueId, { status: e.target.value })}>{STATUSES.filter((value) => value !== "all").map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div><div className="quickActions"><button type="button" onClick={() => updateItem(item.queueId, { status: "Needs Review" })}>Needs Review</button><button type="button" onClick={() => updateItem(item.queueId, { status: "Approved" })}>Approve</button><button type="button" onClick={() => updateItem(item.queueId, { status: "Ready" })}>Ready</button><button type="button" onClick={() => updateItem(item.queueId, { status: "Rejected" })}>Reject</button></div><details><summary>Preview copy</summary><pre>{bundle || "No copy available."}</pre></details><div className="actions"><button type="button" onClick={() => copyBundle(item)}>Copy Post</button><button type="button" onClick={() => downloadFile(`${safeFilename(queueProductName(item))}-post.txt`, bundle || "No copy available.")}>Download TXT</button><button type="button" className="danger" onClick={() => removeItem(item.queueId)}>Remove</button></div></article>; })}</section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:20px}.heroActions,.actions,.quickActions{display:flex;gap:10px;flex-wrap:wrap}.heroActions a{display:inline-flex;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,88px);line-height:.9;text-transform:uppercase}.hero p:last-child{color:#d7d7d7}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-bottom:14px}.stats button,.toolbar,.message,.empty,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:20px;box-shadow:0 18px 60px rgba(0,0,0,.32)}.stats button{text-align:left;color:#fff;padding:14px;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:28px}.stats span{font-size:12px;font-weight:900;color:#ccc;text-transform:uppercase}.toolbar{display:grid;grid-template-columns:2fr 1fr 1fr repeat(7,auto);gap:10px;padding:14px;margin-bottom:14px}input,select{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}button{border:1px solid #333;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff}.message,.empty{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{padding:16px}.top{display:grid;grid-template-columns:minmax(0,1fr) 86px;gap:12px}.top h2{margin:0 0 8px;text-transform:uppercase}.top img{width:86px;height:86px;object-fit:contain;background:#070707;border-radius:14px}.status{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;background:#191919;color:#ffe600;border:1px solid #333;text-transform:uppercase}.angle{white-space:pre-wrap;color:#ddd;line-height:1.45}.editGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}label{display:grid;gap:6px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}details{margin:12px 0}summary{cursor:pointer;color:#ffe600;font-weight:900;text-transform:uppercase}pre{white-space:pre-wrap;color:#eee;line-height:1.45;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.danger{color:#ff9a9a!important}@media(max-width:980px){.hero,.toolbar,.list,.editGrid{display:grid;grid-template-columns:1fr}.top{grid-template-columns:1fr}.top img{width:100%;height:140px}.toolbar button,.heroActions button,.heroActions a,.actions button,.quickActions button{width:100%;justify-content:center;text-align:center}}`}</style>
    </div>
  );
}
