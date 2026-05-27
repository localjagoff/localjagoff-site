import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const CHECKLIST_KEY = "localJagoffPromoLaunchChecklist";
const CHECKLIST_DATE_KEY = "localJagoffPromoLaunchChecklistDate";
const QUEUE_KEY = "localJagoffPromoQueue";
const PERF_KEY = "localJagoffPromoPerformance";
const BANK_KEY = "localJagoffProductPromoBank";
const PRESETS_KEY = "localJagoffCampaignPresets";

const STEPS = [
  ["pick-preset", "Pick campaign direction", "Choose a preset or decide the product/platform angle before creating posts.", "/admin/promo-campaign-presets", "Open Presets"],
  ["build-week", "Create in Promo Studio", "Use Promo Studio for image posts, captions, video scripts, hooks, and campaign bundles.", "/admin/promo-generator", "Open Studio"],
  ["review-queue", "Review and approve queue", "Check product, platform, date, copy, and move good items to Approved.", "/admin/promo-queue", "Open Queue"],
  ["post-today", "Post approved plan", "Use Posting Board for Approved/Ready items only. Drafts and rejected items stay out of the posting flow.", "/admin/promo-posting-board", "Open Posting Board"],
  ["mark-posted", "Mark posted", "Paste the live post URL and mark items as Posted so Performance can track them.", "/admin/promo-posting-board", "Mark Posted"],
  ["track-performance", "Track performance", "Enter views, likes, comments, shares, clicks, sales, and notes.", "/admin/promo-performance", "Open Performance"],
  ["review-insights", "Review insights", "See best products, platforms, sources, and top posts.", "/admin/promo-insights", "Open Insights"],
  ["save-winners", "Save winners", "Save strong copy back to Promo Parts so Promo Studio can reuse what worked later.", "/admin/promo-product-bank", "Open Promo Parts"],
  ["backup", "Backup promo data", "Download a browser backup after a campaign batch.", "/admin/promo-backup", "Open Backup"],
  ["health-check", "Run health check", "Check and repair old or malformed browser data.", "/admin/promo-health", "Open Health"],
];

function readArray(key) {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function readChecklist() {
  if (typeof window === "undefined") return {};
  try { const parsed = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}

function writeChecklist(value) {
  if (typeof window !== "undefined") window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(value || {}));
}

function readChecklistDate() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CHECKLIST_DATE_KEY) || "";
}

function writeChecklistDate(value) {
  if (typeof window !== "undefined") window.localStorage.setItem(CHECKLIST_DATE_KEY, value || todayIso());
}

function todayIso() { return new Date().toISOString().slice(0, 10); }
function statusCount(queue, status) { return queue.filter((item) => (item.status || "Draft") === status).length; }

