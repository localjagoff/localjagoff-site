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

const STATUSES = ["all", "Draft", "Ready", "Posted"];

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
};

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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function copyText(value) {
  if (!value || typeof navigator === "undefined") return;
  navigator.clipboard.writeText(value);
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

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function queueItemPlatform(item) {
  return item?.scheduledPlatform || item?.displayPlatform || item?.platform || "full_pack";
}

function queueItemBundle(item) {
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

function buildCsv(queue) {
  const headers = [
    "scheduled_date",
    "platform",
    "status",
    "product",
    "source",
    "mode",
    "created_at",
    "brand_angle",
    "copy_bundle",
  ];

  const rows = queue.map((item) => [
    item.scheduledDate || "",
    PLATFORM_LABELS[queueItemPlatform(item)] || queueItemPlatform(item),
    item.status || "Draft",
    item.product?.name || "",
    item.source || "",
    item.mode || "",
    item.createdAt || item.queuedAt || "",
    item.promo?.brand_angle || "",
    queueItemBundle(item),
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export default function PromoQueueManager() {
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setQueue(readQueue());
  }, []);

  const filteredQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queue.filter((item) => {
      const status = item.status || "Draft";
      const platform = queueItemPlatform(item);
      const text = [
        item.product?.name,
        item.source,
        item.mode,
        item.promo?.brand_angle,
        item.promo?.facebook_post,
        item.promo?.instagram_caption,
        item.promo?.tiktok_caption,
      ].join(" ").toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (term && !text.includes(term)) return false;
      return true;
    });
  }, [queue, statusFilter, platformFilter, search]);

  const stats = useMemo(() => ({
    total: queue.length,
    draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
    ready: queue.filter((item) => item.status === "Ready").length,
    posted: queue.filter((item) => item.status === "Posted").length,
  }), [queue]);

  const updateQueue = (nextQueue) => {
    setQueue(nextQueue);
    writeQueue(nextQueue);
  };

  const updateItem = (queueId, updates) => {
    updateQueue(queue.map((item) => item.queueId === queueId ? { ...item, ...updates } : item));
  };

  const removeItem = (queueId) => {
    updateQueue(queue.filter((item) => item.queueId !== queueId));
  };

  const clearPosted = () => {
    updateQueue(queue.filter((item) => item.status !== "Posted"));
  };

  const exportCsv = () => {
    downloadFile("local-jagoff-promo-queue.csv", buildCsv(filteredQueue), "text/csv");
  };

  const exportBackup = () => {
    downloadFile(
      "local-jagoff-promo-queue-backup.json",
      JSON.stringify({ exportedAt: new Date().toISOString(), queue }, null, 2),
      "application/json"
    );
  };

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Promo Queue</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Promo Queue</h1>
            <p>Filter, copy, export, and clean up the promo drafts saved from the Promo Command Center.</p>
          </div>
        </header>

        <section className="stats">
          <div><strong>{stats.total}</strong><span>Total</span></div>
          <div><strong>{stats.draft}</strong><span>Draft</span></div>
          <div><strong>{stats.ready}</strong><span>Ready</span></div>
          <div><strong>{stats.posted}</strong><span>Posted</span></div>
        </section>

        <section className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product or caption..." />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? "All Statuses" : status}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            {PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={exportBackup}>Backup JSON</button>
          <button type="button" className="danger" onClick={clearPosted}>Clear Posted</button>
        </section>

        {filteredQueue.length === 0 && <section className="empty">No queued promos match this view.</section>}

        <section className="list">
          {filteredQueue.map((item) => {
            const platform = queueItemPlatform(item);
            const bundle = queueItemBundle(item);

            return (
              <article key={item.queueId} className="card">
                <div className="top">
                  <div>
                    <p className="mini">{PLATFORM_LABELS[platform] || platform} • {niceDate(item.scheduledDate)}</p>
                    <h2>{item.product?.name || "Queued Promo"}</h2>
                    <span className={`status status${item.status || "Draft"}`}>{item.status || "Draft"}</span>
                  </div>
                  {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={item.product?.name || "Product"} />}
                </div>

                <p className="angle">{item.promo?.brand_angle || item.promo?.facebook_post || "No preview available."}</p>

                <div className="editGrid">
                  <label>
                    Date
                    <input type="date" value={item.scheduledDate || ""} onChange={(e) => updateItem(item.queueId, { scheduledDate: e.target.value })} />
                  </label>
                  <label>
                    Platform
                    <select value={platform} onChange={(e) => updateItem(item.queueId, { scheduledPlatform: e.target.value, displayPlatform: e.target.value })}>
                      {PLATFORMS.filter(([value]) => value !== "all").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={item.status || "Draft"} onChange={(e) => updateItem(item.queueId, { status: e.target.value })}>
                      {STATUSES.filter((status) => status !== "all").map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </div>

                <details>
                  <summary>Preview copy bundle</summary>
                  <pre>{bundle}</pre>
                </details>

                <div className="actions">
                  <button type="button" onClick={() => copyText(bundle)}>Copy Bundle</button>
                  <button type="button" onClick={() => downloadFile(`${item.product?.name || "promo"}-bundle.txt`, bundle)}>Download TXT</button>
                  <button type="button" className="danger" onClick={() => removeItem(item.queueId)}>Remove</button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:20px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,88px);line-height:.9;text-transform:uppercase}.hero p:last-child{color:#d7d7d7;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div,.toolbar,.card,.empty{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.4)}.stats div{padding:16px}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:1px}.toolbar{display:grid;grid-template-columns:2fr 1fr 1fr auto auto auto;gap:10px;padding:14px;margin-bottom:16px}.list{display:grid;gap:14px}.card{padding:18px}.top{display:grid;grid-template-columns:minmax(0,1fr) 86px;gap:14px;align-items:start}.top h2{text-transform:uppercase;font-size:22px}.top img{width:86px;height:86px;object-fit:contain;background:#070707;border-radius:14px}.angle{color:#ddd;line-height:1.55}.status{display:inline-flex;width:max-content;margin:6px 0 0;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900;text-transform:uppercase}.statusDraft{color:#ddd;background:#191919;border:1px solid #333}.statusReady{color:#000;background:#ffe600}.statusPosted{color:#9affb7;background:rgba(35,150,75,.2);border:1px solid rgba(154,255,183,.35)}.editGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.editGrid label{color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}input,select{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px 13px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333}.toolbar button:first-of-type,.actions button:first-child{color:#000;background:#ffe600}.danger{color:#ff9a9a!important}details{margin:14px 0;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}summary{cursor:pointer;color:#ffe600;font-weight:900;text-transform:uppercase;font-size:12px;letter-spacing:1px}pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55}.actions{display:flex;flex-wrap:wrap;gap:10px}.empty{padding:24px;text-align:center;color:#ddd}@media(max-width:900px){.hero,.toolbar{grid-template-columns:1fr;display:grid}.stats,.editGrid{grid-template-columns:1fr 1fr}.toolbar button,.actions button{width:100%}}@media(max-width:600px){.stats,.editGrid,.top{grid-template-columns:1fr}.top img{width:100%;height:150px}}`}</style>
    </div>
  );
}
