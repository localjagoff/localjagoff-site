import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const CHECKLIST_KEY = "localJagoffPromoLaunchChecklist";
const QUEUE_KEY = "localJagoffPromoQueue";
const PERF_KEY = "localJagoffPromoPerformance";
const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";

const STEPS = [
  ["pick-preset", "Pick campaign preset", "Choose the strategy before building posts.", "/admin/promo-campaign-presets", "Open Presets"],
  ["build-week", "Build campaign run", "Use Week Builder or Generator to create drafts.", "/admin/promo-week-builder", "Open Week Builder"],
  ["review-queue", "Review queue", "Check product, platform, date, and copy.", "/admin/promo-queue", "Open Queue"],
  ["post-today", "Post today's plan", "Use Posting Board to copy clean platform bundles.", "/admin/promo-posting-board", "Open Posting Board"],
  ["mark-posted", "Mark posted", "Mark posted items so Performance can sync them.", "/admin/promo-posting-board", "Mark Posted"],
  ["track-performance", "Track performance", "Enter views, likes, comments, shares, clicks, sales, and notes.", "/admin/promo-performance", "Open Performance"],
  ["review-insights", "Review insights", "See best products, platforms, sources, and top posts.", "/admin/promo-insights", "Open Insights"],
  ["save-winners", "Save winners", "Save strong copy back to Product Bank.", "/admin/promo-product-bank", "Open Product Bank"],
  ["backup", "Backup promo data", "Download a browser backup after a campaign batch.", "/admin/promo-backup", "Open Backup"],
  ["health-check", "Run health check", "Check and repair old or malformed browser data.", "/admin/promo-health", "Open Health"],
];

function readArray(key) {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function readChecklist() {
  if (typeof window === "undefined") return {};
  try { const parsed = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) || "{}"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; }
}

function writeChecklist(value) {
  if (typeof window !== "undefined") window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(value || {}));
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function PromoLaunchChecklist() {
  const [checked, setChecked] = useState({});
  const [queue, setQueue] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [presets, setPresets] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setChecked(readChecklist());
    setQueue(readArray(QUEUE_KEY));
    setPerformance(readArray(PERF_KEY));
    setProductBank(readArray(BANK_KEY));
    setPresets(readArray(PRESETS_KEY));
  }, []);

  const stats = useMemo(() => {
    const today = todayIso();
    return {
      complete: STEPS.filter(([id]) => checked[id]).length,
      total: STEPS.length,
      today: queue.filter((item) => item.scheduledDate === today).length,
      ready: queue.filter((item) => item.status === "Ready").length,
      draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
      posted: queue.filter((item) => item.status === "Posted").length,
      tracked: performance.length,
      winners: performance.filter((item) => item.winner).length,
      productBank: productBank.length,
      presets: presets.length,
    };
  }, [checked, queue, performance, productBank, presets]);

  const toggleStep = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    writeChecklist(next);
  };

  const reset = () => { setChecked({}); writeChecklist({}); setMessage("Checklist reset."); };

  const markDailyBasics = () => {
    const next = { ...checked };
    ["pick-preset", "build-week", "review-queue", "post-today", "mark-posted"].forEach((id) => { next[id] = true; });
    setChecked(next);
    writeChecklist(next);
    setMessage("Daily basics marked complete.");
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Launch Checklist</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero"><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Launch Checklist</h1><p>A simple operating checklist for the promo workflow: plan, build, post, track, learn, backup.</p><div className="heroActions"><button type="button" onClick={markDailyBasics}>Mark Daily Basics</button><button type="button" onClick={reset}>Reset</button><a href="/admin/promo-hub">Back to Hub</a></div></header>
        <section className="stats"><div><strong>{stats.complete}/{stats.total}</strong><span>Complete</span></div><div><strong>{stats.today}</strong><span>Today</span></div><div><strong>{stats.ready}</strong><span>Ready</span></div><div><strong>{stats.draft}</strong><span>Draft</span></div><div><strong>{stats.posted}</strong><span>Posted</span></div><div><strong>{stats.tracked}</strong><span>Tracked</span></div><div><strong>{stats.winners}</strong><span>Winners</span></div><div><strong>{stats.presets}</strong><span>Presets</span></div><div><strong>{stats.productBank}</strong><span>Bank</span></div></section>
        {message && <section className="message">{message}</section>}
        <section className="steps">{STEPS.map(([id, title, text, href, cta], index) => <article key={id} className={`step ${checked[id] ? "done" : ""}`}><button type="button" className="check" onClick={() => toggleStep(id)}>{checked[id] ? "✓" : index + 1}</button><div><h2>{title}</h2><p>{text}</p></div><a href={href}>{cta}</a></article>)}</section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1120px;margin:0 auto;padding-top:34px}.hero,.stats div,.message,.step{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:26px;margin-bottom:14px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p{color:#ddd;line-height:1.55}.heroActions{display:flex;gap:10px;flex-wrap:wrap}.heroActions button,.heroActions a,.step a{display:inline-flex;width:max-content;border:none;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none;cursor:pointer}.heroActions button:nth-child(2){background:#1b1b1b;color:#fff;border:1px solid #333}.stats{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div{padding:16px}.stats strong{display:block;color:#ffe600;font-size:28px}.stats span{color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.message{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.steps{display:grid;gap:12px}.step{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:16px}.step.done{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.check{width:46px;height:46px;border-radius:999px;border:1px solid rgba(255,230,0,.4);background:#050505;color:#ffe600;font-weight:900;font-size:18px;cursor:pointer}.step.done .check{background:#ffe600;color:#000}.step h2{margin:0;text-transform:uppercase;color:#ffe600}.step p{margin:6px 0 0;color:#ddd;line-height:1.5}@media(max-width:1050px){.stats{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.stats,.step{grid-template-columns:1fr}.heroActions button,.heroActions a,.step a{width:100%;justify-content:center}.check{width:100%}}`}</style>
    </div>
  );
}
