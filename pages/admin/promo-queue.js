import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";

const STORAGE_KEY = "localJagoffPromoQueue";

const PLATFORMS = [
  ["all", "All Platforms"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const STATUSES = ["all", "Draft", "Needs Review", "Approved", "Ready", "Posted", "Rejected"];

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  full_pack: "Full Pack",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readQueue() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
}

function copyText(value) {
  if (!value || typeof navigator === "undefined") return false;
  navigator.clipboard.writeText(value);
  return true;
}

function niceDate(value) {
  if (!value) return "Not scheduled";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function queueItemPlatform(item) {
  return item?.scheduledPlatform || item?.displayPlatform || item?.platform || "full_pack";
}

function queueItemProductName(item) {
  return item?.product?.name || item?.productName || "Queued Promo";
}

function queueStatus(item) {
  return item?.status || "Draft";
}

function queueItemBundle(item) {
  if (item?.promo?.builder_final) return item.promo.builder_final;

  const platform = queueItemPlatform(item);
  if (["facebook", "instagram", "tiktok", "youtube_shorts"].includes(platform)) {
    return formatPlatformBundle(item.promo, platform);
  }
  return [
    item?.promo?.brand_angle,
    item?.promo?.facebook_post,
    item?.promo?.instagram_caption,
    item?.promo?.tiktok_caption,
    item?.promo?.youtube_shorts_title,
    item?.promo?.youtube_shorts_description,
    item?.promo?.cta,
  ].filter(Boolean).join("\n\n---\n\n");
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

function safeFilename(value) {
  return String(value || "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo";
}

function buildCsv(queue) {
  const headers = ["scheduled_date", "platform", "status", "product", "source", "mode", "created_at", "brand_angle", "copy_bundle"];
  const rows = queue.map((item) => [
    item.scheduledDate || "",
    PLATFORM_LABELS[queueItemPlatform(item)] || queueItemPlatform(item),
    queueStatus(item),
    queueItemProductName(item),
    item.source || "",
    item.mode || "",
    item.createdAt || item.queuedAt || "",
    item.promo?.brand_angle || "",
    queueItemBundle(item),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildTextPlan(items, title = "Local Jagoff Promo Queue Export") {
  if (!items.length) return `${title}\n\nNo queued promos.`;
  return [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    ...items.map((item, index) => [
      `${index + 1}. ${niceDate(item.scheduledDate)} • ${PLATFORM_LABELS[queueItemPlatform(item)] || queueItemPlatform(item)} • ${queueStatus(item)}`,
      queueItemProductName(item),
      "",
      queueItemBundle(item),
    ].join("\n")),
  ].join("\n\n--------------------\n\n");
}

export default function PromoQueueManager() {
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setQueue(readQueue());
  }, []);

  const filteredQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queue.filter((item) => {
      const status = queueStatus(item);
      const platform = queueItemPlatform(item);
      const text = [
        queueItemProductName(item),
        item.source,
        item.mode,
        item.scheduledDate,
        item.promo?.brand_angle,
        item.promo?.builder_final,
        item.promo?.facebook_post,
        item.promo?.instagram_caption,
        item.promo?.tiktok_caption,
      ].join(" ").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (term && !text.includes(term)) return false;
      return true;
    }).sort((a, b) => String(a.scheduledDate || "9999-12-31").localeCompare(String(b.scheduledDate || "9999-12-31")));
  }, [queue, statusFilter, platformFilter, search]);

  const todayItems = useMemo(() => queue.filter((item) => item.scheduledDate === todayIso()), [queue]);

  const stats = useMemo(() => ({
    total: queue.length,
    today: todayItems.length,
    draft: queue.filter((item) => queueStatus(item) === "Draft").length,
    review: queue.filter((item) => queueStatus(item) === "Needs Review").length,
    approved: queue.filter((item) => queueStatus(item) === "Approved").length,
    ready: queue.filter((item) => queueStatus(item) === "Ready").length,
    posted: queue.filter((item) => queueStatus(item) === "Posted").length,
    rejected: queue.filter((item) => queueStatus(item) === "Rejected").length,
  }), [queue, todayItems]);

  const updateQueue = (nextQueue) => {
    setQueue(nextQueue);
    writeQueue(nextQueue);
  };

  const updateItem = (queueId, updates) => {
    updateQueue(queue.map((item) => item.queueId === queueId ? { ...item, ...updates } : item));
    setMessage("Queue item updated.");
  };

  const removeItem = (queueId) => {
    updateQueue(queue.filter((item) => item.queueId !== queueId));
    setMessage("Queue item removed.");
  };

  const clearPosted = () => {
    updateQueue(queue.filter((item) => queueStatus(item) !== "Posted"));
    setMessage("Posted items cleared from queue.");
  };

  const clearRejected = () => {
    updateQueue(queue.filter((item) => queueStatus(item) !== "Rejected"));
    setMessage("Rejected items cleared from queue.");
  };

  const markTodayReady = () => {
    const today = todayIso();
    updateQueue(queue.map((item) => item.scheduledDate === today && ["Approved", "Ready"].includes(queueStatus(item)) ? { ...item, status: "Ready" } : item));
    setMessage("Today’s approved items marked Ready.");
  };

  const markFilteredApproved = () => {
    const ids = new Set(filteredQueue.map((item) => item.queueId));
    updateQueue(queue.map((item) => ids.has(item.queueId) && ["Draft", "Needs Review"].includes(queueStatus(item)) ? { ...item, status: "Approved" } : item));
    setMessage("Filtered draft/review items approved.");
  };

  const copyBundle = (item) => {
    const ok = copyText(queueItemBundle(item));
    setMessage(ok ? "Copied post bundle." : "Nothing to copy for this item.");
  };

  const copyFilteredPlan = () => {
    const ok = copyText(buildTextPlan(filteredQueue));
    setMessage(ok ? "Copied filtered queue plan." : "Nothing to copy.");
  };

  const exportCsv = () => {
    downloadFile("local-jagoff-promo-queue.csv", buildCsv(filteredQueue), "text/csv");
    setMessage("CSV exported.");
  };

  const exportText = () => {
    downloadFile("local-jagoff-promo-queue.txt", buildTextPlan(filteredQueue));
    setMessage("TXT exported.");
  };

  const exportBackup = () => {
    downloadFile("local-jagoff-promo-queue-backup.json", JSON.stringify({ exportedAt: new Date().toISOString(), queue }, null, 2), "application/json");
    setMessage("Queue backup exported.");
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Queue</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Promo Queue</h1>
            <p>Review, approve, schedule, copy, export, and clean up promo drafts. Approved items can move to Ready for the Posting Board.</p>
          </div>
          <div className="heroActions">
            <a href="/admin/promo-posting-board">Open Posting Board</a>
            <button type="button" onClick={markTodayReady}>Mark Today Ready</button>
          </div>
        </header>

        <section className="stats">
          <button type="button" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); }}><strong>{stats.total}</strong><span>Total</span></button>
          <button type="button" onClick={() => { setStatusFilter("all"); setSearch(todayIso()); }}><strong>{stats.today}</strong><span>Today</span></button>
          <button type="button" onClick={() => setStatusFilter("Draft")}><strong>{stats.draft}</strong><span>Draft</span></button>
          <button type="button" onClick={() => setStatusFilter("Needs Review")}><strong>{stats.review}</strong><span>Review</span></button>
          <button type="button" onClick={() => setStatusFilter("Approved")}><strong>{stats.approved}</strong><span>Approved</span></button>
          <button type="button" onClick={() => setStatusFilter("Ready")}><strong>{stats.ready}</strong><span>Ready</span></button>
          <button type="button" onClick={() => setStatusFilter("Posted")}><strong>{stats.posted}</strong><span>Posted</span></button>
          <button type="button" onClick={() => setStatusFilter("Rejected")}><strong>{stats.rejected}</strong><span>Rejected</span></button>
        </section>

        <section className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, date, source, caption..." />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? "All Statuses" : status}</option>)}</select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={markFilteredApproved}>Approve Filtered</button>
          <button type="button" onClick={copyFilteredPlan}>Copy Filtered Plan</button>
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={exportText}>Export TXT</button>
          <button type="button" onClick={exportBackup}>Backup JSON</button>
          <button type="button" className="danger" onClick={clearPosted}>Clear Posted</button>
          <button type="button" className="danger" onClick={clearRejected}>Clear Rejected</button>
        </section>

        {message && <section className="message">{message}</section>}
        {filteredQueue.length === 0 && <section className="empty">No queued promos match this view.</section>}

        <section className="list">
          {filteredQueue.map((item) => {
            const platform = queueItemPlatform(item);
            const bundle = queueItemBundle(item);
            const status = queueStatus(item);
            const key = item.queueId || item.id || `${queueItemProductName(item)}-${item.scheduledDate}-${platform}`;

            return (
              <article key={key} className={`card card${status.replace(/\s+/g, "")}`}>
                <div className="top">
                  <div>
                    <p className="mini">{PLATFORM_LABELS[platform] || platform} • {niceDate(item.scheduledDate)}</p>
                    <h2>{queueItemProductName(item)}</h2>
                    <span className={`status status${status.replace(/\s+/g, "")}`}>{status}</span>
                  </div>
                  {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={queueItemProductName(item)} />}
                </div>

                <p className="angle">{item.promo?.brand_angle || item.promo?.builder_final || item.promo?.facebook_post || "No preview available."}</p>

                <div className="editGrid">
                  <label>Date<input type="date" value={item.scheduledDate || ""} onChange={(e) => updateItem(item.queueId, { scheduledDate: e.target.value })} /></label>
                  <label>Platform<select value={platform} onChange={(e) => updateItem(item.queueId, { scheduledPlatform: e.target.value, displayPlatform: e.target.value })}>{PLATFORMS.filter(([value]) => value !== "all").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>Status<select value={status} onChange={(e) => updateItem(item.queueId, { status: e.target.value })}>{STATUSES.filter((value) => value !== "all").map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                </div>

                <div className="quickActions">
                  <button type="button" onClick={() => updateItem(item.queueId, { status: "Needs Review" })}>Needs Review</button>
                  <button type="button" onClick={() => updateItem(item.queueId, { status: "Approved" })}>Approve</button>
                  <button type="button" onClick={() => updateItem(item.queueId, { status: "Ready" })}>Ready</button>
                  <button type="button" onClick={() => updateItem(item.queueId, { status: "Rejected" })}>Reject</button>
                </div>

                <details><summary>Preview copy bundle</summary><pre>{bundle || "No copy available."}</pre></details>

                <div className="actions">
                  <button type="button" onClick={() => copyBundle(item)}>Copy Post</button>
                  <button type="button" onClick={() => downloadFile(`${safeFilename(queueItemProductName(item))}-bundle.txt`, bundle || "No copy available.")}>Download TXT</button>
                  <button type="button" className="danger" onClick={() => removeItem(item.queueId)}>Remove</button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:20px}.heroActions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.heroActions a{display:inline-flex;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,88px);line-height:.9;text-transform:uppercase}.hero p:last-child{color:#d7d7d7;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats button,.toolbar,.card,.empty,.message{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.4)}.stats button{text-align:left;padding:16px;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:1px}.toolbar{display:grid;grid-template-columns:2fr 1fr 1fr auto auto auto auto auto auto auto;gap:10px;padding:14px;margin-bottom:16px}.list{display:grid;gap:14px}.card{padding:18px}.cardNeedsReview{border-color:rgba(255,230,0,.36)}.cardApproved{border-color:rgba(80,255,140,.3)}.cardRejected{opacity:.72;border-color:rgba(255,95,95,.28)}.top{display:grid;grid-template-columns:minmax(0,1fr) 86px;gap:14px;align-items:start}.top h2{text-transform:uppercase;font-size:22px}.top img{width:86px;height:86px;object-fit:contain;background:#070707;border-radius:14px}.angle{color:#ddd;line-height:1.55}.status{display:inline-flex;width:max-content;margin:6px 0 0;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900;text-transform:uppercase}.statusDraft{color:#ddd;background:#191919;border:1px solid #333}.statusNeedsReview{color:#ffe600;background:rgba(255,230,0,.1);border:1px solid rgba(255,230,0,.32)}.statusApproved{color:#9affb7;background:rgba(35,150,75,.2);border:1px solid rgba(154,255,183,.35)}.statusReady{color:#000;background:#ffe600}.statusPosted{color:#9affb7;background:rgba(35,150,75,.2);border:1px solid rgba(154,255,183,.35)}.statusRejected{color:#ff9a9a;background:rgba(255,95,95,.12);border:1px solid rgba(255,95,95,.3)}.editGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.editGrid label{color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}input,select{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px 13px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333}.toolbar button:first-of-type,.actions button:first-child,.heroActions button,.quickActions button:nth-child(2),.quickActions button:nth-child(3){color:#000;background:#ffe600}.danger,.quickActions button:nth-child(4){color:#ff9a9a!important}.message,.empty{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.quickActions,.actions{display:flex;flex-wrap:wrap;gap:10px}.quickActions{margin-bottom:12px}details{margin:14px 0;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}summary{cursor:pointer;color:#ffe600;font-weight:900;text-transform:uppercase;font-size:12px;letter-spacing:1px}pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55}.empty{text-align:center;color:#ddd}@media(max-width:1100px){.toolbar{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.hero,.toolbar,.stats,.editGrid,.top{grid-template-columns:1fr;display:grid}.heroActions{justify-content:stretch}.heroActions a,.heroActions button,.toolbar button,.actions button,.quickActions button{width:100%;text-align:center;justify-content:center}.top img{width:100%;height:150px}}`}</style>
    </div>
  );
}
