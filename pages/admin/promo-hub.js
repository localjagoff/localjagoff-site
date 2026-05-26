import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const KEYS = {
  queue: "localJagoffPromoQueue",
  saved: "localJagoffSavedPromoPacks",
  phrases: "localJagoffRecentPromoPhrases",
  productBank: "localJagoffProductPromoBank",
  performance: "localJagoffPromoPerformance",
};

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

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setSaved(readArray(KEYS.saved));
    setPhrases(readArray(KEYS.phrases));
    setProductBank(readArray(KEYS.productBank));
    setPerformance(readArray(KEYS.performance));
  }, []);

  const stats = useMemo(() => {
    const today = todayIso();
    return {
      queued: queue.length,
      saved: saved.length,
      productBank: productBank.length,
      performance: performance.length,
      winners: performance.filter((item) => item.winner).length,
      memory: phrases.length,
      today: queue.filter((item) => item.scheduledDate === today).length,
      ready: queue.filter((item) => item.status === "Ready").length,
      posted: queue.filter((item) => item.status === "Posted").length,
      draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
    };
  }, [queue, saved, phrases, productBank, performance]);

  const backupAll = () => downloadJson("local-jagoff-promo-backup.json", {
    exportedAt: new Date().toISOString(),
    queue,
    savedPacks: saved,
    recentPhrases: phrases,
    productBank,
    performance,
  });

  const cards = [
    {
      title: "Posting Board",
      href: "/admin/promo-posting-board",
      text: "Daily posting screen. Copy clean platform bundles, open product pages, and mark posts Ready or Posted.",
      cta: "Open Posting Board",
      featured: true,
    },
    {
      title: "Performance Tracker",
      href: "/admin/promo-performance",
      text: "Track post metrics, mark winners, and save winning copy back to the Product Bank.",
      cta: "Open Performance",
      featured: true,
    },
    {
      title: "Promo Insights",
      href: "/admin/promo-insights",
      text: "See best platforms, products, sources, winner rate, and top scoring copy.",
      cta: "Open Insights",
      featured: true,
    },
    {
      title: "Promo Generator",
      href: "/admin/promo-generator",
      text: "Create AI or free promo packs, holiday campaigns, captions, scripts, links, and bundles.",
      cta: "Open Generator",
    },
    {
      title: "Week Builder",
      href: "/admin/promo-week-builder",
      text: "Build a full week or month of promo drafts and push them into the queue.",
      cta: "Open Week Builder",
    },
    {
      title: "Queue Manager",
      href: "/admin/promo-queue",
      text: "Filter, edit, copy, export, and clean up queued promo drafts.",
      cta: "Open Queue",
    },
    {
      title: "Promo Calendar",
      href: "/admin/promo-calendar",
      text: "See scheduled promos by date, status, and platform.",
      cta: "Open Calendar",
    },
    {
      title: "Saved Library",
      href: "/admin/promo-library",
      text: "Search saved promo packs and copy the platform bundle you need.",
      cta: "Open Library",
    },
    {
      title: "Product Bank",
      href: "/admin/promo-product-bank",
      text: "Save approved captions, hooks, CTAs, overlays, and notes by product.",
      cta: "Open Product Bank",
    },
    {
      title: "Bank Repair",
      href: "/admin/promo-bank-repair",
      text: "Repair older Product Bank entries that are missing product IDs, images, or categories.",
      cta: "Open Bank Repair",
    },
    {
      title: "System Health",
      href: "/admin/promo-health",
      text: "Check, repair, and export browser-stored promo data health.",
      cta: "Open Health",
    },
    {
      title: "Backup / Restore",
      href: "/admin/promo-backup",
      text: "Export or restore browser-stored promo data.",
      cta: "Open Backup",
    },
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
          <p className="kicker">LOCAL JAGOFF ADMIN</p>
          <h1>Promo Hub</h1>
          <p>One landing page for the Local Jagoff promo workflow: create, save, queue, post manually, track performance, product bank, export, and restore.</p>
          <div className="heroActions">
            <a href="/admin/promo-posting-board">Open Posting Board</a>
            <a href="/admin/promo-performance">Open Performance</a>
            <a href="/admin/promo-insights">Open Insights</a>
            <button type="button" onClick={backupAll}>Download Full Backup</button>
          </div>
        </header>

        <section className="stats">
          <div><strong>{stats.today}</strong><span>Today</span></div>
          <div><strong>{stats.ready}</strong><span>Ready</span></div>
          <div><strong>{stats.queued}</strong><span>Queued</span></div>
          <div><strong>{stats.posted}</strong><span>Posted</span></div>
          <div><strong>{stats.performance}</strong><span>Tracked</span></div>
          <div><strong>{stats.winners}</strong><span>Winners</span></div>
          <div><strong>{stats.productBank}</strong><span>Product Bank</span></div>
          <div><strong>{stats.saved}</strong><span>Saved</span></div>
          <div><strong>{stats.memory}</strong><span>Memory</span></div>
        </section>

        <section className="flow">
          <p className="kicker">DAILY FLOW</p>
          <strong>Week Builder → Queue → Posting Board → Mark Posted → Performance → Insights → Save Winners to Product Bank</strong>
          <p>No auto-posting yet. The Posting Board is the fast manual approval/posting screen, Performance tracks what worked, and Insights shows what to repeat.</p>
        </section>

        <section className="cards">
          {cards.map((card) => (
            <a key={card.href} className={`card ${card.featured ? "featured" : ""}`} href={card.href}>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
              <span>{card.cta}</span>
            </a>
          ))}
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1160px;margin:0 auto;padding-top:38px}.hero,.flow{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:28px;box-shadow:0 22px 80px rgba(0,0,0,.45);margin-bottom:16px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}h1{font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}p{color:#d6d6d6;line-height:1.6}.hero p{max-width:760px}.heroActions{display:flex;gap:10px;flex-wrap:wrap}.heroActions a,button,.card span{display:inline-flex;width:max-content;margin-top:10px;border:none;border-radius:14px;background:#ffe600;color:#000;padding:13px 16px;font-weight:900;text-decoration:none;cursor:pointer}.stats{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats div,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.flow strong{display:block;color:#ffe600;font-size:20px;line-height:1.35}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{display:block;color:#fff;text-decoration:none}.card.featured{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.12),rgba(13,13,13,.92))}.card h2{text-transform:uppercase;color:#ffe600}.card:hover{border-color:#ffe600;transform:translateY(-1px)}@media(max-width:1100px){.stats{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:800px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.cards{grid-template-columns:1fr}.heroActions a,.heroActions button{width:100%;text-align:center;justify-content:center}}`}</style>
    </div>
  );
}
