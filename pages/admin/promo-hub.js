import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

const KEYS = {
  queue: "localJagoffPromoQueue",
  saved: "localJagoffSavedPromoPacks",
  phrases: "localJagoffRecentPromoPhrases",
};

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

  useEffect(() => {
    setQueue(readArray(KEYS.queue));
    setSaved(readArray(KEYS.saved));
    setPhrases(readArray(KEYS.phrases));
  }, []);

  const stats = useMemo(() => ({
    queued: queue.length,
    saved: saved.length,
    memory: phrases.length,
    ready: queue.filter((item) => item.status === "Ready").length,
    posted: queue.filter((item) => item.status === "Posted").length,
    draft: queue.filter((item) => (item.status || "Draft") === "Draft").length,
  }), [queue, saved, phrases]);

  const backupAll = () => downloadJson("local-jagoff-promo-backup.json", {
    exportedAt: new Date().toISOString(),
    queue,
    savedPacks: saved,
    recentPhrases: phrases,
  });

  const cards = [
    {
      title: "Promo Generator",
      href: "/admin/promo-generator",
      text: "Create AI or free promo packs, holiday campaigns, captions, scripts, links, and bundles.",
      cta: "Open Generator",
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

      <main className="wrap">
        <header className="hero">
          <p className="kicker">LOCAL JAGOFF ADMIN</p>
          <h1>Promo Hub</h1>
          <p>One landing page for the Local Jagoff promo workflow: create, save, queue, calendar, export, and restore.</p>
          <button type="button" onClick={backupAll}>Download Full Backup</button>
        </header>

        <section className="stats">
          <div><strong>{stats.queued}</strong><span>Queued</span></div>
          <div><strong>{stats.draft}</strong><span>Draft</span></div>
          <div><strong>{stats.ready}</strong><span>Ready</span></div>
          <div><strong>{stats.posted}</strong><span>Posted</span></div>
          <div><strong>{stats.saved}</strong><span>Saved</span></div>
          <div><strong>{stats.memory}</strong><span>Memory</span></div>
        </section>

        <section className="cards">
          {cards.map((card) => (
            <a key={card.href} className="card" href={card.href}>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
              <span>{card.cta}</span>
            </a>
          ))}
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:38px 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1160px;margin:0 auto}.hero{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:28px;box-shadow:0 22px 80px rgba(0,0,0,.45);margin-bottom:16px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}h1{font-size:clamp(48px,9vw,104px);line-height:.88;text-transform:uppercase}p{color:#d6d6d6;line-height:1.6}.hero p{max-width:760px}button,.card span{display:inline-flex;width:max-content;margin-top:10px;border:none;border-radius:14px;background:#ffe600;color:#000;padding:13px 16px;font-weight:900;text-decoration:none;cursor:pointer}.stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats div,.card{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{display:block;color:#fff;text-decoration:none}.card h2{text-transform:uppercase;color:#ffe600}.card:hover{border-color:#ffe600;transform:translateY(-1px)}@media(max-width:800px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.cards{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
