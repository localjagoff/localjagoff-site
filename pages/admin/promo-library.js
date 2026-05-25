import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import { formatPlatformBundle } from "../../lib/promoBundleFormatter";

const STORAGE_KEY = "localJagoffSavedPromoPacks";
const PLATFORMS = ["full_pack", "facebook", "instagram", "tiktok", "youtube_shorts"];
const LABELS = { full_pack: "Full Pack", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube_shorts: "YouTube Shorts" };

function readSaved() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaved(items) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function packText(item, platform) {
  if (platform !== "full_pack") return formatPlatformBundle(item.promo, platform);
  return [
    item.promo?.brand_angle,
    item.promo?.facebook_post,
    item.promo?.instagram_caption,
    item.promo?.tiktok_caption,
    item.promo?.youtube_shorts_title,
    item.promo?.youtube_shorts_description,
    item.promo?.cta,
  ].filter(Boolean).join("\n\n---\n\n");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(items, platform) {
  const headers = ["product", "source", "mode", "platform", "brand_angle", "copy_bundle"];
  const rows = items.map((item) => [
    item.product?.name || "",
    item.source || "",
    item.mode || "",
    LABELS[platform] || platform,
    item.promo?.brand_angle || "",
    packText(item, platform),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
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

export default function PromoLibrary() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("full_pack");

  useEffect(() => setItems(readSaved()), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [
      item.product?.name,
      item.source,
      item.mode,
      item.notes,
      item.promo?.brand_angle,
      item.promo?.facebook_post,
      item.promo?.instagram_caption,
      item.promo?.tiktok_caption,
    ].join(" ").toLowerCase().includes(q));
  }, [items, search]);

  const removeItem = (id) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    writeSaved(next);
  };

  const exportCsv = () => downloadFile("local-jagoff-saved-library.csv", buildCsv(filtered, platform), "text/csv");

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Library</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero">
          <div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Library</h1><p>Search saved promo packs and copy the platform bundle you need.</p></div>
        </header>

        <section className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved promos..." />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p} value={p}>{LABELS[p]}</option>)}</select>
          <button type="button" onClick={() => downloadFile("local-jagoff-saved-library.json", JSON.stringify(items, null, 2), "application/json")}>Export JSON</button>
          <button type="button" onClick={exportCsv}>Export CSV</button>
        </section>

        <section className="grid">
          {filtered.length === 0 && <div className="empty">No saved promos match.</div>}
          {filtered.map((item) => {
            const text = packText(item, platform);
            return <article key={item.id} className="card">
              <div className="top"><div><p className="mini">{item.source || "Saved"}</p><h2>{item.product?.name || "Saved Promo"}</h2></div>{item.product?.thumbnail_url && <img src={item.product.thumbnail_url} alt={item.product?.name || "Product"} />}</div>
              <p>{item.promo?.brand_angle || item.promo?.facebook_post || "No preview."}</p>
              <details><summary>Preview {LABELS[platform]}</summary><pre>{text}</pre></details>
              <div className="actions"><button type="button" onClick={() => copyText(text)}>Copy {LABELS[platform]}</button><button type="button" onClick={() => downloadFile(`${item.product?.name || "promo"}.txt`, text)}>Download TXT</button><button type="button" className="danger" onClick={() => removeItem(item.id)}>Remove</button></div>
            </article>;
          })}
        </section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1180px;margin:0 auto;padding-top:34px}.hero{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(42px,8vw,92px);line-height:.9;text-transform:uppercase}.hero p,.card p{color:#ddd;line-height:1.55}button{border:none;border-radius:14px;padding:12px 14px;background:#ffe600;color:#000;font-weight:900;text-decoration:none;cursor:pointer}.toolbar{display:grid;grid-template-columns:2fr 1fr auto auto;gap:10px;background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:14px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card,.empty{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:16px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.top{display:grid;grid-template-columns:minmax(0,1fr) 84px;gap:12px}.top h2{text-transform:uppercase}.top img{width:84px;height:84px;object-fit:contain;background:#070707;border-radius:14px}input,select{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}button{background:#1b1b1b;color:#fff;border:1px solid #333}.toolbar button,.actions button:first-child{background:#ffe600;color:#000}.danger{color:#ff9a9a!important}details{margin:12px 0;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}summary{cursor:pointer;color:#ffe600;font-weight:900}pre{white-space:pre-wrap;color:#f2f2f2}.actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:800px){.hero,.toolbar{display:grid;grid-template-columns:1fr}.grid{grid-template-columns:1fr}button{width:100%;text-align:center}}`}</style>
    </div>
  );
}
