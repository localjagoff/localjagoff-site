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

const STATUS_OPTIONS = ["Needs Review", "Approved", "Ready", "Posted", "Rejected"];
const POSTING_STATUSES = new Set(["Approved", "Ready", "Posted"]);
const ASSISTED_PLATFORMS = new Set(["facebook", "instagram"]);
const VIEW_OPTIONS = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["approved", "Approved"],
  ["ready", "Ready"],
  ["posted", "Posted"],
  ["review", "Needs Review"],
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

function queueStatus(item) {
  return item.status || "Draft";
}

function productUrl(item) {
  return item.product?.id ? `/product/${item.product.id}` : "/";
}

function productName(item) {
  return item.product?.name || item.productName || "Queued Promo";
}

function publicProductUrl(item) {
  return item.product?.id ? `https://www.localjagoff.com/product/${item.product.id}` : "https://www.localjagoff.com";
}

function queueId(item) {
  return item.queueId || item.id || `${productName(item)}-${item.scheduledDate}-${queuePlatform(item)}`;
}

function bundleText(item) {
  if (item.promo?.builder_final) return item.promo.builder_final;

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

function sectionText(text, label) {
  const value = String(text || "");
  const start = value.indexOf(`${label}:`);
  if (start === -1) return "";
  const after = value.slice(start + label.length + 1);
  const next = after.search(/\n\n[A-Z][A-Za-z\s/]+:/);
  return (next >= 0 ? after.slice(0, next) : after).trim();
}

function assistedParts(item) {
  const platform = queuePlatform(item);
  const text = bundleText(item);
  const caption = sectionText(text, `${PLATFORM_LABELS[platform] || platform} Post`) || sectionText(text, "Description") || text;
  return {
    caption,
    firstComment: sectionText(text, "First Comment"),
    hashtags: sectionText(text, "Hashtags"),
    link: sectionText(text, "Link") || publicProductUrl(item),
    overlay: sectionText(text, "Image Overlay Text") || sectionText(text, "Overlay Text"),
  };
}

function platformOpenUrl(platform) {
  if (platform === "facebook") return "https://www.facebook.com/";
  if (platform === "instagram") return "https://www.instagram.com/";
  return "";
}

function buildCsv(items) {
  const headers = ["date", "platform", "status", "product", "source", "post_url", "copy"];
  const rows = items.map((item) => [
    item.scheduledDate || "",
    PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item),
    queueStatus(item),
    productName(item),
    item.source || "",
    item.platformPostUrl || item.postUrl || "",
    bundleText(item),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildPlanText(items, title = "Local Jagoff Posting Plan") {
  if (!items.length) return `${title}\n\nNo posting items.`;

  return [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    ...items.map((item, index) => [
      `${index + 1}. ${niceDate(item.scheduledDate)} • ${PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item)} • ${queueStatus(item)}`,
      productName(item),
      productUrl(item),
      item.platformPostUrl ? `Live Post: ${item.platformPostUrl}` : "Live Post: not added yet",
      "",
      bundleText(item),
    ].join("\n")),
  ].join("\n\n--------------------\n\n");
}

function matchView(item, view) {
  const status = queueStatus(item);
  const date = item.scheduledDate || "";
  const today = todayIso();

  if (view === "today") return date === today && POSTING_STATUSES.has(status);
  if (view === "upcoming") return date >= today && status !== "Posted" && POSTING_STATUSES.has(status);
  if (view === "approved") return status === "Approved";
  if (view === "ready") return status === "Ready";
  if (view === "posted") return status === "Posted";
  if (view === "review") return status === "Needs Review";
  return true;
}

export default function PromoPostingBoard() {
  const [queue, setQueue] = useState([]);
  const [view, setView] = useState("today");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [liveUrls, setLiveUrls] = useState({});

  useEffect(() => {
    const loaded = readQueue();
    setQueue(loaded);
    setLiveUrls(Object.fromEntries(loaded.map((item) => [queueId(item), item.platformPostUrl || item.postUrl || ""])));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue
      .filter((item) => matchView(item, view))
      .filter((item) => platformFilter === "all" || queuePlatform(item) === platformFilter)
      .filter((item) => {
        if (!q) return true;
        return [
          productName(item),
          item.source,
          item.mode,
          queueStatus(item),
          queuePlatform(item),
          item.platformPostUrl,
          item.postUrl,
          item.promo?.brand_angle,
          item.promo?.builder_final,
          item.promo?.facebook_post,
          item.promo?.instagram_caption,
          item.promo?.tiktok_caption,
        ].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.scheduledDate || "9999").localeCompare(String(b.scheduledDate || "9999")));
  }, [queue, view, platformFilter, search]);

  const todayItems = useMemo(
    () => queue.filter((item) => item.scheduledDate === todayIso()).sort((a, b) => queuePlatform(a).localeCompare(queuePlatform(b))),
    [queue]
  );

  const todayPostingItems = useMemo(() => todayItems.filter((item) => POSTING_STATUSES.has(queueStatus(item))), [todayItems]);

  const stats = useMemo(() => ({
    today: todayPostingItems.length,
    todayApproved: todayItems.filter((item) => queueStatus(item) === "Approved").length,
    todayReady: todayItems.filter((item) => queueStatus(item) === "Ready").length,
    todayReview: todayItems.filter((item) => queueStatus(item) === "Needs Review").length,
    todayPosted: todayItems.filter((item) => queueStatus(item) === "Posted").length,
    approved: queue.filter((item) => queueStatus(item) === "Approved").length,
    ready: queue.filter((item) => queueStatus(item) === "Ready").length,
    review: queue.filter((item) => queueStatus(item) === "Needs Review").length,
    posted: queue.filter((item) => queueStatus(item) === "Posted").length,
  }), [queue, todayItems, todayPostingItems]);

  const saveQueue = (next) => {
    setQueue(next);
    writeQueue(next);
  };

  const updateStatus = (id, status) => {
    saveQueue(queue.map((item) => queueId(item) === id ? { ...item, status } : item));
    setMessage(`Marked ${status}.`);
  };

  const saveLiveUrl = (id, markPosted = false) => {
    const value = String(liveUrls[id] || "").trim();
    const next = queue.map((item) => queueId(item) === id ? {
      ...item,
      platformPostUrl: value,
      postUrl: value,
      postedAt: markPosted ? new Date().toISOString() : item.postedAt,
      status: markPosted ? "Posted" : queueStatus(item),
    } : item);
    saveQueue(next);
    setMessage(markPosted ? "Live post URL saved and item marked Posted." : "Live post URL saved.");
  };

  const markTodayReady = () => {
    const today = todayIso();
    const next = queue.map((item) => item.scheduledDate === today && ["Approved", "Ready"].includes(queueStatus(item)) ? { ...item, status: "Ready" } : item);
    saveQueue(next);
    setMessage("Today's approved items marked Ready.");
  };

  const approveTodayReview = () => {
    const today = todayIso();
    const next = queue.map((item) => item.scheduledDate === today && queueStatus(item) === "Needs Review" ? { ...item, status: "Approved" } : item);
    saveQueue(next);
    setMessage("Today's review items approved.");
  };

  const copyBundle = (item) => {
    copyText(bundleText(item));
    setMessage("Copied posting bundle.");
  };

  const copyPart = (item, partName) => {
    const parts = assistedParts(item);
    const value = parts[partName];
    copyText(value);
    setMessage(value ? `Copied ${partName}.` : `No ${partName} found.`);
  };

  const copyTodayPlan = () => {
    copyText(buildPlanText(todayPostingItems, "Local Jagoff Today's Posting Plan"));
    setMessage("Copied today's approved/ready posting plan.");
  };

  const exportCsv = () => downloadFile("local-jagoff-posting-board.csv", buildCsv(filtered), "text/csv");
  const exportTodayCsv = () => downloadFile("local-jagoff-todays-posting-plan.csv", buildCsv(todayPostingItems), "text/csv");
  const exportTodayText = () => downloadFile("local-jagoff-todays-posting-plan.txt", buildPlanText(todayPostingItems, "Local Jagoff Today's Posting Plan"));

  const exportText = () => {
    const text = buildPlanText(filtered, "Local Jagoff Posting Board Export");
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
          <p>Use this screen when you are actually posting or scheduling manually. Facebook and Instagram now have assisted posting actions and live post URL storage for future Meta metrics.</p>
        </header>

        <section className="todayPlan">
          <div>
            <p className="kicker">TODAY'S POSTING PLAN</p>
            <h2>{stats.today} postable today • {stats.todayApproved} approved • {stats.todayReady} ready • {stats.todayReview} review • {stats.todayPosted} posted</h2>
            <p>Copy or export only today's approved/ready/posting items without changing your current filters.</p>
          </div>
          <div className="todayActions">
            <button type="button" className="primary" onClick={copyTodayPlan}>Copy Today's Plan</button>
            <button type="button" onClick={exportTodayText}>Export Today TXT</button>
            <button type="button" onClick={exportTodayCsv}>Export Today CSV</button>
            <button type="button" onClick={approveTodayReview}>Approve Today Review</button>
            <button type="button" onClick={markTodayReady}>Mark Today Ready</button>
          </div>
        </section>

        <section className="stats">
          <button type="button" onClick={() => setView("today")}><strong>{stats.today}</strong><span>Today</span></button>
          <button type="button" onClick={() => setView("approved")}><strong>{stats.approved}</strong><span>Approved</span></button>
          <button type="button" onClick={() => setView("ready")}><strong>{stats.ready}</strong><span>Ready</span></button>
          <button type="button" onClick={() => setView("review")}><strong>{stats.review}</strong><span>Review</span></button>
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
            const status = queueStatus(item);
            const parts = assistedParts(item);
            const assisted = ASSISTED_PLATFORMS.has(platform);
            const id = queueId(item);
            return <article key={id} className={`card card${status.replace(/\s+/g, "")}`}>
              <div className="top">
                <div>
                  <p className="mini">{niceDate(item.scheduledDate)} • {PLATFORM_LABELS[platform] || platform}</p>
                  <h2>{productName(item)}</h2>
                  <span className={`pill pill${status.replace(/\s+/g, "")}`}>{status}</span>
                </div>
                {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={productName(item)} />}
              </div>

              {assisted && <div className="assistBox">
                <p className="mini">ASSISTED {PLATFORM_LABELS[platform]} POSTING</p>
                <div className="assistActions">
                  <button type="button" className="primary" onClick={() => copyPart(item, "caption")}>Copy Caption</button>
                  <button type="button" onClick={() => copyPart(item, "hashtags")}>Copy Hashtags</button>
                  <button type="button" onClick={() => copyPart(item, "firstComment")}>Copy First Comment</button>
                  <button type="button" onClick={() => copyPart(item, "link")}>Copy Link</button>
                  <a href={platformOpenUrl(platform)} target="_blank" rel="noreferrer">Open {PLATFORM_LABELS[platform]}</a>
                </div>
                <label className="liveUrlLabel">Live Post URL<input value={liveUrls[id] ?? item.platformPostUrl ?? item.postUrl ?? ""} onChange={(e) => setLiveUrls({ ...liveUrls, [id]: e.target.value })} placeholder="Paste the live Facebook/Instagram post URL after publishing..." /></label>
                <div className="assistActions urlActions">
                  <button type="button" onClick={() => saveLiveUrl(id)}>Save URL</button>
                  <button type="button" className="primary" onClick={() => saveLiveUrl(id, true)}>Save URL + Mark Posted</button>
                  {(item.platformPostUrl || item.postUrl) && <a href={item.platformPostUrl || item.postUrl} target="_blank" rel="noreferrer">Open Live Post</a>}
                </div>
                <div className="assistPreview">
                  <strong>Caption</strong><p>{parts.caption}</p>
                  {parts.hashtags && <><strong>Hashtags</strong><p>{parts.hashtags}</p></>}
                  {parts.firstComment && <><strong>First Comment</strong><p>{parts.firstComment}</p></>}
                </div>
              </div>}

              <pre>{text}</pre>
              <div className="actions">
                <button type="button" className="primary" onClick={() => copyBundle(item)}>Copy Full Post</button>
                <a href={productUrl(item)} target="_blank" rel="noreferrer">Open Product</a>
                {STATUS_OPTIONS.map((statusOption) => <button key={statusOption} type="button" className={status === statusOption ? "active" : ""} onClick={() => updateStatus(id, statusOption)}>{statusOption}</button>)}
              </div>
            </article>;
          })}
        </section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero,.todayPlan,.stats button,.toolbar,.message,.empty,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero,.todayPlan{padding:22px;margin-bottom:14px}.todayPlan{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;border-color:rgba(255,230,0,.32)}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.todayPlan h2{margin:0;text-transform:uppercase;color:#ffe600}.hero p,.todayPlan p{color:#ddd;line-height:1.55}.todayActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats button{text-align:left;color:#fff;padding:16px;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:32px}.stats span{color:#ccc;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:1px}.toolbar{display:grid;grid-template-columns:1fr 1fr 2fr auto auto;gap:10px;padding:14px;margin-bottom:14px}input,select{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}button,.actions a,.assistActions a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333;text-decoration:none}.primary,.active{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.message,.empty{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{padding:16px}.cardNeedsReview{border-color:rgba(255,230,0,.34)}.cardApproved{border-color:rgba(154,255,183,.28)}.cardRejected{opacity:.72;border-color:rgba(255,95,95,.25)}.top{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:12px}.top h2{text-transform:uppercase}.top img{width:88px;height:88px;object-fit:contain;background:#070707;border-radius:14px}.pill{display:inline-flex;width:max-content;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;text-transform:uppercase;background:#191919;color:#ddd;border:1px solid #333}.pillNeedsReview{background:rgba(255,230,0,.1);border-color:rgba(255,230,0,.32);color:#ffe600}.pillApproved{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}.pillReady{background:#ffe600;color:#000;border-color:#ffe600}.pillPosted{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}.pillRejected{background:rgba(255,95,95,.12);border-color:rgba(255,95,95,.3);color:#ff9a9a}.assistBox{margin:14px 0;padding:12px;border:1px solid rgba(255,230,0,.24);border-radius:18px;background:#050505}.assistActions{display:flex;flex-wrap:wrap;gap:8px}.urlActions{margin-top:8px}.liveUrlLabel{display:block;margin-top:12px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.liveUrlLabel input{margin-top:8px}.assistPreview{margin-top:12px;border-top:1px solid #242424;padding-top:12px}.assistPreview strong{display:block;color:#ffe600;font-size:12px;text-transform:uppercase;letter-spacing:1px}.assistPreview p{white-space:pre-wrap;color:#eee;line-height:1.45;margin:6px 0 12px}pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px;max-height:330px;overflow:auto}.actions{display:flex;flex-wrap:wrap;gap:8px}@media(max-width:900px){.todayPlan,.stats,.toolbar,.board{grid-template-columns:1fr}.todayActions{justify-content:stretch}.todayActions button,.actions button,.actions a,.assistActions button,.assistActions a,.toolbar button{width:100%;text-align:center}.top{grid-template-columns:1fr}.top img{width:100%;height:150px}}`}</style>
    </div>
  );
}
