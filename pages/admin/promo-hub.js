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
  launchChecklist: "localJagoffPromoLaunchChecklist",
  launchChecklistDate: "localJagoffPromoLaunchChecklistDate",
};

const CHECKLIST_TOTAL = 10;
const STAT_LABELS = {
  checklist: "Checklist",
  today: "Today",
  ready: "Ready",
  queued: "Queued",
  posted: "Posted",
  performance: "Performance",
  winners: "Winners",
  presets: "Presets",
  productBank: "Promo Parts",
  saved: "Saved",
  memory: "Memory",
};

function todayIso() { return new Date().toISOString().slice(0, 10); }
function readArray(key) { if (typeof window === "undefined") return []; try { const value = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function readObject(key) { if (typeof window === "undefined") return {}; try { const value = JSON.parse(window.localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function readString(key) { if (typeof window === "undefined") return ""; return window.localStorage.getItem(key) || ""; }
function downloadJson(filename, data) { if (typeof document === "undefined") return; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function platformLabel(value) { const labels = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube_shorts: "YouTube Shorts", full_pack: "Full Pack" }; return labels[value] || value || "Platform"; }
function productName(item) { return item?.product?.name || item?.productName || "Promo item"; }

export default function PromoHub() {
  const [queue, setQueue] = useState([]);
  const [saved, setSaved] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [campaignPresets, setCampaignPresets] = useState([]);
  const [launchChecklist, setLaunchChecklist] = useState({});
  const [launchChecklistDate, setLaunchChecklistDate] = useState("");

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setSaved(readArray(KEYS.saved));
    setPhrases(readArray(KEYS.phrases));
    setProductBank(readArray(KEYS.productBank));
    setPerformance(readArray(KEYS.performance));
    setCampaignPresets(readArray(KEYS.campaignPresets));
    setLaunchChecklist(readObject(KEYS.launchChecklist));
    setLaunchChecklistDate(readString(KEYS.launchChecklistDate));
  }, []);

  const checklistComplete = Object.values(launchChecklist).filter(Boolean).length;
  const checklistIsToday = launchChecklistDate === todayIso();
  const todayItems = useMemo(() => queue.filter((item) => item.scheduledDate === todayIso()), [queue]);
  const todaySnapshot = useMemo(() => ({ total: todayItems.length, ready: todayItems.filter((item) => item.status === "Ready").length, draft: todayItems.filter((item) => (item.status || "Draft") === "Draft").length, posted: todayItems.filter((item) => item.status === "Posted").length, next: todayItems.slice(0, 5) }), [todayItems]);
  const stats = useMemo(() => ({ checklist: `${checklistComplete}/${CHECKLIST_TOTAL}`, today: todaySnapshot.total, ready: queue.filter((item) => item.status === "Ready").length, queued: queue.length, posted: queue.filter((item) => item.status === "Posted").length, performance: performance.length, winners: performance.filter((item) => item.winner).length, presets: campaignPresets.length, productBank: productBank.length, saved: saved.length, memory: phrases.length }), [queue, saved, phrases, productBank, performance, campaignPresets, checklistComplete, todaySnapshot.total]);
  const backupAll = () => downloadJson("local-jagoff-promo-backup.json", { exportedAt: new Date().toISOString(), queue, savedPacks: saved, recentPhrases: phrases, productBank, performance, campaignPresets, launchChecklist, launchChecklistDate });

  const cards = [
    ["Promo Builder", "/admin/promo-builder", "Build a clean Facebook or Instagram post from selected parts. This is the best place to create one finished post.", "Open Builder", true],
    ["Posting Board", "/admin/promo-posting-board", "Daily posting screen. Copy clean parts, paste live URLs, and mark posts Posted.", "Open Posting Board", true],
    ["Performance Tracker", "/admin/promo-performance", "Track post metrics, mark winners, and save winning copy back to Promo Parts.", "Open Performance", true],
    ["Launch Checklist", "/admin/promo-launch-checklist", "Run the promo workflow in order: preset, build, queue, post, track, learn, backup.", "Open Checklist", true],
    ["Promo Insights", "/admin/promo-insights", "See best platforms, products, sources, winner rate, and top scoring copy.", "Open Insights", true],
    ["Campaign Presets", "/admin/promo-campaign-presets", "Save reusable campaign strategies and send them into the workflow.", "Open Presets", true],
    ["Promo Generator", "/admin/promo-generator", "Create AI or free promo packs, holiday campaigns, captions, scripts, links, and bundles.", "Open Generator"],
    ["Week Builder", "/admin/promo-week-builder", "Build a full week or month of promo drafts and push them into the queue.", "Open Week Builder"],
    ["Queue Manager", "/admin/promo-queue", "Review, approve, schedule, copy, export, and clean up queued promo drafts.", "Open Queue"],
    ["Promo Calendar", "/admin/promo-calendar", "See scheduled promos by date, status, and platform.", "Open Calendar"],
    ["Saved Library", "/admin/promo-library", "Search saved promo packs and copy the platform bundle you need.", "Open Library"],
    ["Promo Parts", "/admin/promo-product-bank", "Save approved captions, hooks, CTAs, overlays, and notes by product.", "Open Promo Parts"],
    ["Parts Repair", "/admin/promo-bank-repair", "Repair older Promo Parts entries that are missing product IDs, images, or categories.", "Open Parts Repair"],
    ["System Health", "/admin/promo-health", "Check, repair, and export browser-stored promo data health.", "Open Health"],
    ["Backup / Restore", "/admin/promo-backup", "Export or restore browser-stored promo data.", "Open Backup"],
  ];

  return <div className="page"><Head><title>Local Jagoff Promo Hub</title><meta name="robots" content="noindex,nofollow" /></Head><PromoAdminNav /><main className="wrap"><header className="hero"><p className="kicker">LOCAL JAGOFF ADMIN</p><h1>Promo Hub</h1><p>One landing page for the Local Jagoff promo workflow: checklist, builder, presets, create, queue, post manually, track performance, promo parts, export, and restore.</p><div className="builderCallout"><div><p className="kicker">START HERE</p><strong>Use Promo Builder for clean Facebook / Instagram posts.</strong><span>It gives you picked parts, clean preview, and clean copy before anything goes to the Posting Board.</span></div><a href="/admin/promo-builder">Open Promo Builder</a></div><div className={`checklistBanner ${checklistIsToday ? "today" : "stale"}`}><div><p className="kicker">DAILY CHECKLIST</p><strong>{checklistComplete}/{CHECKLIST_TOTAL} complete</strong><span>{launchChecklistDate ? `Saved date: ${launchChecklistDate}` : "No checklist date saved yet"}{checklistIsToday ? " • today" : " • needs today reset"}</span></div><a href="/admin/promo-launch-checklist">Open Checklist</a></div><div className="heroActions"><a href="/admin/promo-builder">Open Builder</a><a href="/admin/promo-posting-board">Open Posting Board</a><a href="/admin/promo-performance">Open Performance</a><a href="/admin/promo-generator">Open Generator</a><button type="button" onClick={backupAll}>Download Full Backup</button></div></header><section className="stats">{Object.entries(stats).map(([key,value])=><div key={key}><strong>{value}</strong><span>{STAT_LABELS[key] || key}</span></div>)}</section><section className="todayPanel"><div className="todayHead"><div><p className="kicker">TODAY SNAPSHOT</p><h2>{todayIso()}</h2><p>{todaySnapshot.total} scheduled today • {todaySnapshot.ready} ready • {todaySnapshot.draft} draft • {todaySnapshot.posted} posted</p></div><div className="todayActions"><a href="/admin/promo-posting-board">Open Posting Board</a><a href="/admin/promo-queue">Open Queue</a></div></div>{todaySnapshot.next.length === 0 ? <div className="emptyToday">No promos scheduled for today yet.</div> : <div className="todayList">{todaySnapshot.next.map((item, index) => <article key={item.queueId || item.id || index}><strong>{productName(item)}</strong><span>{platformLabel(item.scheduledPlatform || item.displayPlatform || item.platform)} • {item.status || "Draft"}</span></article>)}</div>}</section><section className="flow"><p className="kicker">DAILY FLOW</p><strong>Launch Checklist → Promo Builder → Posting Board → Posted → Performance → Save Winners to Promo Parts</strong><p>No auto-posting yet. Builder gives you controlled pick-your-parts posts, while Posting Board keeps the manual posting flow clean.</p></section><section className="cards">{cards.map(([title,href,text,cta,featured])=><a key={href} className={`card ${featured?"featured":""}`} href={href}><h2>{title}</h2><p>{text}</p><span>{cta}</span></a>)}</section></main><style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1220px;margin:0 auto;padding-top:38px}.hero,.flow,.todayPanel{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:28px;box-shadow:0 22px 80px rgba(0,0,0,.45);margin-bottom:16px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}h1{font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}p{color:#d6d6d6;line-height:1.6}.builderCallout,.checklistBanner{display:flex;justify-content:space-between;gap:14px;align-items:center;margin:18px 0;padding:16px;border-radius:20px;background:#050505;border:1px solid rgba(255,230,0,.34)}.builderCallout{background:linear-gradient(135deg,rgba(255,230,0,.16),rgba(5,5,5,.96));border-color:#ffe600}.builderCallout strong,.checklistBanner strong{display:block;color:#ffe600;font-size:26px;text-transform:uppercase}.builderCallout span,.checklistBanner span{display:block;color:#ddd;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}.checklistBanner.today{border-color:rgba(80,255,140,.42)}.checklistBanner.stale{border-color:rgba(255,230,0,.5)}.builderCallout a,.checklistBanner a,.todayActions a{display:inline-flex;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none;white-space:nowrap}.heroActions{display:flex;gap:10px;flex-wrap:wrap}.heroActions a,button,.card span{display:inline-flex;width:max-content;margin-top:10px;border:none;border-radius:14px;background:#ffe600;color:#000;padding:13px 16px;font-weight:900;text-decoration:none;cursor:pointer}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}.stats div,.card,.todayList article,.emptyToday{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px;line-height:1.1;overflow-wrap:anywhere}.stats span{display:block;margin-top:8px;color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;white-space:normal;overflow-wrap:anywhere}.todayHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.todayHead h2{margin:0;color:#ffe600;font-size:34px;text-transform:uppercase}.todayActions{display:flex;gap:10px;flex-wrap:wrap}.todayList{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:14px}.todayList strong,.todayList span{display:block}.todayList strong{color:#fff;text-transform:uppercase;font-size:14px}.todayList span{margin-top:8px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}.emptyToday{margin-top:14px;color:#ddd;text-align:center}.flow strong{display:block;color:#ffe600;font-size:20px;line-height:1.35}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.card{display:block;color:#fff;text-decoration:none}.card.featured{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.card h2{text-transform:uppercase;color:#ffe600}.card:hover{border-color:#ffe600;transform:translateY(-1px)}@media(max-width:800px){.builderCallout,.checklistBanner,.todayHead{display:grid}.builderCallout a,.checklistBanner a,.todayActions a,.heroActions a,.heroActions button{width:100%;text-align:center;justify-content:center}}`}</style></div>;
}