export default function PromoLaunchChecklist() {
  const [checked, setChecked] = useState({});
  const [checklistDate, setChecklistDate] = useState(todayIso());
  const [queue, setQueue] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [presets, setPresets] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const today = todayIso();
    const savedDate = readChecklistDate();

    if (savedDate && savedDate !== today) {
      writeChecklist({});
      writeChecklistDate(today);
      setChecked({});
      setChecklistDate(today);
      setMessage(`New day started. Checklist reset for ${today}.`);
    } else {
      if (!savedDate) writeChecklistDate(today);
      setChecked(readChecklist());
      setChecklistDate(savedDate || today);
    }

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
      ready: statusCount(queue, "Ready"),
      posted: statusCount(queue, "Posted"),
      tracked: performance.length,
      winners: performance.filter((item) => item.winner).length,
      productBank: productBank.length,
      presets: presets.length,
    };
  }, [checked, queue, performance, productBank, presets]);

  const toggleStep = (id) => {
    const today = todayIso();
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    setChecklistDate(today);
    writeChecklist(next);
    writeChecklistDate(today);
  };

  const reset = () => {
    const today = todayIso();
    setChecked({});
    setChecklistDate(today);
    writeChecklist({});
    writeChecklistDate(today);
    setMessage(`Checklist reset for ${today}.`);
  };

  const markDailyBasics = () => {
    const today = todayIso();
    const next = { ...checked };
    ["pick-preset", "build-week", "review-queue", "post-today", "mark-posted"].forEach((id) => { next[id] = true; });
    setChecked(next);
    setChecklistDate(today);
    writeChecklist(next);
    writeChecklistDate(today);
    setMessage("Daily basics marked complete.");
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Launch Checklist</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Launch Checklist</h1>
            <p>Simple daily workflow: pick direction, create in Promo Studio, review queue, post manually, track performance, save winners, backup.</p>
          </div>
          <div className="heroSide">
            <div className="datePill">{checklistDate}</div>
            <div className="heroActions">
              <button type="button" onClick={markDailyBasics}>Mark Daily Basics</button>
              <button type="button" className="secondary" onClick={reset}>Reset Today</button>
              <a href="/admin/promo-hub">Hub</a>
            </div>
          </div>
        </header>

        <section className="summary">
          <article className="bigStat"><strong>{stats.complete}/{stats.total}</strong><span>Complete</span></article>
          <article><strong>{stats.today}</strong><span>Today</span></article>
          <article><strong>{stats.ready}</strong><span>Ready</span></article>
          <article><strong>{stats.posted}</strong><span>Posted</span></article>
          <article><strong>{stats.tracked}</strong><span>Tracked</span></article>
          <article><strong>{stats.winners}</strong><span>Winners</span></article>
          <article><strong>{stats.presets}</strong><span>Presets</span></article>
          <article><strong>{stats.productBank}</strong><span>Promo Parts</span></article>
        </section>

        {message && <section className="message">{message}</section>}

        <section className="steps">
          {STEPS.map(([id, title, text, href, cta], index) => (
            <article key={id} className={`step ${checked[id] ? "done" : ""}`}>
              <button type="button" className="check" onClick={() => toggleStep(id)}>{checked[id] ? "✓" : index + 1}</button>
              <div><h2>{title}</h2><p>{text}</p></div>
              <a href={href}>{cta}</a>
            </article>
          ))}
        </section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1120px;margin:0 auto;padding-top:34px}.hero,.summary article,.message,.step{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start;padding:26px;margin-bottom:14px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase;margin:0 0 10px}.hero p{color:#ddd;line-height:1.55;max-width:850px}.heroSide{display:grid;gap:12px;justify-items:end}.datePill{display:inline-flex;border:1px solid rgba(255,230,0,.28);border-radius:999px;padding:8px 12px;color:#ffe600;background:#050505;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.heroActions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.heroActions button,.heroActions a,.step a{display:inline-flex;width:max-content;border:none;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none;cursor:pointer}.heroActions .secondary{background:#1b1b1b;color:#fff;border:1px solid #333}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:12px;margin-bottom:14px}.summary article{padding:16px;min-width:0}.summary .bigStat{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.summary strong{display:block;color:#ffe600;font-size:28px;line-height:1.1;overflow-wrap:anywhere}.summary span{display:block;margin-top:8px;color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.message{padding:14px;margin-bottom:14px;color:#ffe600;font-weight:900}.steps{display:grid;gap:12px}.step{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:16px}.step.done{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.check{width:46px;height:46px;border-radius:999px;border:1px solid rgba(255,230,0,.4);background:#050505;color:#ffe600;font-weight:900;font-size:18px;cursor:pointer}.step.done .check{background:#ffe600;color:#000}.step h2{margin:0;text-transform:uppercase;color:#ffe600}.step p{margin:6px 0 0;color:#ddd;line-height:1.5}@media(max-width:760px){.hero,.step{grid-template-columns:1fr}.heroSide,.heroActions{justify-items:stretch;justify-content:stretch}.heroActions button,.heroActions a,.step a{width:100%;justify-content:center}.check{width:100%}}`}</style>
    </div>
  );
}
