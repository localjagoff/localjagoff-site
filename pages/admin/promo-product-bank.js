import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const BANK_KEY = "localJagoffProductPromoBank";
const SAVED_KEY = "localJagoffSavedPromoPacks";

const TYPE_OPTIONS = [
  ["caption", "Caption"],
  ["hook", "Hook"],
  ["cta", "CTA"],
  ["overlay", "Overlay"],
  ["note", "Note"],
];

const PLATFORM_OPTIONS = [
  ["general", "General"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const STATUS_OPTIONS = [
  ["Approved", "Approved"],
  ["Needs Review", "Needs Review"],
  ["Rejected", "Rejected"],
];

const VALID_TYPES = new Set(TYPE_OPTIONS.map(([value]) => value));
const VALID_PLATFORMS = new Set(PLATFORM_OPTIONS.map(([value]) => value));
const VALID_STATUSES = new Set(STATUS_OPTIONS.map(([value]) => value));

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
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  }
}

function copyText(value) {
  if (!value || typeof navigator === "undefined") return false;
  navigator.clipboard.writeText(value);
  return true;
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

function downloadJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function labelFromOptions(options, value) {
  return options.find(([key]) => key === value)?.[1] || value;
}

function nowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanSnippet(value) {
  return String(value || "").trim();
}

function productKey(product) {
  return String(product?.id || product?.name || "");
}

function isPerformanceWinner(entry) {
  return String(entry?.source || "").toLowerCase().includes("performance winner");
}

function normalizeEntry(item) {
  const text = cleanSnippet(item?.text);

  return {
    id: item?.id || nowId("bank"),
    createdAt: item?.createdAt || new Date().toISOString(),
    productId: String(item?.productId || item?.product?.id || ""),
    productName: item?.productName || item?.product?.name || "Unknown product",
    productImage: item?.productImage || item?.product?.thumbnail_url || item?.product?.image || "",
    productCategory: item?.productCategory || item?.product?.category || "gear",
    type: VALID_TYPES.has(item?.type) ? item.type : "note",
    platform: VALID_PLATFORMS.has(item?.platform) ? item.platform : "general",
    text,
    source: item?.source || "Imported",
    tag: cleanSnippet(item?.tag),
    status: VALID_STATUSES.has(item?.status) ? item.status : "Approved",
  };
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = [entry.productId, entry.productName, entry.type, entry.platform, entry.text].join("|").toLowerCase();
    if (!entry.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseBankImport(value) {
  const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
  const source = Array.isArray(parsed)
    ? parsed
    : parsed?.productBank || parsed?.bank || parsed?.items || [];

  return Array.isArray(source) ? source.map(normalizeEntry).filter((entry) => entry.text) : [];
}

function buildCsv(entries) {
  const headers = [
    "product_id",
    "product_name",
    "product_category",
    "type",
    "platform",
    "status",
    "tag",
    "source",
    "created_at",
    "text",
  ];

  const rows = entries.map((entry) => [
    entry.productId,
    entry.productName,
    entry.productCategory,
    labelFromOptions(TYPE_OPTIONS, entry.type),
    labelFromOptions(PLATFORM_OPTIONS, entry.platform),
    entry.status,
    entry.tag,
    entry.source,
    entry.createdAt,
    entry.text,
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildBankEntry({ product, type, platform, text, source = "Manual", tag = "" }) {
  return normalizeEntry({
    id: nowId("bank"),
    createdAt: new Date().toISOString(),
    productId: String(product?.id || ""),
    productName: product?.name || "Unknown product",
    productImage: product?.thumbnail_url || product?.image || "",
    productCategory: product?.category || "gear",
    type,
    platform,
    text: cleanSnippet(text),
    source,
    tag: cleanSnippet(tag),
    status: "Approved",
  });
}

function extractSavedPackEntries(item) {
  const product = item.product || {};
  const promo = item.promo || {};
  const entries = [];

  if (promo.facebook_post) entries.push(buildBankEntry({ product, type: "caption", platform: "facebook", text: promo.facebook_post, source: "Saved Pack Import" }));
  if (promo.instagram_caption) entries.push(buildBankEntry({ product, type: "caption", platform: "instagram", text: promo.instagram_caption, source: "Saved Pack Import" }));
  if (promo.tiktok_caption) entries.push(buildBankEntry({ product, type: "caption", platform: "tiktok", text: promo.tiktok_caption, source: "Saved Pack Import" }));
  if (promo.youtube_shorts_title) entries.push(buildBankEntry({ product, type: "hook", platform: "youtube_shorts", text: promo.youtube_shorts_title, source: "Saved Pack Import" }));
  if (Array.isArray(promo.video_hooks)) {
    promo.video_hooks.forEach((hook) => entries.push(buildBankEntry({ product, type: "hook", platform: "general", text: hook, source: "Saved Pack Import" })));
  }
  if (Array.isArray(promo.image_overlay_text)) {
    promo.image_overlay_text.forEach((overlay) => entries.push(buildBankEntry({ product, type: "overlay", platform: "general", text: overlay, source: "Saved Pack Import" })));
  }

  return entries.filter((entry) => entry.text);
}

export default function PromoProductBank() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [bank, setBank] = useState([]);
  const [savedPacks, setSavedPacks] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [type, setType] = useState("caption");
  const [platform, setPlatform] = useState("general");
  const [tag, setTag] = useState("");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [winnerOnly, setWinnerOnly] = useState(false);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setBank(readArray(BANK_KEY).map(normalizeEntry));
    setSavedPacks(readArray(SAVED_KEY));

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setSelectedProductId(list[0]?.id ? String(list[0].id) : "");
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId]
  );

  const productOptions = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(String(product.id), product.name));
    bank.forEach((entry) => {
      const key = String(entry.productId || entry.productName);
      if (key && !map.has(key)) map.set(key, entry.productName);
    });
    return Array.from(map.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [products, bank]);

  const filteredBank = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bank.filter((entry) => {
      const haystack = [entry.productName, entry.productCategory, entry.type, entry.platform, entry.status, entry.text, entry.tag, entry.source].join(" ").toLowerCase();
      const entryProductKey = String(entry.productId || entry.productName);
      if (winnerOnly && !isPerformanceWinner(entry)) return false;
      if (productFilter !== "all" && entryProductKey !== String(productFilter)) return false;
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (platformFilter !== "all" && entry.platform !== platformFilter) return false;
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (q && !haystack.includes(q)) return false;
      return true;
    });
  }, [bank, search, productFilter, typeFilter, platformFilter, statusFilter, winnerOnly]);

  const savedForSelectedProduct = useMemo(() => {
    if (!selectedProduct) return [];
    const selectedKey = productKey(selectedProduct);
    return savedPacks.filter((item) => productKey(item.product) === selectedKey);
  }, [savedPacks, selectedProduct]);

  const stats = useMemo(() => ({
    total: bank.length,
    approved: bank.filter((entry) => entry.status === "Approved").length,
    winners: bank.filter(isPerformanceWinner).length,
    review: bank.filter((entry) => entry.status === "Needs Review").length,
    rejected: bank.filter((entry) => entry.status === "Rejected").length,
    products: new Set(bank.map((entry) => entry.productId || entry.productName)).size,
    captions: bank.filter((entry) => entry.type === "caption").length,
    hooks: bank.filter((entry) => entry.type === "hook").length,
  }), [bank]);

  const saveBank = (next) => {
    const clean = next.map(normalizeEntry).filter((entry) => entry.text).slice(0, 800);
    setBank(clean);
    writeArray(BANK_KEY, clean);
  };

  const addManualEntry = () => {
    setMessage("");

    if (!selectedProduct) {
      setMessage("Pick a product first.");
      return;
    }

    if (!cleanSnippet(text)) {
      setMessage("Add text before saving to the bank.");
      return;
    }

    const entry = buildBankEntry({ product: selectedProduct, type, platform, text, tag });
    saveBank([entry, ...bank]);
    setText("");
    setMessage("Approved promo text saved to the Product Bank.");
  };

  const importSavedPack = (item) => {
    const entries = extractSavedPackEntries(item);
    if (entries.length === 0) {
      setMessage("That saved pack did not have usable text to import.");
      return;
    }

    saveBank([...entries, ...bank]);
    setMessage(`${entries.length} item${entries.length === 1 ? "" : "s"} imported into the Product Bank.`);
  };

  const removeEntry = (id) => {
    saveBank(bank.filter((entry) => entry.id !== id));
    setMessage("Product Bank item removed.");
  };

  const updateStatus = (id, status) => {
    saveBank(bank.map((entry) => entry.id === id ? { ...entry, status } : entry));
    setMessage("Product Bank item updated.");
  };

  const cleanupDuplicates = () => {
    const clean = dedupeEntries(bank.map(normalizeEntry));
    saveBank(clean);
    setMessage(`Duplicate cleanup complete. ${clean.length} Product Bank item${clean.length === 1 ? "" : "s"} remain.`);
  };

  const clearRejected = () => {
    const clean = bank.filter((entry) => entry.status !== "Rejected");
    saveBank(clean);
    setMessage("Rejected Product Bank items cleared.");
  };

  const exportJson = () => downloadJson("local-jagoff-product-promo-bank.json", {
    exportedAt: new Date().toISOString(),
    productBank: bank,
  });

  const exportFilteredJson = () => downloadJson("local-jagoff-product-promo-bank-filtered.json", {
    exportedAt: new Date().toISOString(),
    productBank: filteredBank,
  });

  const exportCsv = () => downloadFile("local-jagoff-product-promo-bank.csv", buildCsv(filteredBank), "text/csv");

  const restoreFromText = (value) => {
    try {
      const incoming = parseBankImport(value);
      if (incoming.length === 0) {
        setMessage("No valid Product Bank entries found in that import.");
        return;
      }
      saveBank(dedupeEntries([...incoming, ...bank]));
      setMessage(`${incoming.length} Product Bank item${incoming.length === 1 ? "" : "s"} imported.`);
    } catch {
      setMessage("Could not read that Product Bank JSON.");
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const value = await file.text();
      setImportText(value);
      restoreFromText(value);
    } catch {
      setMessage("Could not import that file.");
    }
  };

  const copyEntry = (entry) => {
    const ok = copyText(entry.text);
    setMessage(ok ? "Copied Product Bank text." : "No text to copy.");
  };

  const showWinners = () => {
    setWinnerOnly(true);
    setStatusFilter("Approved");
    setMessage("Showing approved Performance Winner entries.");
  };

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Product Promo Bank</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Product Bank</h1>
          <p>Save approved captions, hooks, CTAs, overlays, and notes by product so the best lines do not get buried in old generated packs.</p>
        </header>

        <section className="stats">
          <button type="button" onClick={() => setWinnerOnly(false)}><strong>{stats.total}</strong><span>Total</span></button>
          <button type="button" onClick={() => setStatusFilter("Approved")}><strong>{stats.approved}</strong><span>Approved</span></button>
          <button type="button" onClick={showWinners}><strong>{stats.winners}</strong><span>Winners</span></button>
          <button type="button" onClick={() => setStatusFilter("Needs Review")}><strong>{stats.review}</strong><span>Review</span></button>
          <button type="button" onClick={() => setStatusFilter("Rejected")}><strong>{stats.rejected}</strong><span>Rejected</span></button>
          <div><strong>{stats.products}</strong><span>Products</span></div>
          <button type="button" onClick={() => setTypeFilter("caption")}><strong>{stats.captions}</strong><span>Captions</span></button>
          <button type="button" onClick={() => setTypeFilter("hook")}><strong>{stats.hooks}</strong><span>Hooks</span></button>
        </section>

        <section className="layout">
          <div className="panel addPanel">
            <div className="panelHead"><p className="mini">SAVE WINNER</p><h2>Add approved text</h2></div>
            <label className="full">Product<select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} disabled={productsLoading}>{productsLoading && <option>Loading products...</option>}{!productsLoading && products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label>Type<select value={type} onChange={(e) => setType(e.target.value)}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="full">Tag / note<input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Example: hoodie weather, best hook, 724 clean, ad safe..." /></label>
            <label className="full">Approved text<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the caption, hook, CTA, overlay, or note you want to save..." /></label>
            <div className="actions full"><button type="button" className="primary" onClick={addManualEntry}>Save to Product Bank</button><button type="button" onClick={exportJson}>Export Full JSON</button><button type="button" onClick={exportCsv}>Export Filtered CSV</button></div>
            {message && <p className="message full">{message}</p>}
          </div>

          <aside className="panel importPanel">
            <div className="panelHead"><p className="mini">IMPORT</p><h2>Saved packs / backup</h2></div>
            <label>Import Product Bank JSON<input className="fileInput" type="file" accept="application/json,.json" onChange={handleFileImport} /></label>
            <label>Paste Product Bank JSON<textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste productBank / bank JSON here..." /></label>
            <div className="actions"><button type="button" onClick={() => restoreFromText(importText)}>Import Pasted JSON</button><button type="button" onClick={cleanupDuplicates}>Clean Duplicates</button><button type="button" className="danger" onClick={clearRejected}>Clear Rejected</button></div>
            <div className="savedBlock"><p className="mini">Saved packs for selected product</p>{savedForSelectedProduct.length === 0 && <p className="muted">No saved packs found for the selected product yet.</p>}<div className="savedList">{savedForSelectedProduct.map((item) => <article key={item.id} className="savedItem"><strong>{item.source || "Saved Pack"}</strong><p>{item.promo?.brand_angle || item.promo?.facebook_post || "Saved promo pack"}</p><button type="button" onClick={() => importSavedPack(item)}>Import Text</button></article>)}</div></div>
          </aside>
        </section>

        <section className="panel bankPanel">
          <div className="bankHead"><div><p className="mini">BANK</p><h2>Reusable copy database</h2>{winnerOnly && <p className="winnerNotice">Showing Performance Winner entries only.</p>}</div><div className="actions"><button type="button" onClick={() => setWinnerOnly(!winnerOnly)}>{winnerOnly ? "Show All" : "Show Winners"}</button><button type="button" onClick={exportFilteredJson}>Export Filtered JSON</button><button type="button" onClick={exportCsv}>Export Filtered CSV</button></div></div>
          <div className="filters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bank..." /><select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}><option value="all">All Products</option>{productOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All Types</option>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="all">All Platforms</option>{PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Statuses</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {filteredBank.length === 0 && <div className="empty">No bank entries match this view.</div>}
          <div className="bankGrid">
            {filteredBank.map((entry) => <article key={entry.id} className={`entry ${isPerformanceWinner(entry) ? "winnerEntry" : ""}`}><div className="entryTop"><div><p className="mini">{labelFromOptions(TYPE_OPTIONS, entry.type)} • {labelFromOptions(PLATFORM_OPTIONS, entry.platform)}</p><h3>{entry.productName}</h3></div>{entry.productImage && <img src={entry.productImage} alt={entry.productName} />}</div><div className="entryControls"><span className={`status status${entry.status.replace(/\s+/g, "")}`}>{entry.status}</span>{isPerformanceWinner(entry) && <span className="winnerBadge">Winner</span>}<select value={entry.status} onChange={(e) => updateStatus(entry.id, e.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{entry.tag && <p className="tag">{entry.tag}</p>}<pre>{entry.text}</pre><div className="entryActions"><button type="button" onClick={() => copyEntry(entry)}>Copy</button><button type="button" className="danger" onClick={() => removeEntry(entry.id)}>Remove</button></div></article>)}
          </div>
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1240px;margin:0 auto;padding-top:34px}.hero{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:26px;margin-bottom:16px;box-shadow:0 22px 80px rgba(0,0,0,.4)}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p,.muted,.savedItem p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div,.stats button,.panel,.empty,.entry{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats button{text-align:left;cursor:pointer}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{font-size:12px;font-weight:900;color:#ccc;text-transform:uppercase;letter-spacing:1px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:14px;margin-bottom:14px}.addPanel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.full,.panelHead{grid-column:1/-1}.panelHead h2,.bankHead h2{font-size:26px;text-transform:uppercase}label{display:block;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:120px}.importPanel textarea{min-height:130px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333}.primary,.entryActions button:first-child,.savedItem button{background:#ffe600;color:#000;border-color:#ffe600}.danger{color:#ff9a9a!important}.actions,.entryActions,.entryControls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.message{color:#ffe600;font-weight:900}.winnerNotice{margin:4px 0 0;color:#ffe600;font-weight:900}.savedBlock{margin-top:14px}.savedList{display:grid;gap:10px;max-height:330px;overflow:auto}.savedItem{border:1px solid #242424;border-radius:16px;padding:12px;background:#050505}.bankHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px}.bankGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.entry{padding:14px}.entry.winnerEntry{border-color:rgba(255,230,0,.38);background:linear-gradient(135deg,rgba(255,230,0,.08),rgba(13,13,13,.92))}.entryTop{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:10px}.entry h3{text-transform:uppercase}.entry img{width:70px;height:70px;object-fit:contain;background:#070707;border-radius:12px}.tag,.status,.winnerBadge{display:inline-flex;width:max-content;max-width:100%;background:rgba(255,230,0,.1);border:1px solid rgba(255,230,0,.25);border-radius:999px;padding:6px 10px;color:#ffe600;font-size:12px;font-weight:900}.winnerBadge{background:#ffe600;color:#000;border-color:#ffe600}.statusApproved{background:rgba(154,255,183,.12);border-color:rgba(154,255,183,.32);color:#9affb7}.statusNeedsReview{background:rgba(255,230,0,.1);border-color:rgba(255,230,0,.28);color:#ffe600}.statusRejected{background:rgba(255,95,95,.12);border-color:rgba(255,95,95,.3);color:#ff9a9a}.entryControls select{max-width:180px}.entry pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.empty{margin:12px 0;color:#ddd;text-align:center}@media(max-width:1050px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.layout,.bankGrid{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}}@media(max-width:650px){.addPanel,.filters{grid-template-columns:1fr}.bankHead{display:grid}.actions button,.entryActions button,.bankHead button,.savedItem button{width:100%}}`}</style>
    </div>
  );
}
