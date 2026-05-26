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
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
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

function buildBankEntry({ product, type, platform, text, source = "Manual", tag = "" }) {
  return {
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
  };
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
  const [message, setMessage] = useState("");

  useEffect(() => {
    setBank(readArray(BANK_KEY));
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
      if (entry.productId && !map.has(String(entry.productId))) map.set(String(entry.productId), entry.productName);
    });
    return Array.from(map.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [products, bank]);

  const filteredBank = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bank.filter((entry) => {
      const haystack = [entry.productName, entry.productCategory, entry.type, entry.platform, entry.text, entry.tag, entry.source].join(" ").toLowerCase();
      if (productFilter !== "all" && String(entry.productId) !== String(productFilter)) return false;
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (platformFilter !== "all" && entry.platform !== platformFilter) return false;
      if (q && !haystack.includes(q)) return false;
      return true;
    });
  }, [bank, search, productFilter, typeFilter, platformFilter]);

  const savedForSelectedProduct = useMemo(() => {
    if (!selectedProduct) return [];
    const selectedKey = productKey(selectedProduct);
    return savedPacks.filter((item) => productKey(item.product) === selectedKey);
  }, [savedPacks, selectedProduct]);

  const saveBank = (next) => {
    setBank(next);
    writeArray(BANK_KEY, next);
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
    saveBank([entry, ...bank].slice(0, 500));
    setText("");
    setMessage("Approved promo text saved to the product bank.");
  };

  const importSavedPack = (item) => {
    const entries = extractSavedPackEntries(item);
    if (entries.length === 0) {
      setMessage("That saved pack did not have usable text to import.");
      return;
    }

    saveBank([...entries, ...bank].slice(0, 500));
    setMessage(`${entries.length} item${entries.length === 1 ? "" : "s"} imported into the product bank.`);
  };

  const removeEntry = (id) => {
    saveBank(bank.filter((entry) => entry.id !== id));
  };

  const exportBank = () => downloadJson("local-jagoff-product-promo-bank.json", {
    exportedAt: new Date().toISOString(),
    bank,
  });

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
          <div><strong>{bank.length}</strong><span>Total Saved</span></div>
          <div><strong>{new Set(bank.map((entry) => entry.productId || entry.productName)).size}</strong><span>Products</span></div>
          <div><strong>{bank.filter((entry) => entry.type === "caption").length}</strong><span>Captions</span></div>
          <div><strong>{bank.filter((entry) => entry.type === "hook").length}</strong><span>Hooks</span></div>
        </section>

        <section className="layout">
          <div className="panel addPanel">
            <div className="panelHead"><p className="mini">SAVE WINNER</p><h2>Add approved text</h2></div>
            <label className="full">Product<select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} disabled={productsLoading}>{productsLoading && <option>Loading products...</option>}{!productsLoading && products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label>Type<select value={type} onChange={(e) => setType(e.target.value)}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="full">Tag / note<input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Example: hoodie weather, best hook, 724 clean, ad safe..." /></label>
            <label className="full">Approved text<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the caption, hook, CTA, overlay, or note you want to save..." /></label>
            <div className="actions full"><button type="button" className="primary" onClick={addManualEntry}>Save to Product Bank</button><button type="button" onClick={exportBank}>Export Bank</button></div>
            {message && <p className="message full">{message}</p>}
          </div>

          <aside className="panel importPanel">
            <div className="panelHead"><p className="mini">IMPORT</p><h2>Saved packs for product</h2></div>
            {savedForSelectedProduct.length === 0 && <p className="muted">No saved packs found for the selected product yet.</p>}
            <div className="savedList">
              {savedForSelectedProduct.map((item) => <article key={item.id} className="savedItem"><strong>{item.source || "Saved Pack"}</strong><p>{item.promo?.brand_angle || item.promo?.facebook_post || "Saved promo pack"}</p><button type="button" onClick={() => importSavedPack(item)}>Import Text</button></article>)}
            </div>
          </aside>
        </section>

        <section className="panel bankPanel">
          <div className="bankHead"><div><p className="mini">BANK</p><h2>Approved reusable copy</h2></div><button type="button" onClick={exportBank}>Export JSON</button></div>
          <div className="filters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bank..." /><select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}><option value="all">All Products</option>{productOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All Types</option>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="all">All Platforms</option>{PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {filteredBank.length === 0 && <div className="empty">No bank entries match this view.</div>}
          <div className="bankGrid">
            {filteredBank.map((entry) => <article key={entry.id} className="entry"><div className="entryTop"><div><p className="mini">{labelFromOptions(TYPE_OPTIONS, entry.type)} • {labelFromOptions(PLATFORM_OPTIONS, entry.platform)}</p><h3>{entry.productName}</h3></div>{entry.productImage && <img src={entry.productImage} alt={entry.productName} />}</div>{entry.tag && <p className="tag">{entry.tag}</p>}<pre>{entry.text}</pre><div className="entryActions"><button type="button" onClick={() => copyText(entry.text)}>Copy</button><button type="button" className="danger" onClick={() => removeEntry(entry.id)}>Remove</button></div></article>)}
          </div>
        </section>
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1240px;margin:0 auto;padding-top:34px}.hero{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.2);border-radius:28px;padding:26px;margin-bottom:16px;box-shadow:0 22px 80px rgba(0,0,0,.4)}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p,.muted,.savedItem p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div,.panel,.empty,.entry{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{font-size:12px;font-weight:900;color:#ccc;text-transform:uppercase;letter-spacing:1px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:14px;margin-bottom:14px}.addPanel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.full,.panelHead{grid-column:1/-1}.panelHead h2,.bankHead h2{font-size:26px;text-transform:uppercase}label{display:block;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:140px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333}.primary,.bankHead button,.entryActions button:first-child,.savedItem button{background:#ffe600;color:#000;border-color:#ffe600}.danger{color:#ff9a9a!important}.actions,.entryActions{display:flex;gap:8px;flex-wrap:wrap}.message{color:#ffe600;font-weight:900}.savedList{display:grid;gap:10px;max-height:470px;overflow:auto}.savedItem{border:1px solid #242424;border-radius:16px;padding:12px;background:#050505}.bankHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px}.bankGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.entry{padding:14px}.entryTop{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:10px}.entry h3{text-transform:uppercase}.entry img{width:70px;height:70px;object-fit:contain;background:#070707;border-radius:12px}.tag{display:inline-flex;width:max-content;max-width:100%;background:rgba(255,230,0,.1);border:1px solid rgba(255,230,0,.25);border-radius:999px;padding:6px 10px;color:#ffe600;font-size:12px;font-weight:900}.entry pre{white-space:pre-wrap;color:#f2f2f2;line-height:1.55;background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.empty{margin:12px 0;color:#ddd;text-align:center}@media(max-width:950px){.layout,.bankGrid{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.addPanel,.filters{grid-template-columns:1fr}.bankHead{display:grid}.actions button,.entryActions button,.bankHead button,.savedItem button{width:100%}}`}</style>
    </div>
  );
}
