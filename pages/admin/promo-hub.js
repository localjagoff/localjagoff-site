import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const KEYS = {
  queue: "localJagoffPromoQueue",
  productBank: "localJagoffProductPromoBank",
  performance: "localJagoffPromoPerformance",
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

function nextStep({ ready, posted, tracked, checklistComplete }) {
  if (ready > 0 && posted === 0) return ["Post today's ready item", "/admin/promo-posting-board", "Open Posting Board"];
  if (posted > tracked) return ["Track posted items", "/admin/promo-performance", "Open Performance"];
  if (checklistComplete < CHECKLIST_TOTAL) return ["Run checklist", "/admin/promo-launch-checklist", "Open Checklist"];
  return ["Create next promo", "/admin/promo-generator", "Open Promo Studio"];
}

export default function PromoHub() {
  const [queue, setQueue] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [launchChecklist, setLaunchChecklist] = useState({});
  const [launchChecklistDate, setLaunchChecklistDate] = useState("");

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setProductBank(readArray(KEYS.productBank));
    setPerformance(readArray(KEYS.performance));
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
    next: todayItems.slice(0, 4),
  }), [todayItems]);

  const trackedToday = performance.filter((item) => String(item.createdAt || item.trackedAt || "").slice(0, 10) === todayIso()).length;
  const [stepTitle, stepHref, stepCta] = nextStep({
    ready: todaySnapshot.ready,
    posted: todaySnapshot.posted,
    tracked: trackedToday,
    checklistComplete,
  });

  const primaryCards = [
    ["Promo Studio", "/admin/promo-generator", "Create posts, captions, video scripts, hooks, and queue drafts."],
    ["Posting Board", "/admin/promo-posting-board", "Copy posts, paste live URLs, and mark Posted."],
    ["Performance", "/admin/promo-performance", "Track results and save winners back to Promo Parts."],
  ];

  const utilityCards = [
    ["Checklist", "/admin/promo-launch-checklist"],
    ["Queue", "/admin/promo-queue"],
    ["Promo Parts", "/admin/promo-product-bank"],
    ["Presets", "/admin/promo-campaign-presets"],
    ["Insights", "/admin/promo-insights"],
    ["Health", "/admin/promo-health"],
    ["Backup", "/admin/promo-backup"],
  ];

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Promo Hub</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">LOCAL JAGOFF ADMIN</p>
            <h1>Promo Hub</h1>
            <p>Dashboard for the daily promo workflow. Create in Promo Studio, post from Posting Board, then track performance.</p>
          </div>
          <a className="nextStep" href={stepHref}>
            <span>Next step</span>
            <strong>{stepTitle}</strong>
            <em>{stepCta}</em>
          </a>
        </header>

        <section className="statusGrid">
          <article className={checklistIsToday ? "good" : "warn"}>
            <strong>{checklistComplete}/{CHECKLIST_TOTAL}</strong>
            <span>Checklist</span>
            <small>{checklistIsToday ? "Today" : "Needs reset"}</small>
          </article>
          <article>
            <strong>{todaySnapshot.ready}</strong>
            <span>Ready</span>
            <small>Ready to post</small>
          </article>
          <article>
            <strong>{todaySnapshot.posted}</strong>
            <span>Posted</span>
            <small>Marked posted</small>
          </article>
          <article>
            <strong>{trackedToday}</strong>
            <span>Tracked</span>
            <small>Performance today</small>
          </article>
          <article>
            <strong>{productBank.length}</strong>
            <span>Promo Parts</span>
            <small>Reusable winners</small>
          </article>
        </section>

        <section className="primaryFlow">
          {primaryCards.map(([title, href, text]) => (
            <a key={href} href={href}>
              <h2>{title}</h2>
              <p>{text}</p>
              <span>Open</span>
            </a>
          ))}
        </section>

        <section className="todayPanel">
          <div className="todayHead">
            <div>
              <p className="kicker">TODAY</p>
              <h2>{todayIso()}</h2>
              <p>{todaySnapshot.total} scheduled • {todaySnapshot.ready} ready • {todaySnapshot.draft} draft • {todaySnapshot.posted} posted</p>
            </div>
            <div className="actions">
              <a href="/admin/promo-posting-board">Posting Board</a>
              <a href="/admin/promo-generator">Create More</a>
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

        <section className="utilityPanel">
          <div>
            <p className="kicker">MORE TOOLS</p>
            <h2>Maintenance & Planning</h2>
          </div>
          <div className="utilityLinks">
            {utilityCards.map(([title, href]) => (
              <a key={href} href={href}>{title}</a>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}
        .wrap{max-width:1160px;margin:0 auto;padding-top:34px}
        .hero,.todayPanel,.utilityPanel,.statusGrid article,.primaryFlow a,.todayList article,.emptyToday{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:24px;box-shadow:0 22px 80px rgba(0,0,0,.42)}
        .hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:stretch;padding:28px;margin-bottom:14px}
        .kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
        h1{margin:0 0 12px;font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}
        h2{margin:0;color:#ffe600;text-transform:uppercase}
        p{color:#d6d6d6;line-height:1.6}
        .nextStep{display:grid;align-content:center;gap:8px;border:1px solid #ffe600;border-radius:22px;padding:18px;background:linear-gradient(135deg,rgba(255,230,0,.18),rgba(5,5,5,.96));color:#fff;text-decoration:none}
        .nextStep span,.nextStep em{color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;font-style:normal}
        .nextStep strong{font-size:24px;line-height:1.1;text-transform:uppercase}
        .statusGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}
        .statusGrid article{padding:16px;min-width:0}
        .statusGrid article.good{border-color:rgba(154,255,183,.35)}
        .statusGrid article.warn{border-color:rgba(255,230,0,.55)}
        .statusGrid strong{display:block;color:#ffe600;font-size:32px;line-height:1.1;overflow-wrap:anywhere}
        .statusGrid span{display:block;margin-top:8px;color:#fff;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
        .statusGrid small{display:block;margin-top:5px;color:#aaa;font-size:12px}
        .primaryFlow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:14px}
        .primaryFlow a{display:block;padding:20px;color:#fff;text-decoration:none}
        .primaryFlow p{min-height:54px;margin-bottom:14px}
        .primaryFlow span,.actions a,.utilityLinks a{display:inline-flex;border-radius:14px;background:#ffe600;color:#000;padding:11px 14px;font-weight:900;text-decoration:none;text-transform:uppercase}
        .todayPanel,.utilityPanel{padding:22px;margin-bottom:14px}
        .todayHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
        .todayHead h2{font-size:34px}
        .actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .todayList{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:14px}
        .todayList article,.emptyToday{padding:16px}
        .todayList strong,.todayList span{display:block}
        .todayList strong{color:#fff;text-transform:uppercase;font-size:14px}
        .todayList span{margin-top:8px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}
        .emptyToday{margin-top:14px;color:#ddd;text-align:center}
        .utilityPanel{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:center}
        .utilityLinks{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .utilityLinks a{background:#1b1b1b;color:#fff;border:1px solid #333}
        @media(max-width:920px){.hero,.primaryFlow,.utilityPanel{grid-template-columns:1fr}.statusGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.utilityLinks,.actions{justify-content:flex-start}.todayHead{display:grid}.nextStep,.actions a,.utilityLinks a{width:100%;justify-content:center;text-align:center}}
        @media(max-width:520px){.statusGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
