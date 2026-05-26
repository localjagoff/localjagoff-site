import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const BANK_KEY = "localJagoffProductPromoBank";

function readBank() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BANK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBank(bank) {
  if (typeof window !== "undefined") window.localStorage.setItem(BANK_KEY, JSON.stringify(Array.isArray(bank) ? bank : []));
}

function clean(value) {
  return String(value || "").trim();
}

function normalizedName(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function genericName(value) {
  const name = normalizedName(value);
  return !name || name === "unknown product" || name === "current promo product" || name === "promo pack";
}

function findProduct(entry, products) {
  const productId = String(entry.productId || "");
  if (productId) {
    const byId = products.find((product) => String(product.id) === productId);
    if (byId) return byId;
  }

  const candidates = [entry.productName, entry.tag, entry.text].map(normalizedName).filter(Boolean);
  const sortedProducts = [...products].sort((a, b) => normalizedName(b.name).length - normalizedName(a.name).length);

  for (const product of sortedProducts) {
    const productName = normalizedName(product.name);
    if (!productName) continue;
    if (candidates.some((candidate) => candidate === productName)) return product;
    if (productName.length >= 10 && candidates.some((candidate) => candidate.includes(productName))) return product;
    if (productName.length >= 10 && candidates.some((candidate) => productName.includes(candidate) && !genericName(candidate))) return product;
  }

  return null;
}

function normalizeEntry(entry) {
  return {
    id: entry.id || `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: entry.createdAt || new Date().toISOString(),
    productId: String(entry.productId || ""),
    productName: entry.productName || entry.product?.name || "Unknown product",
    productImage: entry.productImage || entry.product?.thumbnail_url || entry.product?.image || "",
    productCategory: entry.productCategory || entry.product?.category || "gear",
    type: entry.type || "note",
    platform: entry.platform || "general",
    text: clean(entry.text),
    source: entry.source || "Imported",
    tag: clean(entry.tag),
    status: entry.status || "Approved",
  };
}

function repairEntry(entry, products) {
  const normalized = normalizeEntry(entry);
  const matched = findProduct(normalized, products);

  if (!matched) {
    return {
      ...normalized,
      status: normalized.productId ? normalized.status : "Needs Review",
      source: normalized.source.includes("Product Match") ? normalized.source : `${normalized.source} - Product Match Needed`,
    };
  }

  return {
    ...normalized,
    productId: String(matched.id || normalized.productId || ""),
    productName: matched.name || normalized.productName,
    productImage: matched.thumbnail_url || matched.image || normalized.productImage,
    productCategory: matched.category || normalized.productCategory || "gear",
    status: normalized.status === "Rejected" ? "Rejected" : "Approved",
    source: normalized.source.includes("Product Match Repaired") ? normalized.source : `${normalized.source} - Product Match Repaired`,
  };
}

function dedupe(bank) {
  const seen = new Set();
  return bank.filter((entry) => {
    const key = [entry.productId, entry.productName, entry.type, entry.platform, entry.text].join("|").toLowerCase();
    if (!entry.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function PromoBankRepair() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [bank, setBank] = useState([]);
  const [message, setMessage] = useState("");

  const refreshBank = () => setBank(readBank().map(normalizeEntry));

  useEffect(() => {
    refreshBank();
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: bank.length,
    matched: bank.filter((entry) => entry.productId).length,
    unmatched: bank.filter((entry) => !entry.productId).length,
    review: bank.filter((entry) => entry.status === "Needs Review").length,
    approved: bank.filter((entry) => entry.status === "Approved").length,
  }), [bank]);

  const repair = () => {
    if (productsLoading) {
      setMessage("Products are still loading. Try again in a second.");
      return;
    }

    if (products.length === 0) {
      setMessage("No products loaded from the store API, so repair cannot run.");
      return;
    }

    const repaired = dedupe(bank.map((entry) => repairEntry(entry, products)));
    writeBank(repaired);
    setBank(repaired);
    const matched = repaired.filter((entry) => entry.productId).length;
    const review = repaired.filter((entry) => entry.status === "Needs Review").length;
    setMessage(`Repair complete. ${matched} matched. ${review} still need review.`);
  };

  const cleanDuplicates = () => {
    const cleaned = dedupe(bank);
    writeBank(cleaned);
    setBank(cleaned);
    setMessage(`Duplicate cleanup complete. ${cleaned.length} items remain.`);
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Product Bank Repair</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero"><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Bank Repair</h1><p>Repair old Product Bank entries that were saved before product IDs and product images were captured reliably.</p></header>
        <section className="stats"><div><strong>{stats.total}</strong><span>Total</span></div><div><strong>{stats.matched}</strong><span>Matched</span></div><div><strong>{stats.unmatched}</strong><span>Unmatched</span></div><div><strong>{stats.review}</strong><span>Needs Review</span></div><div><strong>{stats.approved}</strong><span>Approved</span></div></section>
        <section className="panel"><h2>Repair Actions</h2><p>Run a backup first if you want a safety copy. This uses your live product list from the store API to fill missing product IDs, images, and categories.</p><div className="actions"><button type="button" onClick={repair}>Repair Product Matches</button><button type="button" onClick={cleanDuplicates}>Clean Duplicates</button><a href="/admin/promo-backup">Open Backup</a><a href="/admin/promo-product-bank">Open Product Bank</a></div>{message && <p className="msg">{message}</p>}</section>
        <section className="grid">{bank.slice(0, 80).map((entry) => <article key={entry.id} className="card"><p className="mini">{entry.productId ? "Matched" : "Needs Match"} • {entry.status}</p><h3>{entry.productName}</h3><p>{entry.text}</p></article>)}</section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1160px;margin:0 auto;padding-top:34px}.hero,.panel,.card,.stats div{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{margin-bottom:14px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,92px);line-height:.9;text-transform:uppercase}.hero p,.panel p,.card p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats strong{display:block;color:#ffe600;font-size:32px}.stats span{font-size:12px;font-weight:900;color:#ccc;text-transform:uppercase;letter-spacing:1px}.panel{margin-bottom:14px}.panel h2,.card h3{text-transform:uppercase;color:#ffe600}.actions{display:flex;gap:8px;flex-wrap:wrap}button,.actions a{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#ffe600;color:#000;text-decoration:none}.msg{font-weight:900;color:#ffe600}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card p{max-height:120px;overflow:auto}@media(max-width:850px){.stats,.grid{grid-template-columns:1fr}.actions button,.actions a{width:100%;text-align:center}}`}</style>
    </div>
  );
}
