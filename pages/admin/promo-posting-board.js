import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const QUEUE_KEY = "localJagoffPromoQueue";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
};

const VIEW_OPTIONS = [
  ["approved", "Approved"],
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
  if (typeof window !== "undefined") {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
  }
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

function niceDateTime(value) {
  if (!value) return "Not posted yet";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function queuePlatform(item) {
  const platform = item.scheduledPlatform || item.displayPlatform || item.platform || "facebook";
  return platform === "instagram" ? "instagram" : "facebook";
}

function queueStatus(item) {
  return item.status === "Posted" ? "Posted" : "Approved";
}

function productUrl(item) {
  return item.product?.id ? `/product/${item.product.id}` : "/";
}

function publicProductUrl(item) {
  return item.product?.id ? `https://www.localjagoff.com/product/${item.product.id}` : "https://www.localjagoff.com";
}

function productName(item) {
  return item.product?.name || item.productName || "Queued Promo";
}

function destinationName(item) {
  return item.destinationLabel || item.destination || "No destination saved";
}

function livePostUrl(item) {
  return item.platformPostUrl || item.postUrl || "";
}

function queueId(item) {
  return item.queueId || item.id || `${productName(item)}-${item.scheduledDate}-${queuePlatform(item)}`;
}

function bundleText(item) {
  if (item.promo?.builder_final) return item.promo.builder_final;
  return [item.promo?.facebook_post, item.promo?.instagram_caption, item.promo?.cta].filter(Boolean).join("\n\n");
}

function buildCsv(items) {
  const headers = ["date", "platform", "destination", "status", "product", "live_post_url", "copy"];
  const rows = items.map((item) => [
    item.scheduledDate || "",
    PLATFORM_LABELS[queuePlatform(item)] || queuePlatform(item),
    destinationName(item),
    queueStatus(item),
    productName(item),
    livePostUrl(item),
    bundleText(item),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildPlanText(items, title = "Local Jagoff Posting Board") {
  if (!items.length) return `${title}\n\nNo posting items.`;
  return [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    ...items.map((item, index) => [
      `${index + 1}. ${niceDate(item.scheduledDate)} • ${PLATFORM_LABELS[queuePlatform(item)]} • ${queueStatus(item)}`,
      `Destination: ${destinationName(item)}`,
      `Product: ${productName(item)}`,
      `Product Link: ${publicProductUrl(item)}`,
      livePostUrl(item) ? `Live Post: ${livePostUrl(item)}` : "Live Post: not added yet",
      "",
      bundleText(item),
    ].join("\n")),
  ].join("\n\n--------------------\n\n");
}

function platformOpenUrl(platform) {
  if (platform === "instagram") return "https://www.instagram.com/";
  return "https://www.facebook.com/";
}

export default function PromoPostingBoard() {
  const [queue, setQueue] = useState([]);
  const [view, setView] = useState("approved");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [liveUrls, setLiveUrls] = useState({});
  const [savedId, setSavedId] = useState("");

  useEffect(() => {
    const loaded = readQueue().map((item) => ({
      ...item,
      status: item.status === "Posted" ? "Posted" : "Approved",
    }));
    setQueue(loaded);
    writeQueue(loaded);
    setLiveUrls(Object.fromEntries(loaded.map((item) => [queueId(item), livePostUrl(item)])));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue
      .filter((item) => view === "all" || queueStatus(item).toLowerCase() === view)
      .filter((item) => platformFilter === "all" || queuePlatform(item) === platformFilter)
      .filter((item) => {
        if (!q) return true;
        return [
          productName(item),
          destinationName(item),
          queueStatus(item),
          queuePlatform(item),
          livePostUrl(item),
          bundleText(item),
        ].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.scheduledDate || "9999").localeCompare(String(b.scheduledDate || "9999")));
  }, [queue, view, platformFilter, search]);

  const stats = useMemo(() => {
    const today = todayIso();
    return {
      today: queue.filter((item) => item.scheduledDate === today && queueStatus(item) === "Approved").length,
      approved: queue.filter((item) => queueStatus(item) === "Approved").length,
      posted: queue.filter((item) => queueStatus(item) === "Posted").length,
      needsUrl: queue.filter((item) => queueStatus(item) === "Posted" && !livePostUrl(item)).length,
    };
  }, [queue]);

  const saveQueue = (next) => {
    setQueue(next);
    writeQueue(next);
  };

  const flashSaved = (id) => {
    setSavedId(id);
    if (typeof window !== "undefined") {
      window.clearTimeout(window.__localJagoffPostingSavedTimer);
      window.__localJagoffPostingSavedTimer = window.setTimeout(() => setSavedId(""), 1800);
    }
  };

  const markPosted = (id) => {
    const next = queue.map((item) => queueId(item) === id ? {
      ...item,
      status: "Posted",
      postedAt: item.postedAt || new Date().toISOString(),
    } : item);
    saveQueue(next);
    setMessage("Marked posted. Paste the live post URL when you have it.");
    flashSaved(id);
  };

  const saveLiveUrl = (id) => {
    const value = String(liveUrls[id] || "").trim();
    if (!value) {
      setMessage("Paste the live Facebook/Instagram post URL first.");
      flashSaved(id);
      return;
    }

    const next = queue.map((item) => queueId(item) === id ? {
      ...item,
      platformPostUrl: value,
      postUrl: value,
      urlSavedAt: new Date().toISOString(),
      status: "Posted",
      postedAt: item.postedAt || new Date().toISOString(),
    } : item);

    saveQueue(next);
    setMessage("Live URL saved. This post is now ready for Performance tracking.");
    flashSaved(id);
  };

  const copyBundle = (item) => {
    copyText(bundleText(item));
    setMessage("Copied post copy.");
  };

  const exportCsv = () => downloadFile("local-jagoff-posting-board.csv", buildCsv(filtered), "text/csv");
  const exportText = () => downloadFile("local-jagoff-posting-board.txt", buildPlanText(filtered));

  return (
    <div className="page">
      <Head><title>Local Jagoff Posting Board</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Posting Board</h1>
          <p>Copy approved posts, post manually, paste the live Facebook/Instagram URL, then track performance.</p>
        </header>

        <section className="stats">
          <button type="button" onClick={() => setView("approved")}><strong>{stats.approved}</strong><span>Approved</span></button>
          <button type="button" onClick={() => setView("posted")}><strong>{stats.posted}</strong><span>Posted</span></button>
          <button type="button" onClick={() => setView("approved")}><strong>{stats.today}</strong><span>Approved Today</span></button>
          <button type="button" onClick={() => setView("posted")}><strong>{stats.needsUrl}</strong><span>Posted Needs URL</span></button>
        </section>

        <section className="toolbar">
          <select value={view} onChange={(e) => setView(e.target.value)}>{VIEW_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="all">All Platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts, products, URLs..." />
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={exportText}>Export TXT</button>
        </section>

        {message && <section className="message">{message}</section>}
        {filtered.length === 0 && <section className="empty">No posts match this view.</section>}

        <section className="board">
          {filtered.map((item) => {
            const platform = queuePlatform(item);
            const status = queueStatus(item);
            const id = queueId(item);
            const saved = savedId === id;
            const currentUrl = liveUrls[id] ?? livePostUrl(item);
            const hasUrl = Boolean(livePostUrl(item));
            const text = bundleText(item);

            return (
              <article key={id} className={`card card${status} ${saved ? "cardSaved" : ""}`}>
                <div className="top">
                  <div>
                    <p className="mini">{niceDate(item.scheduledDate)} • {PLATFORM_LABELS[platform]}</p>
                    <h2>{productName(item)}</h2>
                    <span className={`pill pill${status}`}>{status}</span>
                    <span className="destinationPill">{destinationName(item)}</span>
                    {hasUrl && <span className="trackedPill">URL saved</span>}
                    {saved && <span className="savedPill">Saved ✓</span>}
                  </div>
                  {item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={productName(item)} />}
                </div>

                <pre>{text}</pre>

                <div className="primaryActions">
                  <button type="button" className="primary" onClick={() => copyBundle(item)}>Copy Full Post</button>
                  <a href={productUrl(item)} target="_blank" rel="noreferrer">Open Product</a>
                  <a href={platformOpenUrl(platform)} target="_blank" rel="noreferrer">Open {PLATFORM_LABELS[platform]}</a>
                  {status !== "Posted" && <button type="button" onClick={() => markPosted(id)}>Mark Posted</button>}
                </div>

                <section className="trackingBox">
                  <div className="trackingHead">
                    <div>
                      <p className="mini">TRACK THIS POST</p>
                      <h3>Live Post URL</h3>
                      <p>Paste the real Facebook/Instagram post URL after it is live.</p>
                    </div>
                    <span>{hasUrl ? "Linked" : "Needs URL"}</span>
                  </div>
                  <input
                    value={currentUrl}
                    onChange={(e) => setLiveUrls({ ...liveUrls, [id]: e.target.value })}
                    placeholder="https://www.facebook.com/... or https://www.instagram.com/..."
                  />
                  <div className="urlActions">
                    <button type="button" className="primary" onClick={() => saveLiveUrl(id)}>{hasUrl ? "Update URL" : "Save URL + Mark Posted"}</button>
                    {hasUrl && <a href={livePostUrl(item)} target="_blank" rel="noreferrer">Open Live Post</a>}
                    {status === "Posted" && <span>Posted {niceDateTime(item.postedAt || item.urlSavedAt)}</span>}
                  </div>
                </section>
              </article>
            );
          })}
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero,.stats button,.toolbar,.message,.empty,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:22px;margin-bottom:14px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats button{text-align:left;color:#fff;padding:16px;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:32px}.stats span{color:#ccc;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:1px}.toolbar{display:grid;grid-template-columns:1fr 1fr 2fr auto auto;gap:10px;padding:14px;margin-bottom:14px}input,select{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}button,.primaryActions a,.urlActions a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333;text-decoration:none}.primary{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.message,.empty{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{padding:16px;transition:border-color .16s ease,box-shadow .16s ease}.cardSaved{border-color:#ffe600;box-shadow:0 0 0 2px rgba(255,230,0,.12),0 20px 70px rgba(0,0,0,.38)}.top{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:12px}.top h2{text-transform:uppercase}.top img{width:88px;height:88px;object-fit:contain;background:#070707;border-radius:14px}.pill,.destinationPill,.trackedPill,.savedPill{display:inline-flex;width:max-content;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;text-transform:uppercase;background:#191919;color:#ddd;border:1px solid #333;margin:4px 6px 0 0}.destinationPill{background:rgba(255,230,0,.1);border-color:rgba(255,230,0,.32);color:#ffe600}.trackedPill{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}.savedPill{background:#ffe600;color:#000;border-color:#ffe600}.pillApproved{background:rgba(255,230,0,.1);border-color:rgba(255,230,0,.32);color:#ffe600}.pillPosted{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px;max-height:330px;overflow:auto}.primaryActions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.trackingBox{margin-top:14px;padding:14px;border:1px solid rgba(255,230,0,.34);border-radius:20px;background:linear-gradient(135deg,rgba(255,230,0,.1),rgba(5,5,5,.96))}.trackingHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.trackingHead h3{margin:0 0 6px;color:#fff;text-transform:uppercase}.trackingHead p{margin:0;color:#ccc;line-height:1.4}.trackingHead span{display:inline-flex;border-radius:999px;padding:7px 10px;background:#050505;color:#ffe600;border:1px solid rgba(255,230,0,.28);font-size:11px;font-weight:900;text-transform:uppercase;white-space:nowrap}.trackingBox input{margin-top:12px;border-color:rgba(255,230,0,.36);font-weight:700}.urlActions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.urlActions span{display:inline-flex;align-items:center;border:1px solid rgba(154,255,183,.28);border-radius:999px;padding:9px 11px;background:rgba(154,255,183,.1);color:#9affb7;font-size:12px;font-weight:900;text-transform:uppercase}@media(max-width:900px){.stats,.toolbar,.board{grid-template-columns:1fr}.primaryActions button,.primaryActions a,.toolbar button,.urlActions button,.urlActions a{width:100%;text-align:center}.top{grid-template-columns:1fr}.top img{width:100%;height:150px}.trackingHead{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
