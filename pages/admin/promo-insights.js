import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const PERF_KEY = "localJagoffPromoPerformance";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  full_pack: "Full Pack",
  general: "General",
};

function readArray(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function score(entry) {
  return cleanNumber(entry.views) + cleanNumber(entry.likes) * 3 + cleanNumber(entry.comments) * 5 + cleanNumber(entry.shares) * 8 + cleanNumber(entry.clicks) * 10 + cleanNumber(entry.sales) * 25;
}

function rate(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function groupBy(items, getKey) {
  return items.reduce((map, item) => {
    const key = getKey(item) || "Unknown";
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

function summarizeGroup(items) {
  return {
    posts: items.length,
    winners: items.filter((item) => item.winner).length,
    views: items.reduce((sum, item) => sum + cleanNumber(item.views), 0),
    clicks: items.reduce((sum, item) => sum + cleanNumber(item.clicks), 0),
    sales: items.reduce((sum, item) => sum + cleanNumber(item.sales), 0),
    score: items.reduce((sum, item) => sum + score(item), 0),
  };
}

function summarizeRows(grouped) {
  return Object.entries(grouped)
    .map(([name, items]) => ({ name, ...summarizeGroup(items) }))
    .sort((a, b) => b.score - a.score);
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

function buildCsv(rows) {
  const headers = ["rank", "name", "posts", "winners", "winner_rate", "views", "clicks", "sales", "score"];
  const data = rows.map((row, index) => [
    index + 1,
    row.name,
    row.posts,
    row.winners,
    rate(row.winners, row.posts),
    row.views,
    row.clicks,
    row.sales,
    row.score,
  ]);
  return [headers, ...data].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function niceDate(value) {
  if (!value) return "No date";
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

export default function PromoInsights() {
  const [performance, setPerformance] = useState([]);
  const [view, setView] = useState("platforms");
  const [winnerOnly, setWinnerOnly] = useState(false);

  useEffect(() => setPerformance(readArray(PERF_KEY)), []);

  const usablePerformance = useMemo(
    () => performance.filter((item) => !winnerOnly || item.winner),
    [performance, winnerOnly]
  );

  const platformRows = useMemo(
    () => summarizeRows(groupBy(usablePerformance, (item) => PLATFORM_LABELS[item.platform] || item.platform || "Unknown")),
    [usablePerformance]
  );

  const productRows = useMemo(
    () => summarizeRows(groupBy(usablePerformance, (item) => item.productName || "Unknown product")),
    [usablePerformance]
  );

  const sourceRows = useMemo(
    () => summarizeRows(groupBy(usablePerformance, (item) => item.source || "Unknown source")),
    [usablePerformance]
  );

  const topPosts = useMemo(
    () => [...usablePerformance].sort((a, b) => score(b) - score(a)).slice(0, 12),
    [usablePerformance]
  );

  const activeRows = view === "products" ? productRows : view === "sources" ? sourceRows : platformRows;

  const totals = useMemo(() => summarizeGroup(performance), [performance]);

  const exportCsv = () => downloadFile(`local-jagoff-insights-${view}.csv`, buildCsv(activeRows), "text/csv");

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Insights</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Insights</h1>
          <p>Turn Performance data into decisions. See which platforms, products, sources, and posts are actually winning.</p>
        </header>

        <section className="stats">
          <div><strong>{totals.posts}</strong><span>Tracked</span></div>
          <div><strong>{totals.winners}</strong><span>Winners</span></div>
          <div><strong>{rate(totals.winners, totals.posts)}</strong><span>Winner Rate</span></div>
          <div><strong>{totals.views}</strong><span>Views</span></div>
          <div><strong>{totals.clicks}</strong><span>Clicks</span></div>
          <div><strong>{totals.sales}</strong><span>Sales</span></div>
          <div><strong>{totals.score}</strong><span>Total Score</span></div>
        </section>

        <section className="toolbar">
          <button type="button" className={view === "platforms" ? "active" : ""} onClick={() => setView("platforms")}>Platforms</button>
          <button type="button" className={view === "products" ? "active" : ""} onClick={() => setView("products")}>Products</button>
          <button type="button" className={view === "sources" ? "active" : ""} onClick={() => setView("sources")}>Sources</button>
          <label><input type="checkbox" checked={winnerOnly} onChange={(e) => setWinnerOnly(e.target.checked)} /> Winners only</label>
          <button type="button" onClick={exportCsv}>Export View CSV</button>
          <a href="/admin/promo-performance">Open Performance</a>
        </section>

        {performance.length === 0 && <section className="empty">No insights yet. Mark posts as Posted, sync them into Performance, and enter metrics first.</section>}

        <section className="layout">
          <div className="panel">
            <div className="panelHead"><p className="kicker">LEADERBOARD</p><h2>{view}</h2></div>
            <div className="table">
              <div className="row head"><span>Rank</span><span>Name</span><span>Posts</span><span>Winners</span><span>Rate</span><span>Score</span></div>
              {activeRows.map((row, index) => <div key={row.name} className="row"><span>#{index + 1}</span><strong>{row.name}</strong><span>{row.posts}</span><span>{row.winners}</span><span>{rate(row.winners, row.posts)}</span><span>{row.score}</span></div>)}
            </div>
          </div>

          <aside className="panel">
            <div className="panelHead"><p className="kicker">TOP POSTS</p><h2>Best copy</h2></div>
            <div className="posts">
              {topPosts.map((post, index) => <article key={post.id || `${post.productName}-${index}`} className="post"><p className="mini">#{index + 1} • {niceDate(post.postedDate)} • {PLATFORM_LABELS[post.platform] || post.platform}</p><h3>{post.productName}</h3><p>Score {score(post)} • Views {post.views || 0} • Clicks {post.clicks || 0} • Sales {post.sales || 0}</p>{post.winner && <span>Winner</span>}</article>)}
            </div>
          </aside>
        </section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1260px;margin:0 auto;padding-top:34px}.hero,.stats div,.toolbar,.panel,.empty{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:24px;margin-bottom:14px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p,.post p,.empty{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div{padding:16px}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;text-transform:uppercase}.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:14px;margin-bottom:14px}button,.toolbar a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333;text-decoration:none}.active,.toolbar a:hover{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.toolbar label{display:flex;gap:8px;align-items:center;font-weight:900;text-transform:uppercase;font-size:12px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:14px}.panel{padding:16px}.panelHead h2{text-transform:uppercase;color:#fff}.table{display:grid;gap:8px}.row{display:grid;grid-template-columns:70px minmax(0,1fr) 70px 80px 70px 90px;gap:8px;align-items:center;background:#050505;border:1px solid #242424;border-radius:14px;padding:10px}.row.head{color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}.row strong{color:#fff}.posts{display:grid;gap:10px}.post{background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.post h3{text-transform:uppercase}.post span{display:inline-flex;border-radius:999px;padding:6px 10px;background:#ffe600;color:#000;font-size:11px;font-weight:900;text-transform:uppercase}.empty{padding:16px;margin-bottom:14px}@media(max-width:1050px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.layout{grid-template-columns:1fr}.row{grid-template-columns:1fr}.toolbar button,.toolbar a{width:100%;text-align:center}.toolbar label{width:100%;justify-content:center}}`}</style>
    </div>
  );
}
