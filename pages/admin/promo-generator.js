import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  formatPromoHashtags,
  makeFreePromoPack,
  normalizePromoProduct,
} from "../../lib/promoTemplates";

const MODES = [
  { value: "product_drop", label: "Product Drop" },
  { value: "funny_pittsburgh", label: "Funny Pittsburgh" },
  { value: "clean_ad", label: "Clean Ad Safe" },
  { value: "short_video", label: "Short Video" },
  { value: "regenerate_no_repeat", label: "Regenerate / No Repeat" },
];

const PLATFORMS = [
  { value: "full_pack", label: "Full Pack" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
];

const TONES = [
  { value: "clean", label: "Clean" },
  { value: "balanced", label: "Balanced" },
  { value: "more_jagoff", label: "More Jagoff" },
  { value: "savage_but_safe", label: "Savage but Safe" },
];

const SECTION_LABELS = {
  create: "Create",
  results: "Current Pack",
  saved: "Saved",
  queue: "Queue",
  products: "Products",
  rules: "Rules",
};

function copyText(value) {
  if (!value || typeof navigator === "undefined") return;
  navigator.clipboard.writeText(value);
}

function niceDate(value) {
  if (!value) return "Not scheduled";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (err) {
    return value;
  }
}

function formatPackText(pack) {
  if (!pack) return "";

  const script = Array.isArray(pack.short_video_script)
    ? pack.short_video_script
        .map(
          (s) =>
            `${s.scene}\nVisual: ${s.visual}\nText: ${s.on_screen_text}\nVoiceover: ${s.voiceover}`
        )
        .join("\n\n")
    : "";

  return [
    `Brand Angle:\n${pack.brand_angle || ""}`,
    `Facebook Post:\n${pack.facebook_post || ""}`,
    `Instagram Caption:\n${pack.instagram_caption || ""}`,
    `TikTok Caption:\n${pack.tiktok_caption || ""}`,
    `YouTube Shorts Title:\n${pack.youtube_shorts_title || ""}`,
    `YouTube Shorts Description:\n${pack.youtube_shorts_description || ""}`,
    `Hashtags:\n${formatPromoHashtags(pack.hashtags)}`,
    `Video Hooks:\n${(pack.video_hooks || []).join("\n")}`,
    `Short Video Script:\n${script}`,
    `Image Overlay Text:\n${(pack.image_overlay_text || []).join("\n")}`,
    `Alt Text:\n${pack.alt_text || ""}`,
    `Clean Ad Version:\n${pack.clean_ad_version || ""}`,
    `Edgy Version:\n${pack.edgy_version || ""}`,
    `CTA:\n${pack.cta || ""}`,
  ].join("\n\n---\n\n");
}

function downloadJson(filename, data) {
  if (typeof document === "undefined") return;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function ResultBlock({ title, value, pre = false }) {
  const text = Array.isArray(value) ? value.join("\n") : String(value || "");

  return (
    <div className="resultBlock">
      <div className="resultTop">
        <h3>{title}</h3>
        <button type="button" onClick={() => copyText(text)}>
          Copy
        </button>
      </div>
      {pre ? <pre>{text}</pre> : <p>{text}</p>}
    </div>
  );
}

function ScriptBlock({ scenes }) {
  const scriptText = Array.isArray(scenes)
    ? scenes
        .map(
          (s) =>
            `${s.scene}\nVisual: ${s.visual}\nText: ${s.on_screen_text}\nVoiceover: ${s.voiceover}`
        )
        .join("\n\n")
    : "";

  return (
    <div className="resultBlock wide">
      <div className="resultTop">
        <h3>Short Video Script</h3>
        <button type="button" onClick={() => copyText(scriptText)}>
          Copy
        </button>
      </div>
      <div className="scriptGrid">
        {(scenes || []).map((scene, index) => (
          <div key={`${scene.scene}-${index}`} className="scriptScene">
            <strong>{scene.scene}</strong>
            <p>
              <span>Visual:</span> {scene.visual}
            </p>
            <p>
              <span>Text:</span> {scene.on_screen_text}
            </p>
            <p>
              <span>Voiceover:</span> {scene.voiceover}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedPackCard({ item, onLoad, onDelete, onQueue }) {
  return (
    <article className="savedCard">
      <div className="savedTop">
        <div>
          <p className="miniKicker">{item.source || "Saved Pack"}</p>
          <h3>{item.product?.name || "Promo Pack"}</h3>
        </div>
        {item.product?.thumbnail_url && (
          <img src={item.product.thumbnail_url} alt={item.product.name || "Product"} />
        )}
      </div>

      <p className="savedMeta">
        {item.mode || "mode"} • {item.platform || "platform"} • {niceDate(item.createdAt)}
      </p>

      <p className="savedCaption">
        {item.promo?.brand_angle || item.promo?.facebook_post || "Saved promo pack"}
      </p>

      <div className="savedActions">
        <button type="button" onClick={() => onLoad(item)}>
          Load
        </button>
        <button type="button" onClick={() => copyText(formatPackText(item.promo))}>
          Copy All
        </button>
        <button type="button" onClick={() => onQueue(item)}>
          Queue
        </button>
        <button type="button" className="danger" onClick={() => onDelete(item.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function PromoGenerator() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [mode, setMode] = useState("product_drop");
  const [platform, setPlatform] = useState("full_pack");
  const [toneIntensity, setToneIntensity] = useState("balanced");
  const [goal, setGoal] = useState("sell_product");
  const [notes, setNotes] = useState("");
  const [recentPhrases, setRecentPhrases] = useState([]);
  const [promo, setPromo] = useState(null);
  const [promoSource, setPromoSource] = useState("");
  const [savedPacks, setSavedPacks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("create");
  const [productSearch, setProductSearch] = useState("");
  const [queueDate, setQueueDate] = useState("");
  const [queuePlatform, setQueuePlatform] = useState("instagram");

  useEffect(() => {
    const savedKey = localStorage.getItem("localJagoffPromoKey") || "";
    const savedPhrases = JSON.parse(
      localStorage.getItem("localJagoffRecentPromoPhrases") || "[]"
    );
    const storedPacks = JSON.parse(
      localStorage.getItem("localJagoffSavedPromoPacks") || "[]"
    );
    const storedQueue = JSON.parse(
      localStorage.getItem("localJagoffPromoQueue") || "[]"
    );

    setAdminKey(savedKey);
    setRecentPhrases(Array.isArray(savedPhrases) ? savedPhrases : []);
    setSavedPacks(Array.isArray(storedPacks) ? storedPacks : []);
    setQueue(Array.isArray(storedQueue) ? storedQueue : []);
  }, []);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const clean = Array.isArray(data) ? data.map(normalizePromoProduct) : [];
        setProducts(clean);
        setSelectedId(clean[0]?.id ? String(clean[0].id) : "");
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((product) => String(product.id) === String(selectedId));
  }, [products, selectedId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    if (!q) return products;

    return products.filter((product) =>
      [product.name, product.category, product.id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, productSearch]);

  const filteredRecentPhrases = useMemo(() => {
    return recentPhrases.filter(Boolean).slice(0, 40);
  }, [recentPhrases]);

  const stats = useMemo(() => {
    return {
      productCount: products.length,
      savedCount: savedPacks.length,
      queuedCount: queue.length,
      freeCount: savedPacks.filter((item) => item.source === "Free Template").length,
      aiCount: savedPacks.filter((item) => item.source === "AI Generated").length,
    };
  }, [products, savedPacks, queue]);

  const saveRecentPhrases = (nextPromo) => {
    const newPhrases = [
      nextPromo?.brand_angle,
      nextPromo?.cta,
      nextPromo?.facebook_post,
      nextPromo?.instagram_caption,
      nextPromo?.tiktok_caption,
      ...(nextPromo?.video_hooks || []),
      ...(nextPromo?.image_overlay_text || []),
    ]
      .filter(Boolean)
      .map((item) => String(item).slice(0, 180));

    const next = [...newPhrases, ...recentPhrases].slice(0, 60);

    setRecentPhrases(next);
    localStorage.setItem("localJagoffRecentPromoPhrases", JSON.stringify(next));
  };

  const generateAiPromo = async () => {
    setError("");
    setPromo(null);

    if (!adminKey.trim()) {
      setError("Enter the promo generation key first.");
      return;
    }

    if (!selectedProduct) {
      setError("Pick a product first.");
      return;
    }

    setLoading(true);
    localStorage.setItem("localJagoffPromoKey", adminKey.trim());

    try {
      const res = await fetch("/api/generate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          product: selectedProduct,
          mode,
          platform,
          goal,
          toneIntensity,
          notes,
          recentPhrases: filteredRecentPhrases,
          variationSeed: `${Date.now()}-${Math.random()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Promo generation failed.");
      }

      setPromo(data.promo);
      setPromoSource("AI Generated");
      saveRecentPhrases(data.promo);
      setActiveSection("results");
    } catch (err) {
      setError(err.message || "Promo generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const generateFreePromo = () => {
    setError("");

    if (!selectedProduct) {
      setError("Pick a product first.");
      return;
    }

    const pack = makeFreePromoPack(selectedProduct, {
      mode,
      platform,
      goal,
      toneIntensity,
      notes,
    });

    setPromo(pack);
    setPromoSource("Free Template");
    saveRecentPhrases(pack);
    setActiveSection("results");
  };

  const buildCurrentItem = () => {
    if (!promo || !selectedProduct) return null;

    return {
      id: `pack-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      source: promoSource || "Current Pack",
      createdAt: new Date().toISOString(),
      mode,
      platform,
      toneIntensity,
      goal,
      notes,
      product: selectedProduct,
      promo,
    };
  };

  const saveCurrentPack = () => {
    const item = buildCurrentItem();

    if (!item) return;

    const next = [item, ...savedPacks].slice(0, 80);

    setSavedPacks(next);
    localStorage.setItem("localJagoffSavedPromoPacks", JSON.stringify(next));
    setActiveSection("saved");
  };

  const deleteSavedPack = (id) => {
    const next = savedPacks.filter((item) => item.id !== id);

    setSavedPacks(next);
    localStorage.setItem("localJagoffSavedPromoPacks", JSON.stringify(next));
  };

  const loadSavedPack = (item) => {
    setPromo(item.promo);
    setPromoSource(item.source || "Saved Pack");
    setSelectedId(String(item.product?.id || selectedId));
    setMode(item.mode || mode);
    setPlatform(item.platform || platform);
    setToneIntensity(item.toneIntensity || toneIntensity);
    setGoal(item.goal || goal);
    setNotes(item.notes || "");
    setActiveSection("results");
  };

  const addToQueue = (item) => {
    const packItem = item || buildCurrentItem();

    if (!packItem) return;

    const nextItem = {
      ...packItem,
      queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      queuedAt: new Date().toISOString(),
      scheduledDate: queueDate || "",
      scheduledPlatform: queuePlatform,
      status: "Draft",
    };

    const next = [nextItem, ...queue].slice(0, 80);

    setQueue(next);
    localStorage.setItem("localJagoffPromoQueue", JSON.stringify(next));
    setActiveSection("queue");
  };

  const removeQueueItem = (queueId) => {
    const next = queue.filter((item) => item.queueId !== queueId);

    setQueue(next);
    localStorage.setItem("localJagoffPromoQueue", JSON.stringify(next));
  };

  const clearMemory = () => {
    setRecentPhrases([]);
    localStorage.removeItem("localJagoffRecentPromoPhrases");
  };

  const exportDashboard = () => {
    downloadJson("local-jagoff-promo-dashboard.json", {
      exportedAt: new Date().toISOString(),
      savedPacks,
      queue,
    });
  };

  return (
    <div className="promoPage">
      <Head>
        <title>Local Jagoff Promo Command Center</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Promo Command Center</h1>
            <p>
              Generate Local Jagoff posts, save promo packs, queue campaign ideas,
              and use a free template mode when you do not want to spend API money.
            </p>
          </div>

          <div className="heroCard">
            <p>No auto-posting yet.</p>
            <strong>You approve everything before it goes public.</strong>
          </div>
        </header>

        <section className="statsGrid">
          <div className="statCard">
            <span>{stats.productCount}</span>
            <p>Products loaded</p>
          </div>
          <div className="statCard">
            <span>{stats.savedCount}</span>
            <p>Saved packs</p>
          </div>
          <div className="statCard">
            <span>{stats.queuedCount}</span>
            <p>Queued drafts</p>
          </div>
          <div className="statCard">
            <span>{stats.freeCount}</span>
            <p>Free saves</p>
          </div>
          <div className="statCard">
            <span>{stats.aiCount}</span>
            <p>AI saves</p>
          </div>
        </section>

        <nav className="dashboardNav" aria-label="Promo dashboard sections">
          {Object.entries(SECTION_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeSection === value ? "active" : ""}
              onClick={() => setActiveSection(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeSection === "create" && (
          <section className="dashboardGrid">
            <div className="panel controls">
              <div className="panelHead">
                <p className="miniKicker">CREATE PACK</p>
                <h2>Generate content</h2>
              </div>

              <div className="field full">
                <label>Promo generation key</label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter your private generation key"
                  autoComplete="off"
                />
              </div>

              <div className="field full">
                <label>Product</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={productsLoading}
                >
                  {productsLoading && <option>Loading products...</option>}
                  {!productsLoading && products.length === 0 && (
                    <option>No products found</option>
                  )}
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  {MODES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORMS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}</option>))}</select></div><div className="field"><label>Tone</label><select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>{TONES.map((item) => (<option key={item.value} value={item.value}>{item.label}</option>))}</select></div><div className="field"><label>Goal</label><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="sell_product, product_drop, brand_awareness..." /></div><div className="field full"><label>Extra notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: make it more 724, less salesy, mention hoodie season, avoid Steelers references, etc." /></div><div className="actions full"><button type="button" className="primary" onClick={generateAiPromo} disabled={loading}>{loading ? "Generating..." : "Generate With AI"}</button><button type="button" className="freeBtn" onClick={generateFreePromo}>Generate Free Template Pack</button><button type="button" className="ghost" onClick={clearMemory}>Clear No-Repeat Memory</button></div>{error && <div className="error full">{error}</div>}</div><aside className="sidePanel"><div className="selectedProduct">{selectedProduct?.thumbnail_url && (<img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} />)}<div><p className="miniKicker">SELECTED PRODUCT</p><h2>{selectedProduct?.name || "No product selected"}</h2><p>{selectedProduct?.category || "gear"}{" "}{selectedProduct?.retail_price && `• $${selectedProduct.retail_price}`}</p></div></div><div className="costCard"><p className="miniKicker">COST CONTROL</p><h3>Two ways to generate</h3><p><strong>AI button:</strong> uses your OpenAI API key and may cost a tiny amount.</p><p><strong>Free button:</strong> uses saved Local Jagoff templates and costs $0.</p></div><div className="queueSetup"><p className="miniKicker">QUEUE DEFAULTS</p><label>Planned date</label><input type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} /><label>Planned platform</label><select value={queuePlatform} onChange={(e) => setQueuePlatform(e.target.value)}>{PLATFORMS.filter((p) => p.value !== "full_pack").map((item) => (<option key={item.value} value={item.value}>{item.label}</option>))}</select></div></aside></section>)}

        {activeSection === "results" && (
          <section>
            {!promo && (
              <div className="emptyPanel">
                <h2>No current promo pack yet.</h2>
                <p>Generate one with AI or free template mode first.</p>
                <button type="button" className="primary" onClick={() => setActiveSection("create")}>Create One</button>
              </div>
            )}

            {promo && (
              <>
                <div className="resultToolbar"><div><p className="miniKicker">{promoSource || "CURRENT PACK"}</p><h2>{selectedProduct?.name || "Promo Pack"}</h2></div><div className="toolbarActions"><button type="button" onClick={() => copyText(formatPackText(promo))}>Copy Full Pack</button><button type="button" onClick={saveCurrentPack}>Save Pack</button><button type="button" onClick={() => addToQueue()}>Add to Queue</button><button type="button" onClick={() => downloadJson("local-jagoff-current-promo.json", promo)}>Export JSON</button></div></div>
                <section className="results"><ResultBlock title="Brand Angle" value={promo.brand_angle} /><ResultBlock title="Facebook Post" value={promo.facebook_post} /><ResultBlock title="Instagram Caption" value={promo.instagram_caption} /><ResultBlock title="TikTok Caption" value={promo.tiktok_caption} /><ResultBlock title="YouTube Shorts Title" value={promo.youtube_shorts_title} /><ResultBlock title="YouTube Shorts Description" value={promo.youtube_shorts_description} /><ResultBlock title="Hashtags" value={formatPromoHashtags(promo.hashtags)} /><ResultBlock title="Video Hooks" value={promo.video_hooks} pre /><ScriptBlock scenes={promo.short_video_script} /><ResultBlock title="Image Overlay Text" value={promo.image_overlay_text} pre /><ResultBlock title="Alt Text" value={promo.alt_text} /><ResultBlock title="Clean Ad Version" value={promo.clean_ad_version} /><ResultBlock title="Edgy Version" value={promo.edgy_version} /><ResultBlock title="CTA" value={promo.cta} />{promo.warnings?.length > 0 && (<ResultBlock title="Warnings / Notes" value={promo.warnings} pre />)}</section>
              </>
            )}
          </section>
        )}

        {activeSection === "saved" && (<section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">CONTENT LIBRARY</p><h2>Saved promo packs</h2></div><button type="button" onClick={exportDashboard}>Export Dashboard</button></div>{savedPacks.length === 0 && <p className="muted">No saved packs yet.</p>}<div className="savedGrid">{savedPacks.map((item) => (<SavedPackCard key={item.id} item={item} onLoad={loadSavedPack} onDelete={deleteSavedPack} onQueue={addToQueue} />))}</div></section>)}
        {activeSection === "queue" && (<section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">CAMPAIGN QUEUE</p><h2>Draft schedule board</h2></div><button type="button" onClick={exportDashboard}>Export Queue</button></div><p className="muted">Planning queue only. It does not publish to Facebook, Instagram, TikTok, or YouTube yet.</p>{queue.length === 0 && <p className="muted">Nothing queued yet.</p>}<div className="queueList">{queue.map((item) => (<article key={item.queueId} className="queueItem"><div><p className="miniKicker">{item.scheduledPlatform} • {niceDate(item.scheduledDate)}</p><h3>{item.product?.name || "Queued Promo"}</h3><p>{item.promo?.brand_angle || item.promo?.facebook_post}</p></div><div className="queueActions"><button type="button" onClick={() => loadSavedPack(item)}>Load</button><button type="button" onClick={() => copyText(formatPackText(item.promo))}>Copy</button><button type="button" className="danger" onClick={() => removeQueueItem(item.queueId)}>Remove</button></div></article>))}</div></section>)}
        {activeSection === "products" && (<section className="panel libraryPanel"><div className="panelHead rowHead"><div><p className="miniKicker">PRODUCT LIBRARY</p><h2>Loaded from your store API</h2></div><input className="searchInput" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." /></div><div className="productGrid">{filteredProducts.map((product) => (<button key={product.id} type="button" className={`productTile ${String(product.id) === String(selectedId) ? "selected" : ""}`} onClick={() => { setSelectedId(String(product.id)); setActiveSection("create"); }}><img src={product.thumbnail_url || "/images/placeholder.jpg"} alt={product.name} /><strong>{product.name}</strong><span>{product.category} {product.retail_price && `• $${product.retail_price}`}</span></button>))}</div></section>)}
        {activeSection === "rules" && (<section className="brandGrid"><div className="panel brandCard"><p className="miniKicker">BRAND BRAIN</p><h2>Hard rules</h2><ul><li>Never mention fulfillment vendors, supplier setup, internal APIs, or production workflow.</li><li>Do not make fake claims about material, shipping speed, discounts, guarantees, or origin.</li><li>Keep it Pittsburgh / Western PA, black-and-gold, gritty, funny, and direct.</li><li>Avoid generic ecommerce phrases like “elevate your wardrobe” or “must-have.”</li><li>Generate options that still need your approval before posting.</li></ul></div><div className="panel brandCard"><p className="miniKicker">NEXT PHASE</p><h2>What this does not do yet</h2><ul><li>No Facebook, Instagram, TikTok, or YouTube publishing yet.</li><li>Saved packs live in this browser, not on a database yet.</li><li>No image/video rendering yet; this plans scripts and overlay text.</li><li>No analytics tracking yet.</li></ul></div></section>)}
      </main>

      <style jsx>{`
        .promoPage{min-height:100vh;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),radial-gradient(circle at bottom right,rgba(255,230,0,.08),transparent 26%),linear-gradient(180deg,rgba(0,0,0,.95),rgba(0,0,0,.99));padding:34px 16px 70px}.wrap{max-width:1260px;margin:0 auto}.hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:end;margin-bottom:20px}.kicker,.miniKicker{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.miniKicker{font-size:11px;letter-spacing:1.4px}h1{font-size:clamp(38px,7vw,86px);line-height:.92;text-transform:uppercase}h2,h3{text-transform:uppercase}.hero p:last-child{max-width:780px;color:#d8d8d8;font-size:16px;line-height:1.6}.heroCard,.panel,.resultBlock,.statCard,.savedCard,.queueItem,.selectedProduct,.costCard,.queueSetup,.emptyPanel{background:rgba(13,13,13,.88);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 22px 80px rgba(0,0,0,.42)}.heroCard{padding:18px}.heroCard p{margin:0 0 8px;color:#ffe600;font-weight:900}.heroCard strong{display:block;line-height:1.35}.statsGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.statCard{padding:16px}.statCard span{display:block;color:#ffe600;font-size:28px;font-weight:900}.statCard p{margin:4px 0 0;color:#ccc;font-size:12px;text-transform:uppercase;letter-spacing:1px}.dashboardNav{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}button{border:none;border-radius:14px;padding:12px 16px;cursor:pointer;font-weight:900;letter-spacing:.5px}.dashboardNav button,.ghost,.resultTop button,.toolbarActions button,.savedActions button,.queueActions button,.rowHead button{color:#fff;background:#1b1b1b;border:1px solid #333}.dashboardNav button.active,.primary{color:#000;background:#ffe600;box-shadow:0 12px 28px rgba(255,230,0,.16)}.freeBtn{color:#ffe600;background:rgba(255,230,0,.08);border:1px solid rgba(255,230,0,.42)}.danger{color:#ff9a9a!important}button:disabled{opacity:.6;cursor:not-allowed}.dashboardGrid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}.panelHead{grid-column:1/-1}.panelHead h2{font-size:30px}.full{grid-column:1/-1}.field label,.queueSetup label{display:block;margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:13px 14px;outline:none}textarea{min-height:118px;resize:vertical}input:focus,select:focus,textarea:focus{border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.12)}.sidePanel{display:grid;gap:14px;align-content:start}.selectedProduct,.costCard,.queueSetup{padding:16px}.selectedProduct{display:grid;gap:14px}.selectedProduct img{width:100%;max-height:230px;object-fit:contain;border-radius:16px;background:#070707}.selectedProduct h2{font-size:24px}.selectedProduct p:last-child{color:#bbb;text-transform:uppercase;letter-spacing:1px;font-size:12px;font-weight:800}.costCard p,.queueSetup p,.muted{color:#cfcfcf;line-height:1.55}.queueSetup label{margin-top:12px}.actions{display:flex;flex-wrap:wrap;gap:12px}.error{color:#fff;background:rgba(170,0,0,.35);border:1px solid rgba(255,90,90,.5);border-radius:14px;padding:12px 14px;font-weight:800}.resultToolbar{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:16px;padding:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px}.toolbarActions,.savedActions,.queueActions{display:flex;flex-wrap:wrap;gap:8px}.results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.resultBlock{padding:18px}.wide{grid-column:1/-1}.resultTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.resultTop h3{color:#ffe600;font-size:18px}.resultBlock p,.resultBlock pre{margin:0;color:#f3f3f3;font-size:15px;line-height:1.58;white-space:pre-wrap}.scriptGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.scriptScene{padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px}.scriptScene strong{display:block;color:#ffe600;margin-bottom:8px}.scriptScene p{margin:7px 0;color:#ddd}.scriptScene span{color:#fff;font-weight:900}.emptyPanel{padding:24px;text-align:center}.libraryPanel{padding:20px}.rowHead{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:16px}.searchInput{max-width:320px}.savedGrid,.productGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.savedCard{padding:16px}.savedTop{display:grid;grid-template-columns:minmax(0,1fr) 72px;gap:10px;align-items:start}.savedTop img{width:72px;height:72px;object-fit:contain;background:#070707;border-radius:12px}.savedCard h3{font-size:18px}.savedMeta{color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px}.savedCaption{color:#ddd;line-height:1.5}.queueList{display:grid;gap:12px}.queueItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:16px;align-items:center}.queueItem h3{font-size:18px}.queueItem p{color:#ddd}.productTile{text-align:left;color:#fff;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px;display:grid;gap:10px}.productTile.selected{border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.08)}.productTile img{width:100%;height:160px;object-fit:contain;background:#070707;border-radius:14px}.productTile strong{font-size:15px}.productTile span{color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px}.brandGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.brandCard{padding:22px}.brandCard ul{margin:16px 0 0;padding-left:22px;color:#ddd;line-height:1.7}@media(max-width:980px){.hero,.dashboardGrid,.brandGrid{grid-template-columns:1fr}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.savedGrid,.productGrid,.results,.scriptGrid{grid-template-columns:1fr}.queueItem,.resultToolbar,.rowHead{grid-template-columns:1fr;display:grid}}@media(max-width:620px){.promoPage{padding-top:22px}.controls{grid-template-columns:1fr}.actions button,.toolbarActions button,.savedActions button,.queueActions button{width:100%}.statsGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
