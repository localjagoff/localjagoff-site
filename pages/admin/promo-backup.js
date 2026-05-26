import Head from "next/head";
import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const KEYS = {
  queue: "localJagoffPromoQueue",
  savedPacks: "localJagoffSavedPromoPacks",
  recentPhrases: "localJagoffRecentPromoPhrases",
  productBank: "localJagoffProductPromoBank",
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

function writeArray(key, value) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
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

export default function PromoBackup() {
  const [queue, setQueue] = useState([]);
  const [savedPacks, setSavedPacks] = useState([]);
  const [recentPhrases, setRecentPhrases] = useState([]);
  const [productBank, setProductBank] = useState([]);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  const refresh = () => {
    setQueue(readArray(KEYS.queue));
    setSavedPacks(readArray(KEYS.savedPacks));
    setRecentPhrases(readArray(KEYS.recentPhrases));
    setProductBank(readArray(KEYS.productBank));
  };

  useEffect(() => refresh(), []);

  const exportAll = () => downloadJson("local-jagoff-promo-data-backup.json", {
    exportedAt: new Date().toISOString(),
    queue,
    savedPacks,
    recentPhrases,
    productBank,
  });

  const restoreFromObject = (parsed) => {
    writeArray(KEYS.queue, parsed.queue || []);
    writeArray(KEYS.savedPacks, parsed.savedPacks || []);
    writeArray(KEYS.recentPhrases, parsed.recentPhrases || []);
    writeArray(KEYS.productBank, parsed.productBank || parsed.bank || []);
    refresh();
    setMessage("Backup restored into this browser.");
  };

  const restore = () => {
    try {
      restoreFromObject(JSON.parse(importText || "{}"));
    } catch {
      setMessage("Could not read that JSON backup.");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportText(text);
      restoreFromObject(JSON.parse(text || "{}"));
    } catch {
      setMessage("Could not restore from that file.");
    }
  };

  const clearAll = () => {
    writeArray(KEYS.queue, []);
    writeArray(KEYS.savedPacks, []);
    writeArray(KEYS.recentPhrases, []);
    writeArray(KEYS.productBank, []);
    refresh();
    setMessage("Promo browser data cleared.");
  };

  return <div className="page"><Head><title>Local Jagoff Promo Backup</title><meta name="robots" content="noindex,nofollow" /></Head><PromoAdminNav /><main className="wrap"><header className="hero"><div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Backup</h1><p>Export or restore browser-stored promo queue, saved packs, Product Bank, and no-repeat memory.</p></div></header><section className="stats"><div><strong>{queue.length}</strong><span>Queue</span></div><div><strong>{savedPacks.length}</strong><span>Saved</span></div><div><strong>{productBank.length}</strong><span>Product Bank</span></div><div><strong>{recentPhrases.length}</strong><span>Memory</span></div></section><section className="panel"><h2>Export</h2><p>Download a full browser backup before clearing data or moving to another computer/browser.</p><button onClick={exportAll}>Download Backup JSON</button></section><section className="panel"><h2>Restore From File</h2><p>Upload a backup JSON file and it will restore into this browser.</p><input className="fileInput" type="file" accept="application/json,.json" onChange={handleFileUpload} /></section><section className="panel"><h2>Restore From Paste</h2><p>Paste a backup JSON file here, then restore it into this browser.</p><textarea value={importText} onChange={(e)=>setImportText(e.target.value)} placeholder="Paste backup JSON here..."/><div className="actions"><button onClick={restore}>Restore Backup</button><button className="danger" onClick={clearAll}>Clear All Promo Data</button></div>{message&&<p className="msg">{message}</p>}</section></main><style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1050px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.kicker{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,92px);line-height:.9;text-transform:uppercase}.hero p,.panel p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.stats div,.panel{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:32px}.stats span{font-weight:900;color:#ccc;text-transform:uppercase;font-size:12px;letter-spacing:1px}.panel{margin-bottom:14px}.panel h2{text-transform:uppercase;color:#ffe600}.fileInput,textarea{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:220px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}button{border:none;border-radius:14px;padding:12px 14px;background:#ffe600;color:#000;font-weight:900;cursor:pointer}.danger{background:#1b1b1b;color:#ff9a9a;border:1px solid #333}.msg{font-weight:900;color:#ffe600}@media(max-width:760px){.hero{display:grid}.stats{grid-template-columns:1fr}button{width:100%;text-align:center}}`}</style></div>
}
