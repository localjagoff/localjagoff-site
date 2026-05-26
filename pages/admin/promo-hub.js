import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const KEYS = {
  queue: "localJagoffPromoQueue",
  saved: "localJagoffSavedPromoPacks",
  phrases: "localJagoffRecentPromoPhrases",
  productBank: "localJagoffProductPromoBank",
  performance: "localJagoffPromoPerformance",
  campaignPresets: "localJagoffCampaignPresets",
};

function todayIso() { return new Date().toISOString().slice(0, 10); }
function readArray(key) {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function downloadJson(filename, data) {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PromoHub() {
  const [queue, setQueue] = useState([]);
  const [saved, setSaved] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [campaignPresets, setCampaignPresets] = useState([]);

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setSaved(readArray(KEYS.saved));
    setPhrases(readArray(KEYS.phrases));
    setProductBank(readArray(KEYS.productBank));
    setPerformance(readArray(KEYS.performance));
    setCampaignPresets(readArray(KEYS.campaignPresets));
  }, []);

  const stats = useMemo(() => {
    const today = todayIso();
    return {
      today: queue.filter((item) => item.scheduledDate === today).length,
      ready: queue.filter((item) => item.status === "Ready").length,
      queued: queue.length,
      posted: queue.filter((item) => item.status === "Posted").length,
      performance: performance.length,
      winners: performance.filter((item) => item.winner).length,
      presets: campaignPresets.length,
      productBank: productBank.length,
      saved: saved.length,
      memory: phrases.length,
    };
  }, [queue, saved, phrases, productBank, performance, campaignPresets]);

  const backupAll = () => downloadJson("local-jagoff-promo-backup.json", {
    exportedAt: new Date().toISOString(), queue, savedPacks: saved, recentPhrases: phrases, productBank, performance, campaignPresets,
  });

  const cards = [
    ["Launch Checklist", "/admin/promo-launch-checklist", "Run the promo workflow in order: preset, build, queue, post, track, learn, backup.", "Open Checklist", true],
    ["Posting Board", "/admin/promo-posting-board", "Daily posting screen. Copy clean platform bundles, open product pages, and mark posts Ready or Posted.", "Open Posting Board", true],
    ["Performance Tracker", "/admin/promo-performance", "Track post metrics, mark winners, and save winning copy back to the Product Bank.", "Open Performance", true],
    ["Promo Insights", "/admin/promo-insights", "See best platforms, products, sources, winner rate, and top scoring copy.", "Open Insights", true],
    ["Campaign Presets", "/admin/promo-campaign-presets", "Save reusable campaign strategies and send them straight into Week Builder.", "Open Presets", true],
    ["Promo Generator", "/admin/promo-generator", "Create AI or free promo packs, holiday campaigns, captions, scripts, links, and bundles.", "Open Generator"],
    ["Week Builder", "/admin/promo-week-builder", "Build a full week or month of promo drafts and push them into the queue.", "Open Week Builder"],
    ["Queue Manager", "/admin/promo-queue", "Filter, edit, copy, export, and clean up queued promo drafts.", "Open Queue"],
    ["Promo Calendar", "/admin/promo-calendar", "See scheduled promos by date, status, and platform.", "Open Calendar"],
    ["Saved Library", "/admin/promo-library", "Search saved promo packs and copy the platform bundle you need.", "Open Library"],
    ["Product Bank", "/admin/promo-product-bank", "Save approved captions, hooks, CTAs, overlays, and notes by product.", "Open Product Bank"],
    ["Bank Repair", "/admin/promo-bank-repair", "Repair older Product Bank entries that are missing product IDs, images, or categories.", "Open Bank Repair"],
    ["System Health", "/admin/promo-health", "Check, repair, and export browser-stored promo data health.", "Open Health"],
    ["Backup / Restore", "/admin/promo-backup", "Export or restore browser-stored promo data.", "Open Backup"],
  ];

  return <div className="page"><Head><title>Local Jagoff Promo Hub</title><meta name="robots" content="noindex,nofollow" /></Head><PromoAdminNav /><main className="wrap"><header className="hero"><p className="kicker">LOCAL JAGOFF ADMIN</p><h1>Promo Hub</h1><p>One landing page for the Local Jagoff promo workflow: checklist, presets, create, queue, post manually, track performance, product bank, export, and restore.</p><div className="heroActions"><a href="/admin/promo-launch-checklist">Open Checklist</a><a href="/admin/promo-posting-board">Open Posting Board</a><a href="/admin/promo-performance">Open Performance</a><a href="/admin/promo-insights">Open Insights</a><button type="button" onClick={backupAll}>Download Full Backup</button></div></header><section className="stats">{Object.entries(stats).map(([key,value])=><div key={key}><strong>{value}</strong><span>{key}</span></div>)}</section><section className="flow"><p className="kicker">DAILY FLOW</p><strong>Launch Checklist → Campaign Presets → Week Builder → Queue → Posting Board → Mark Posted → Performance → Insights → Save Winners to Product Bank</strong><p>No auto-posting yet. The checklist keeps the workflow tight so the system actually gets used the same way every campaign.</p></section><section className="cards">{cards.map(([title,href,text,cta,featured])=><a key={href} className={`card ${featured?"featured":""}`} href={href}><h2>{title}</h2><p>{text}</p><span>{cta}</span></a>)}</section></main><style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1160px;margin:0 auto;padding-top:38px}.hero,.flow{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:28px;box-shadow:0 22px 80px rgba(0,0,0,.45);margin-bottom:16px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}h1{font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}p{color:#d6d6d6;line-height:1.6}.heroActions{display:flex;gap:10px;flex-wrap:wrap}.heroActions a,button,.card span{display:inline-flex;width:max-content;margin-top:10px;border:none;border-radius:14px;background:#ffe600;color:#000;padding:13px 16px;font-weight:900;text-decoration:none;cursor:pointer}.stats{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats div,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.flow strong{display:block;color:#ffe600;font-size:20px;line-height:1.35}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{display:block;color:#fff;text-decoration:none}.card.featured{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.card h2{text-transform:uppercase;color:#ffe600}.card:hover{border-color:#ffe600;transform:translateY(-1px)}@media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:800px){.cards{grid-template-columns:1fr}.heroActions a,.heroActions button{width:100%;text-align:center;justify-content:center}}`}</style></div>;
}
