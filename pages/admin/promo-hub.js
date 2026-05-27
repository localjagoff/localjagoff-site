import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const KEYS = {
  queue: "localJagoffPromoQueue",
  productBank: "localJagoffProductPromoBank",
  performance: "localJagoffPromoPerformance",
  campaignPresets: "localJagoffCampaignPresets",
  launchChecklist: "localJagoffPromoLaunchChecklist",
  launchChecklistDate: "localJagoffPromoLaunchChecklistDate",
};

const CHECKLIST_TOTAL = 10;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readArray(key) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readObject(key) {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function readString(key) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
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

function platformLabel(value) {
  const labels = {
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube_shorts: "YouTube Shorts",
    full_pack: "Full Pack",
  };
  return labels[value] || value || "Platform";
}

function productName(item) {
  return item?.product?.name || item?.productName || "Promo item";
}

export default function PromoHub() {
  const [queue, setQueue] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [campaignPresets, setCampaignPresets] = useState([]);
  const [launchChecklist, setLaunchChecklist] = useState({});
  const [launchChecklistDate, setLaunchChecklistDate] = useState("");

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setProductBank(readArray(KEYS.productBank));
    setPerformance(readArray(KEYS.performance));
    setCampaignPresets(readArray(KEYS.campaignPresets));
    setLaunchChecklist(readObject(KEYS.launchChecklist));
    setLaunchChecklistDate(readString(KEYS.launchChecklistDate));
  }, []);

  const checklistComplete = Object.values(launchChecklist).filter(Boolean).length;
  const checklistIsToday = launchChecklistDate === todayIso();

  const todayItems = useMemo(() => queue.filter((item) => item.scheduledDate === todayIso()), [queue]);
  const todaySnapshot = useMemo(() => ({
    total: todayItems.length,
    ready: todayItems.filter((item) => item.status === "Ready").length,
    draft: todayItems.filter((item) => (item.status || "Draft") === "Draft").length,
    posted: todayItems.filter((item) => item.status === "Posted").length,
    next: todayItems.slice(0, 5),
  }), [todayItems]);

  const stats = [
    ["Checklist", `${checklistComplete}/${CHECKLIST_TOTAL}`],
    ["Today", todaySnapshot.total],
    ["Ready", queue.filter((item) => item.status === "Ready").length],
    ["Queued", queue.length],
    ["Posted", queue.filter((item) => item.status === "Posted").length],
    ["Performance", performance.length],
    ["Winners", performance.filter((item) => item.winner).length],
    ["Presets", campaignPresets.length],
    ["Promo Parts", productBank.length],
  ];

  const cards = [
    ["Promo Studio", "/admin/promo-generator", "Create promo packs, image-post copy, captions, video scripts, hooks, links, and bundles from one main creation screen.", "Open Studio", true],
    ["Posting Board", "/admin/promo-posting-board", "Copy clean posts, paste live post URLs, and mark posts as Posted.", "Open Posting Board", true],
    ["Performance", "/admin/promo-performance", "Track post metrics, keep the Meta tracking path, and save winners to Promo Parts.", "Open Performance", true],
    ["Launch Checklist", "/admin/promo-launch-checklist", "Run the workflow in order: checklist, Studio, queue, post, track, and learn.", "Open Checklist", true],
    ["Campaign Presets", "/admin/promo-campaign-presets", "Save reusable strategies that feed Promo Studio.", "Open Presets"],
    ["Queue", "/admin/promo-queue", "Review, approve, schedule, copy, export, and clean queued drafts.", "Open Queue"],
    ["Week Builder", "/admin/promo-week-builder", "Build a full week or month of promo drafts and push them to the queue.", "Open Week Builder"],
    ["Promo Parts", "/admin/promo-product-bank", "Save approved captions, hooks, CTAs, overlays, and notes by product.", "Open Promo Parts"],
    ["Insights", "/admin/promo-insights", "Review best platforms, products, winner rate, and top copy.", "Open Insights"],
    ["Calendar", "/admin/promo-calendar", "See scheduled promos by date, status, and platform.", "Open Calendar"],
    ["Health", "/admin/promo-health", "Check and repair browser-stored promo data.", "Open Health"],
    ["Backup", "/admin/promo-backup", "Export or restore browser-stored promo data.", "Open Backup"],
  ];

  const backupAll = () => downloadJson("local-jagoff-promo-backup.json", {
    exportedAt: new Date().toISOString(),
    queue,
    productBank,
    performance,
    campaignPresets,
    launchChecklist,
    launchChecklistDate,
  });

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Promo Hub</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <p className="kicker">LOCAL JAGOFF ADMIN</p>
          <h1>Promo Hub</h1>
          <p>
            One landing page for the promo workflow: Promo Studio, queue, manual posting,
            live post URLs, performance tracking, Promo Parts, health, and backups.
          </p>

          <div className="callout">
            <div>
              <p className="kicker">START HERE</p>
              <strong>Promo Studio is the one creation tool.</strong>
              <span>Facebook and Instagram focus on image/post copy. TikTok and YouTube Shorts focus on scripts, hooks, captions, and shot lists.</span>
            </div>
            <a href="/admin/promo-generator">Open Promo Studio</a>
          </div>

          <div className={`checklist ${checklistIsToday ? "today" : "stale"}`}>
            <div>
              <p className="kicker">DAILY CHECKLIST</p>
              <strong>{checklistComplete}/{CHECKLIST_TOTAL} complete</strong>
              <span>{launchChecklistDate ? `Saved date: ${launchChecklistDate}` : "No checklist date saved yet"}{checklistIsToday ? " • today" : " • needs today reset"}</span>
            </div>
            <a href="/admin/promo-launch-checklist">Open Checklist</a>
          </div>

          <div className="actions">
            <a href="/admin/promo-generator">Open Promo Studio</a>
            <a href="/admin/promo-posting-board">Open Posting Board</a>
            <a href="/admin/promo-performance">Open Performance</a>
            <button type="button" onClick={backupAll}>Download Backup</button>
          </div>
        </header>

        <section className="stats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="todayPanel">
          <div className="todayHead">
            <div>
              <p className="kicker">TODAY SNAPSHOT</p>
              <h2>{todayIso()}</h2>
              <p>{todaySnapshot.total} scheduled today • {todaySnapshot.ready} ready • {todaySnapshot.draft} draft • {todaySnapshot.posted} posted</p>
            </div>
            <div className="actions slim">
              <a href="/admin/promo-posting-board">Posting Board</a>
              <a href="/admin/promo-queue">Queue</a>
            </div>
          </div>

          {todaySnapshot.next.length === 0 ? (
            <div className="emptyToday">No promos scheduled for today yet.</div>
          ) : (
            <div className="todayList">
              {todaySnapshot.next.map((item, index) => (
                <article key={item.queueId || item.id || index}>
                  <strong>{productName(item)}</strong>
                  <span>{platformLabel(item.scheduledPlatform || item.displayPlatform || item.platform)} • {item.status || "Draft"}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="flow">
          <p className="kicker">DAILY FLOW</p>
          <strong>Launch Checklist → Promo Studio → Posting Board → Posted → Performance → Save Winners to Promo Parts</strong>
          <p>Promo Studio creates the content. Posting Board keeps manual posting clean. Performance keeps the Meta tracking path intact.</p>
        </section>

        <section className="cards">
          {cards.map(([title, href, text, cta, featured]) => (
            <a key={href} className={`card ${featured ? "featured" : ""}`} href={href}>
              <h2>{title}</h2>
              <p>{text}</p>
              <span>{cta}</span>
            </a>
          ))}
        </section>
      </main>

      <style jsx>{`
        .page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}
        .wrap{max-width:1220px;margin:0 auto;padding-top:38px}
        .hero,.flow,.todayPanel{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:28px;box-shadow:0 22px 80px rgba(0,0,0,.45);margin-bottom:16px}
        .kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
        h1{font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}
        p{color:#d6d6d6;line-height:1.6}
        .callout,.checklist{display:flex;justify-content:space-between;gap:14px;align-items:center;margin:18px 0;padding:16px;border-radius:20px;background:#050505;border:1px solid rgba(255,230,0,.34)}
        .callout{background:linear-gradient(135deg,rgba(255,230,0,.16),rgba(5,5,5,.96));border-color:#ffe600}
        .callout strong,.checklist strong{display:block;color:#ffe600;font-size:26px;text-transform:uppercase}
        .callout span,.checklist span{display:block;color:#ddd;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;line-height:1.5}
        .checklist.today{border-color:rgba(80,255,140,.42)}
        .checklist.stale{border-color:rgba(255,230,0,.5)}
        .callout a,.checklist a,.actions a,.actions button,.card span{display:inline-flex;border:none;border-radius:14px;background:#ffe600;color:#000;padding:12px 14px;font-weight:900;text-decoration:none;white-space:nowrap;cursor:pointer}
        .actions{display:flex;gap:10px;flex-wrap:wrap}
        .actions.slim{justify-content:flex-end}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
        .stats div,.card,.todayList article,.emptyToday{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}
        .stats strong{display:block;color:#ffe600;font-size:30px;line-height:1.1;overflow-wrap:anywhere}
        .stats span{display:block;margin-top:8px;color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
        .todayHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
        .todayHead h2{margin:0;color:#ffe600;font-size:34px;text-transform:uppercase}
        .todayList{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:14px}
        .todayList strong,.todayList span{display:block}
        .todayList strong{color:#fff;text-transform:uppercase;font-size:14px}
        .todayList span{margin-top:8px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}
        .emptyToday{margin-top:14px;color:#ddd;text-align:center}
        .flow strong{display:block;color:#ffe600;font-size:20px;line-height:1.35}
        .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
        .card{display:block;color:#fff;text-decoration:none}
        .card.featured{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}
        .card h2{text-transform:uppercase;color:#ffe600}
        .card:hover{border-color:#ffe600;transform:translateY(-1px)}
        @media(max-width:800px){.callout,.checklist,.todayHead{display:grid}.callout a,.checklist a,.actions a,.actions button{width:100%;justify-content:center;text-align:center}.actions.slim{justify-content:stretch}}
      `}</style>
    </div>
  );
}
