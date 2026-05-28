import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { makeFreePromoPack, normalizePromoProduct } from "../lib/promoTemplates";

const QUEUE_KEY = "localJagoffPromoQueue";
const PHRASES_KEY = "localJagoffRecentPromoPhrases";
const ADMIN_KEY = "localJagoffPromoKey";
const OPTION_MEMORY_KEY = "localJagoffPromoOptionEdits";

const MODES = [["funny_pittsburgh", "Funny Pittsburgh"], ["clean_ad", "Clean Ad Safe"], ["product_drop", "Product Drop"], ["holiday", "Holiday"], ["regenerate_no_repeat", "Regenerate / No Repeat"]];
const PLATFORMS = [["facebook", "Facebook"], ["instagram", "Instagram"]];
const TONES = [["clean", "Clean"], ["balanced", "Balanced"], ["more_jagoff", "More Jagoff"], ["savage_but_safe", "Savage but Safe"]];
const PRESETS = [
  { name: "Savage Organic", mode: "funny_pittsburgh", tone: "savage_but_safe", notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful. Do not default to generic new-drop wording unless this is actually a launch/new drop post." },
  { name: "724 Local Push", mode: "funny_pittsburgh", tone: "more_jagoff", notes: "Keep it western PA, local, gritty, and proud. Focus on 724 only if the product/title supports it. Avoid generic new-drop scripting." },
  { name: "Clean Ad-Safe", mode: "clean_ad", tone: "clean", notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive." },
  { name: "Weekend Push", mode: "funny_pittsburgh", tone: "balanced", notes: "Weekend push. Keep it casual, local, and direct. Do not invent a discount unless one is typed in the notes." },
  { name: "New Drop Only", mode: "product_drop", tone: "balanced", notes: "Use only when the product is actually a new drop or launch. Keep it product-focused, direct, and local." },
];

function readArray(key) {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function writeArray(key, value) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : [])); }
function readObject(key) {
  if (typeof window === "undefined") return {};
  try { const parsed = JSON.parse(window.localStorage.getItem(key) || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
function writeObject(key, value) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value && typeof value === "object" ? value : {})); }
function copyText(value) { if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value); }
function clean(value) { return String(value || "").trim(); }
function unique(values) { const seen = new Set(); return values.filter((value) => { const key = clean(value).toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function productUrl(product) { return product?.id ? `https://www.localjagoff.com/product/${product.id}` : "https://www.localjagoff.com"; }
function stripHashtags(text) { return clean(text).replace(/(?:^|\s)#\S+/g, "").replace(/\s{2,}/g, " ").trim(); }
function formatHashtags(value) { return Array.isArray(value) ? value.map((tag) => String(tag).trim()).filter(Boolean).join(" ") : clean(value); }
function buildTrackedLink(product, platform, mode) {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: clean(mode || "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo",
    utm_content: clean(product?.name || "local-jagoff-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "local-jagoff-product",
  });
  return `${productUrl(product)}?${params.toString()}`;
}
function five(values, fallbacks) { return unique([...values, ...fallbacks]).slice(0, 5); }
function optionKey(product, platform, field, index) { return [product?.id || product?.name || "product", platform || "facebook", field, index].join("|"); }
function applySavedOptionEdits(parts, product, platform) {
  const saved = readObject(OPTION_MEMORY_KEY);
  const next = { ...parts };
  ["opening", "main", "extra", "shop", "hashtags"].forEach((field) => {
    next[field] = (parts[field] || []).map((value, index) => saved[optionKey(product, platform, field, index)] || value);
  });
  return next;
}
function makeParts({ promo, product, platform, mode }) {
  const name = product?.name || "Local Jagoff gear";
  const link = buildTrackedLink(product, platform, mode);
  const generatedMain = platform === "instagram" ? stripHashtags(promo?.instagram_caption) : stripHashtags(promo?.facebook_post);
  const generatedSecondary = platform === "instagram" ? stripHashtags(promo?.edgy_version || promo?.clean_ad_version) : stripHashtags(promo?.clean_ad_version || promo?.edgy_version);
  const generatedTags = formatHashtags(promo?.hashtags);
  return {
    opening: five([], ["Fresh Local Jagoff gear, built for people who get the joke.", "Western PA energy, cleaned up just enough for public viewing.", "For the locals, the loud ones, and the beautifully difficult ones.", "A little local pride. A little smart mouth. That is the brand.", "Yeah, it says jagoff. That is kind of the point."]),
    main: five([generatedMain, generatedSecondary], [`${name}. Local gear for anyone who knows a jagoff when they see one.`, `${name} brings the Local Jagoff attitude without trying too hard.`, "Built for Western PA locals who like their gear with a little mouth on it.", "Not tourist gear. Not fake tough. Just Local Jagoff.", "If you get it, you get it. If not, ask a jagoff from around here."]),
    extra: five([], ["Wear it like you got somewhere to be and still stopped to talk.", "Good for errands, bad decisions, and being seen in public.", "Pittsburgh-area attitude without the boring souvenir-shop feel.", "Local enough to get the nod. Loud enough to get the look.", "Made for the people who know exactly what jagoff means."]),
    shop: five([], [`Grab yours: ${link}`, `Shop it here: ${link}`, `Get it at localjagoff.com: ${link}`, `Check it out when you get a minute: ${link}`, `Local gear is waiting: ${link}`]),
    hashtags: five([generatedTags], ["#LocalJagoff #Pittsburgh #Yinzer #WesternPA #412 #724 #PittsburghStyle", "#LocalJagoff #PittsburghGear #YinzerStyle #WesternPA #412 #724", "#LocalJagoff #Jagoff #Pittsburgh #Yinzer #PAStyle #WesternPA", "#LocalJagoff #PittsburghClothing #Yinzers #WesternPA #ShopLocal", "#LocalJagoff #BlackAndGold #Pittsburgh #Yinzer #412 #724"]),
  };
}
function buildFinalPost(selected) { return [selected.opening, selected.main, selected.extra, selected.shop, selected.hashtags].map(clean).filter(Boolean).join("\n\n"); }

function OptionGroup({ title, field, values, selected, onUse, onEdit, onSave }) {
  return (
    <section className="partCard">
      <div className="partHead"><h3>{title}</h3><span>{values.length} options</span></div>
      <div className="optionList" role="radiogroup" aria-label={title}>
        {values.map((value, index) => {
          const isSelected = selected === value;
          return (
            <div key={`${field}-${index}`} className={`optionRow ${isSelected ? "selected" : ""}`} role="radio" aria-checked={isSelected} onClick={(event) => {
              if (event.target.tagName === "TEXTAREA" || event.target.closest("button")) return;
              onUse(field, value);
            }}>
              <button type="button" className="radioButton" aria-label={`Select ${title} option ${index + 1}`} onClick={() => onUse(field, value)}><span className="radioDot" /></button>
              <textarea className="optionEdit" value={value} onChange={(event) => onEdit(field, index, event.target.value)} onFocus={() => onUse(field, value)} />
              <button type="button" className="saveOption" onClick={() => onSave(field, index, value)}>Save wording</button>
            </div>
          );
        })}
      </div>
      <label className="customLabel">Custom {title.toLowerCase()}<textarea value={selected || ""} onChange={(event) => onUse(field, event.target.value)} /></label>
    </section>
  );
}

export default function PromoStudioCore() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState("funny_pittsburgh");
  const [platform, setPlatform] = useState("facebook");
  const [toneIntensity, setToneIntensity] = useState("balanced");
  const [notes, setNotes] = useState("Keep it local and useful. Do not default to generic new-drop wording unless I specifically pick a launch/new-drop preset.");
  const [queueDate, setQueueDate] = useState("");
  const [promo, setPromo] = useState(null);
  const [promoSource, setPromoSource] = useState("");
  const [parts, setParts] = useState(null);
  const [selected, setSelected] = useState({ opening: "", main: "", extra: "", shop: "", hashtags: "" });
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);
  const [recentPhrases, setRecentPhrases] = useState([]);

  useEffect(() => {
    setAdminKey(window.localStorage.getItem(ADMIN_KEY) || "");
    setQueue(readArray(QUEUE_KEY));
    setRecentPhrases(readArray(PHRASES_KEY));
    fetch("/api/get-products").then((res) => res.json()).then((data) => {
      const cleanProducts = Array.isArray(data) ? data.map(normalizePromoProduct) : [];
      setProducts(cleanProducts);
      setSelectedId(cleanProducts[0]?.id ? String(cleanProducts[0].id) : "");
    }).catch(() => setProducts([])).finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(() => products.find((product) => String(product.id) === String(selectedId)), [products, selectedId]);
  const finalPost = useMemo(() => buildFinalPost(selected), [selected]);

  const applyPreset = (presetName) => {
    const preset = PRESETS.find((item) => item.name === presetName);
    if (!preset) return;
    setMode(preset.mode); setToneIntensity(preset.tone); setNotes(preset.notes); setMessage(`Applied ${preset.name}.`);
  };
  const buildPartsFromPromo = (nextPromo, nextPlatform = platform) => {
    const baseParts = makeParts({ promo: nextPromo, product: selectedProduct, platform: nextPlatform, mode });
    const nextParts = applySavedOptionEdits(baseParts, selectedProduct, nextPlatform);
    setParts(nextParts);
    setSelected({ opening: nextParts.opening[0] || "", main: nextParts.main[0] || "", extra: nextParts.extra[0] || "", shop: nextParts.shop[0] || "", hashtags: nextParts.hashtags[0] || "" });
  };
  const generatePromo = async () => {
    setError(""); setMessage("");
    if (!adminKey.trim()) return setError("Enter the promo generation key first.");
    if (!selectedProduct) return setError("Pick a product first.");
    setLoading(true); window.localStorage.setItem(ADMIN_KEY, adminKey.trim());
    try {
      const res = await fetch("/api/generate-promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminKey: adminKey.trim(), product: selectedProduct, mode, platform, goal: mode === "holiday" ? "holiday_promo" : "sell_product", toneIntensity, notes, recentPhrases: recentPhrases.slice(0, 40), variationSeed: `${Date.now()}-${Math.random()}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Promo generation failed.");
      setPromo(data.promo); setPromoSource("AI Generated"); buildPartsFromPromo(data.promo, platform);
      const nextPhrases = [data.promo?.facebook_post, data.promo?.instagram_caption, data.promo?.clean_ad_version, data.promo?.edgy_version].filter(Boolean).map((item) => String(item).slice(0, 180));
      const merged = [...nextPhrases, ...recentPhrases].slice(0, 60); setRecentPhrases(merged); writeArray(PHRASES_KEY, merged); setActiveTab("output");
    } catch (err) { setError(err.message || "Promo generation failed."); } finally { setLoading(false); }
  };
  const generateFreePromo = () => {
    setError(""); setMessage("");
    if (!selectedProduct) return setError("Pick a product first.");
    setFreeLoading(true);
    try { const freePromo = makeFreePromoPack(selectedProduct, { mode, platform, toneIntensity, notes }); setPromo(freePromo); setPromoSource("Free Template"); buildPartsFromPromo(freePromo, platform); setActiveTab("output"); setMessage("Free template generated. No AI credits used."); } finally { setFreeLoading(false); }
  };
  const onUsePart = (field, value) => setSelected((current) => ({ ...current, [field]: value }));
  const onEditOption = (field, index, value) => {
    setParts((current) => {
      if (!current?.[field]) return current;
      const nextValues = [...current[field]];
      const oldValue = nextValues[index];
      nextValues[index] = value;
      setSelected((selectedCurrent) => selectedCurrent[field] === oldValue ? { ...selectedCurrent, [field]: value } : selectedCurrent);
      return { ...current, [field]: nextValues };
    });
  };
  const onSaveOption = (field, index, value) => {
    const saved = readObject(OPTION_MEMORY_KEY);
    saved[optionKey(selectedProduct, platform, field, index)] = value;
    writeObject(OPTION_MEMORY_KEY, saved);
    setMessage("Saved wording. This option will reuse your edit next time for this product/platform.");
  };
  const changePlatform = (nextPlatform) => { setPlatform(nextPlatform); if (promo) buildPartsFromPromo(promo, nextPlatform); };
  const addToQueue = () => {
    if (!selectedProduct || !finalPost) return;
    const item = { id: `pack-${Date.now()}-${Math.random().toString(16).slice(2)}`, queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`, source: promoSource || "Promo Studio", createdAt: new Date().toISOString(), queuedAt: new Date().toISOString(), mode, platform, displayPlatform: platform, scheduledPlatform: platform, scheduledDate: queueDate || "", status: "Draft", toneIntensity, notes, product: selectedProduct, promo: { ...(promo || {}), builder_final: finalPost, facebook_post: platform === "facebook" ? finalPost : promo?.facebook_post || "", instagram_caption: platform === "instagram" ? finalPost : promo?.instagram_caption || "", hashtags: selected.hashtags } };
    const next = [item, ...queue].slice(0, 100); setQueue(next); writeArray(QUEUE_KEY, next); setMessage("Added to queue as Draft.");
  };
  const clearMemory = () => { setRecentPhrases([]); writeArray(PHRASES_KEY, []); setMessage("No-repeat memory cleared."); };

  return (
    <div className="promoPage">
      <Head><title>Local Jagoff Promo Studio</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className="wrap">
        <header className="hero"><div><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Promo Studio</h1><p>Facebook and Instagram promo builder for Local Jagoff posts. Generate, refine, copy, queue, and track.</p></div><div className="heroCard"><p>No auto-posting.</p><strong>You approve everything before it goes public.</strong></div></header>
        <nav className="tabs"><button type="button" className={activeTab === "create" ? "active" : ""} onClick={() => setActiveTab("create")}>Create</button><button type="button" className={activeTab === "output" ? "active" : ""} onClick={() => setActiveTab("output")}>Output</button><button type="button" className={activeTab === "queue" ? "active" : ""} onClick={() => setActiveTab("queue")}>Queue</button></nav>
        {message && <section className="message">{message}</section>}{error && <section className="error">{error}</section>}
        {activeTab === "create" && <section className="createGrid"><div className="panel controls"><p className="mini">CREATE PACK</p><h2>Generate content</h2><label className="full">Promo generation key<input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Only needed for AI generation" /></label><label className="full">Product<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={productsLoading}>{productsLoading && <option>Loading products...</option>}{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Preset<select onChange={(e) => applyPreset(e.target.value)} defaultValue=""><option value="">Manual / No Preset</option>{PRESETS.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}</select></label><label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Platform<select value={platform} onChange={(e) => changePlatform(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Tone<select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>{TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="full">Extra notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Direction, product angle, sale details, what to avoid..." /></label><div className="actions full"><button type="button" className="primary" onClick={generatePromo} disabled={loading || freeLoading}>{loading ? "Generating..." : "Generate With AI"}</button><button type="button" onClick={generateFreePromo} disabled={loading || freeLoading}>{freeLoading ? "Building..." : "Generate Free Template"}</button><button type="button" onClick={clearMemory}>Clear No-Repeat Memory</button></div></div><aside className="panel productPanel">{selectedProduct?.thumbnail_url && <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} />}<p className="mini">SELECTED PRODUCT</p><h2>{selectedProduct?.name || "No product selected"}</h2><p>{selectedProduct?.category || "gear"} {selectedProduct?.retail_price && `• $${selectedProduct.retail_price}`}</p><label>Queue date<input type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} /></label></aside></section>}
        {activeTab === "output" && <section>{!promo || !parts ? <div className="empty"><h2>No promo generated yet.</h2><p>Generate a Facebook or Instagram pack first.</p><button type="button" className="primary" onClick={() => setActiveTab("create")}>Create One</button></div> : <><div className="outputTop"><div><p className="mini">{promoSource} • {platform === "instagram" ? "Instagram" : "Facebook"}</p><h2>{selectedProduct?.name}</h2></div><div className="actions"><button type="button" className="primary" onClick={() => copyText(finalPost)}>Copy Ready Post</button><button type="button" onClick={promoSource === "Free Template" ? generateFreePromo : generatePromo} disabled={loading || freeLoading}>{loading || freeLoading ? "Regenerating..." : "Regenerate All"}</button><button type="button" onClick={addToQueue}>Add to Queue</button></div></div><div className="platformSwitch"><button type="button" className={platform === "facebook" ? "active" : ""} onClick={() => changePlatform("facebook")}>Facebook</button><button type="button" className={platform === "instagram" ? "active" : ""} onClick={() => changePlatform("instagram")}>Instagram</button></div><div className="builderGrid"><aside className="preview panel"><p className="mini">LIVE PREVIEW</p><h2>{platform === "instagram" ? "Instagram" : "Facebook"} Final Post</h2><textarea readOnly value={finalPost} /><div className="actions"><button type="button" className="primary" onClick={() => copyText(finalPost)}>Copy Ready Post</button><button type="button" onClick={addToQueue}>Add to Queue</button></div></aside><div className="parts"><OptionGroup title="Opening Statement" field="opening" values={parts.opening} selected={selected.opening} onUse={onUsePart} onEdit={onEditOption} onSave={onSaveOption} /><OptionGroup title="Main Copy" field="main" values={parts.main} selected={selected.main} onUse={onUsePart} onEdit={onEditOption} onSave={onSaveOption} /><OptionGroup title="Extra Line" field="extra" values={parts.extra} selected={selected.extra} onUse={onUsePart} onEdit={onEditOption} onSave={onSaveOption} /><OptionGroup title="Shop Line" field="shop" values={parts.shop} selected={selected.shop} onUse={onUsePart} onEdit={onEditOption} onSave={onSaveOption} /><OptionGroup title="Hashtags" field="hashtags" values={parts.hashtags} selected={selected.hashtags} onUse={onUsePart} onEdit={onEditOption} onSave={onSaveOption} /></div></div></>}</section>}
        {activeTab === "queue" && <section className="panel"><p className="mini">QUEUE</p><h2>Drafts</h2>{queue.length === 0 ? <p>No queued drafts yet.</p> : <div className="queueList">{queue.map((item) => <article key={item.queueId}><strong>{item.product?.name || "Queued Promo"}</strong><span>{item.scheduledPlatform} • {item.scheduledDate || "No date"} • {item.status || "Draft"}</span><pre>{item.promo?.builder_final || "No copy saved."}</pre></article>)}</div>}</section>}
      </main>
      <style jsx>{`.promoPage{min-height:100vh;color:#fff;background:radial-gradient(circle at 12% 0,rgba(255,230,0,.18),transparent 34%),radial-gradient(circle at 88% 10%,rgba(255,230,0,.08),transparent 30%),linear-gradient(180deg,#050505,#000);padding:34px 16px 70px}.wrap{max-width:1240px;margin:0 auto}.hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;align-items:end;margin-bottom:16px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase}h1{margin:0;font-size:clamp(42px,8vw,94px);line-height:.88;text-transform:uppercase}h2,h3{text-transform:uppercase}.hero p{color:#ddd;line-height:1.55}.heroCard,.panel,.partCard,.message,.error,.empty,.outputTop{background:linear-gradient(145deg,rgba(18,18,18,.96),rgba(4,4,4,.96));border:1px solid rgba(255,230,0,.18);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.04)}.heroCard,.panel,.partCard,.message,.error,.empty,.outputTop{padding:18px}.heroCard p{margin:0 0 8px;color:#ffe600;font-weight:900}.tabs,.actions,.platformSwitch{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.tabs button,.actions button,.platformSwitch button,.saveOption,.radioButton{border:1px solid #333;border-radius:14px;background:#1b1b1b;color:#fff;padding:12px 14px;font-weight:900;cursor:pointer;text-transform:uppercase}.tabs button.active,.platformSwitch button.active,.primary{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.message{color:#ffe600;font-weight:900;margin-bottom:14px}.error{color:#ffb4b4;border-color:rgba(255,95,95,.4);margin-bottom:14px}.createGrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.full{grid-column:1/-1}label{display:grid;gap:7px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #333;border-radius:14px;background:#050505;color:#fff;padding:12px;font-size:14px}textarea{min-height:110px;resize:vertical}.productPanel img{width:100%;height:220px;object-fit:contain;background:#070707;border-radius:16px}.outputTop{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:14px}.builderGrid{display:grid;grid-template-columns:minmax(280px,390px) minmax(0,1fr);gap:16px;align-items:start}.preview{position:sticky;top:74px}.preview textarea{min-height:430px;line-height:1.45;white-space:pre-wrap}.parts{display:grid;gap:14px}.partHead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px}.partHead h3{margin:0;color:#ffe600}.partHead span{color:#aaa;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px}.optionList{display:grid;gap:10px}.optionRow{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015));padding:12px;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}.optionRow:hover{border-color:rgba(255,230,0,.55);background:rgba(255,230,0,.08);transform:translateY(-1px)}.optionRow.selected{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.16),rgba(255,230,0,.045));box-shadow:0 0 0 2px rgba(255,230,0,.08)}.radioButton{width:30px;height:30px;border-radius:999px;padding:0;display:grid;place-items:center;background:#050505}.radioDot{width:18px;height:18px;border-radius:999px;border:2px solid #777;box-sizing:border-box;position:relative}.optionRow.selected .radioDot{border-color:#ffe600;background:#ffe600}.optionRow.selected .radioDot:after{content:"";position:absolute;inset:4px;border-radius:999px;background:#000}.optionEdit{min-height:58px;border-color:rgba(255,255,255,.08);background:rgba(0,0,0,.35);line-height:1.45}.optionEdit:focus{border-color:#ffe600;box-shadow:0 0 0 2px rgba(255,230,0,.12)}.saveOption{white-space:nowrap;border-color:rgba(255,230,0,.28);background:rgba(255,230,0,.1);color:#ffe600;padding:10px 12px;font-size:11px}.saveOption:hover{background:#ffe600;color:#000;border-color:#ffe600}.customLabel{margin-top:14px}.queueList{display:grid;gap:12px}.queueList article{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;background:#050505}.queueList strong,.queueList span{display:block}.queueList span{margin-top:6px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}.queueList pre{white-space:pre-wrap;color:#ddd;line-height:1.45}@media(max-width:900px){.hero,.createGrid,.builderGrid{grid-template-columns:1fr}.preview{position:static}.outputTop{display:grid}.controls{grid-template-columns:1fr}.actions button,.tabs button,.platformSwitch button{width:100%}.optionRow{grid-template-columns:30px minmax(0,1fr)}.saveOption{grid-column:1/-1;width:100%}}`}</style>
    </div>
  );
}
