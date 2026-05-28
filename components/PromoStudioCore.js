import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { makeFreePromoPack, normalizePromoProduct } from "../lib/promoTemplates";

const QUEUE_KEY = "localJagoffPromoQueue";
const PHRASES_KEY = "localJagoffRecentPromoPhrases";
const ADMIN_KEY = "localJagoffPromoKey";
const OPTION_MEMORY_KEY = "localJagoffPromoOptionEdits";

const SECTION_KEYS = ["opening", "main", "extra", "shop", "hashtags"];
const DEFAULT_OPEN_SECTIONS = { opening: true, main: true, extra: false, shop: false, hashtags: false };
const ALL_OPEN_SECTIONS = { opening: true, main: true, extra: true, shop: true, hashtags: true };
const ALL_CLOSED_SECTIONS = { opening: false, main: false, extra: false, shop: false, hashtags: false };

const MODES = [
  ["funny_pittsburgh", "Funny Pittsburgh"],
  ["clean_ad", "Clean Ad Safe"],
  ["product_drop", "Product Drop"],
  ["holiday", "Holiday"],
  ["regenerate_no_repeat", "Regenerate / No Repeat"],
];

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

function readObject(key) {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeObject(key, value) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value && typeof value === "object" ? value : {}));
}

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = clean(value).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function productUrl(product) {
  return product?.id ? `https://www.localjagoff.com/product/${product.id}` : "https://www.localjagoff.com";
}

function stripHashtags(text) {
  return clean(text).replace(/(?:^|\s)#\S+/g, "").replace(/\s{2,}/g, " ").trim();
}

function formatHashtags(value) {
  return Array.isArray(value) ? value.map((tag) => String(tag).trim()).filter(Boolean).join(" ") : clean(value);
}

function buildTrackedLink(product, platform, mode) {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: clean(mode || "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo",
    utm_content: clean(product?.name || "local-jagoff-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "local-jagoff-product",
  });
  return `${productUrl(product)}?${params.toString()}`;
}

function five(values, fallbacks) {
  return unique([...values, ...fallbacks]).slice(0, 5);
}

function optionKey(product, platform, field, index) {
  return [product?.id || product?.name || "product", platform || "facebook", field, index].join("|");
}

function applySavedOptionEdits(parts, product, platform) {
  const saved = readObject(OPTION_MEMORY_KEY);
  const next = { ...parts };
  SECTION_KEYS.forEach((field) => {
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
    opening: five([], [
      "Fresh Local Jagoff gear, built for people who get the joke.",
      "Western PA energy, cleaned up just enough for public viewing.",
      "For the locals, the loud ones, and the beautifully difficult ones.",
      "A little local pride. A little smart mouth. That is the brand.",
      "Yeah, it says jagoff. That is kind of the point.",
    ]),
    main: five([generatedMain, generatedSecondary], [
      `${name}. Local gear for anyone who knows a jagoff when they see one.`,
      `${name} brings the Local Jagoff attitude without trying too hard.`,
      "Built for Western PA locals who like their gear with a little mouth on it.",
      "Not tourist gear. Not fake tough. Just Local Jagoff.",
      "If you get it, you get it. If not, ask a jagoff from around here.",
    ]),
    extra: five([], [
      "Wear it like you got somewhere to be and still stopped to talk.",
      "Good for errands, bad decisions, and being seen in public.",
      "Pittsburgh-area attitude without the boring souvenir-shop feel.",
      "Local enough to get the nod. Loud enough to get the look.",
      "Made for the people who know exactly what jagoff means.",
    ]),
    shop: five([], [
      `Grab yours: ${link}`,
      `Shop it here: ${link}`,
      `Get it at localjagoff.com: ${link}`,
      `Check it out when you get a minute: ${link}`,
      `Local gear is waiting: ${link}`,
    ]),
    hashtags: five([generatedTags], [
      "#LocalJagoff #Pittsburgh #Yinzer #WesternPA #412 #724 #PittsburghStyle",
      "#LocalJagoff #PittsburghGear #YinzerStyle #WesternPA #412 #724",
      "#LocalJagoff #Jagoff #Pittsburgh #Yinzer #PAStyle #WesternPA",
      "#LocalJagoff #PittsburghClothing #Yinzers #WesternPA #ShopLocal",
      "#LocalJagoff #BlackAndGold #Pittsburgh #Yinzer #412 #724",
    ]),
  };
}

function buildFinalPost(selected) {
  return [selected.opening, selected.main, selected.extra, selected.shop, selected.hashtags].map(clean).filter(Boolean).join("\n\n");
}

function optionTone(field, index) {
  const map = {
    opening: ["Hook", "Local", "Community", "Brand", "Bold"],
    main: ["Generated", "Clean", "Direct", "Brand", "Local"],
    extra: ["Casual", "Funny", "Local", "Loud", "Clear"],
    shop: ["Direct", "Shop", "Brand", "Soft CTA", "Simple"],
    hashtags: ["Reach", "Gear", "Brand", "Local", "Black/Gold"],
  };
  return map[field]?.[index] || "Option";
}

function shortPreview(value) {
  const text = clean(value);
  if (!text) return "No selection yet.";
  return text.length > 118 ? `${text.slice(0, 118)}...` : text;
}

function platformLabel(platform) {
  return platform === "instagram" ? "Instagram" : "Facebook";
}

function splitPreviewText(finalPost) {
  const lines = String(finalPost || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hashtags = lines.filter((line) => line.startsWith("#") || line.includes(" #"));
  const linkLine = lines.find((line) => /https?:\/\//i.test(line));
  const body = lines.filter((line) => line !== linkLine && !hashtags.includes(line));
  return { body, hashtags, linkLine };
}

function SocialPreview({ platform, product, finalPost, isEditing, draft, onDraftChange, onEdit, onSave, onCancel, onCopy, onQueue }) {
  const { body, hashtags, linkLine } = splitPreviewText(finalPost);

  return (
    <aside className="preview panel">
      <div className="previewTop">
        <div className="brandMark">LJ</div>
        <div>
          <p className="mini">LIVE PREVIEW</p>
          <h2>{platformLabel(platform)} Post</h2>
        </div>
        <span>{platformLabel(platform)}</span>
      </div>

      <div className={`socialCard ${isEditing ? "editingPreview" : ""}`}>
        <div className="socialHeader">
          <div className="avatar">👑</div>
          <div><strong>Local Jagoff</strong><small>{isEditing ? "Editing direct preview" : "Preview • Manual post"}</small></div>
        </div>

        {product?.thumbnail_url && <img className="previewProduct" src={product.thumbnail_url} alt={product.name} />}

        {isEditing ? (
          <textarea className="directPreviewEditor" value={draft} onChange={(event) => onDraftChange(event.target.value)} autoFocus />
        ) : (
          <button type="button" className="previewCopy" onClick={onEdit} aria-label="Edit final post preview directly">
            {body.length ? body.map((line, index) => <p key={`body-${index}`}>{line}</p>) : <p>No copy selected yet.</p>}
            {linkLine && <div className="previewLink">{linkLine}</div>}
            {hashtags.length > 0 && <div className="previewTags">{hashtags.join(" ")}</div>}
          </button>
        )}
      </div>

      <div className="previewActions">
        {isEditing ? (
          <>
            <button type="button" className="primary" onClick={onSave}>Save Preview</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit}>Edit Preview</button>
            <button type="button" className="primary" onClick={onCopy}>Copy Ready Post</button>
            <button type="button" onClick={onQueue}>Add to Queue</button>
          </>
        )}
      </div>
    </aside>
  );
}

function OptionGroup({ title, field, values, selected, isOpen, editingKey, onToggle, onUse, onEdit, onSave, onEditStart, onEditCancel }) {
  return (
    <section className={`partCard ${isOpen ? "open" : "collapsed"}`}>
      <button type="button" className="partHeadButton" onClick={onToggle} aria-expanded={isOpen}>
        <div>
          <div className="partTitleRow"><h3>{title}</h3><span>{values.length} options</span></div>
          <p>{shortPreview(selected)}</p>
        </div>
        <span className="chevron">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="partBody">
          <div className="optionList" role="radiogroup" aria-label={title}>
            {values.map((value, index) => {
              const isSelected = selected === value;
              const key = `${field}-${index}`;
              const isEditing = editingKey === key;

              return (
                <article key={key} className={`optionTile ${isSelected ? "selected" : ""} ${isEditing ? "editing" : ""}`} role="radio" aria-checked={isSelected}>
                  <div className="optionTop">
                    <button type="button" className="radioOnly" onClick={() => onUse(field, value)} aria-label={`Select ${title} option ${index + 1}`}>
                      <span className="radioDot" aria-hidden="true" />
                    </button>

                    {isEditing ? (
                      <textarea className="inlineOptionEditor" value={value} onChange={(event) => onEdit(field, index, event.target.value)} autoFocus />
                    ) : (
                      <button type="button" className="optionTextButton" onClick={() => onUse(field, value)}>
                        <span className="optionCopy">{value}</span>
                      </button>
                    )}

                    <span className="tonePill">{optionTone(field, index)}</span>
                  </div>

                  <div className="optionActions">
                    {isEditing ? (
                      <>
                        <button type="button" className="primary" onClick={() => { onUse(field, value); onSave(field, index, value); onEditCancel(); }}>Save + Use</button>
                        <button type="button" onClick={onEditCancel}>Close</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => onEditStart(key)}>Edit</button>
                        <button type="button" onClick={() => onSave(field, index, value)}>Save</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
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
  const [manualFinalPost, setManualFinalPost] = useState("");
  const [previewDraft, setPreviewDraft] = useState("");
  const [previewEditing, setPreviewEditing] = useState(false);
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);
  const [recentPhrases, setRecentPhrases] = useState([]);
  const [editingKey, setEditingKey] = useState("");

  useEffect(() => {
    setAdminKey(window.localStorage.getItem(ADMIN_KEY) || "");
    setQueue(readArray(QUEUE_KEY));
    setRecentPhrases(readArray(PHRASES_KEY));
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const cleanProducts = Array.isArray(data) ? data.map(normalizePromoProduct) : [];
        setProducts(cleanProducts);
        setSelectedId(cleanProducts[0]?.id ? String(cleanProducts[0].id) : "");
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(() => products.find((product) => String(product.id) === String(selectedId)), [products, selectedId]);
  const generatedFinalPost = useMemo(() => buildFinalPost(selected), [selected]);
  const finalPost = manualFinalPost || generatedFinalPost;

  const resetManualPreview = () => {
    setManualFinalPost("");
    setPreviewDraft("");
    setPreviewEditing(false);
  };

  const applyPreset = (presetName) => {
    const preset = PRESETS.find((item) => item.name === presetName);
    if (!preset) return;
    setMode(preset.mode);
    setToneIntensity(preset.tone);
    setNotes(preset.notes);
    setMessage(`Applied ${preset.name}.`);
  };

  const buildPartsFromPromo = (nextPromo, nextPlatform = platform) => {
    const baseParts = makeParts({ promo: nextPromo, product: selectedProduct, platform: nextPlatform, mode });
    const nextParts = applySavedOptionEdits(baseParts, selectedProduct, nextPlatform);
    setParts(nextParts);
    setSelected({
      opening: nextParts.opening[0] || "",
      main: nextParts.main[0] || "",
      extra: nextParts.extra[0] || "",
      shop: nextParts.shop[0] || "",
      hashtags: nextParts.hashtags[0] || "",
    });
    setManualFinalPost("");
    setPreviewDraft("");
    setPreviewEditing(false);
    setOpenSections(DEFAULT_OPEN_SECTIONS);
    setEditingKey("");
  };

  const generatePromo = async () => {
    setError("");
    setMessage("");
    if (!adminKey.trim()) return setError("Enter the promo generation key first.");
    if (!selectedProduct) return setError("Pick a product first.");
    setLoading(true);
    window.localStorage.setItem(ADMIN_KEY, adminKey.trim());

    try {
      const res = await fetch("/api/generate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          product: selectedProduct,
          mode,
          platform,
          goal: mode === "holiday" ? "holiday_promo" : "sell_product",
          toneIntensity,
          notes,
          recentPhrases: recentPhrases.slice(0, 40),
          variationSeed: `${Date.now()}-${Math.random()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Promo generation failed.");
      setPromo(data.promo);
      setPromoSource("AI Generated");
      buildPartsFromPromo(data.promo, platform);
      const nextPhrases = [data.promo?.facebook_post, data.promo?.instagram_caption, data.promo?.clean_ad_version, data.promo?.edgy_version].filter(Boolean).map((item) => String(item).slice(0, 180));
      const merged = [...nextPhrases, ...recentPhrases].slice(0, 60);
      setRecentPhrases(merged);
      writeArray(PHRASES_KEY, merged);
      setActiveTab("output");
    } catch (err) {
      setError(err.message || "Promo generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const generateFreePromo = () => {
    setError("");
    setMessage("");
    if (!selectedProduct) return setError("Pick a product first.");
    setFreeLoading(true);
    try {
      const freePromo = makeFreePromoPack(selectedProduct, { mode, platform, toneIntensity, notes });
      setPromo(freePromo);
      setPromoSource("Free Template");
      buildPartsFromPromo(freePromo, platform);
      setActiveTab("output");
      setMessage("Free template generated. No AI credits used.");
    } finally {
      setFreeLoading(false);
    }
  };

  const onUsePart = (field, value) => {
    resetManualPreview();
    setSelected((current) => ({ ...current, [field]: value }));
  };

  const onEditOption = (field, index, value) => {
    setParts((current) => {
      if (!current?.[field]) return current;
      const nextValues = [...current[field]];
      const oldValue = nextValues[index];
      nextValues[index] = value;
      setSelected((selectedCurrent) => selectedCurrent[field] === oldValue ? { ...selectedCurrent, [field]: value } : selectedCurrent);
      setManualFinalPost("");
      setPreviewDraft("");
      setPreviewEditing(false);
      return { ...current, [field]: nextValues };
    });
  };

  const onSaveOption = (field, index, value) => {
    const saved = readObject(OPTION_MEMORY_KEY);
    saved[optionKey(selectedProduct, platform, field, index)] = value;
    writeObject(OPTION_MEMORY_KEY, saved);
    setMessage("Saved wording. This option will reuse your edit next time for this product/platform.");
  };

  const editPreview = () => {
    setPreviewDraft(finalPost);
    setPreviewEditing(true);
  };

  const savePreview = () => {
    setManualFinalPost(previewDraft);
    setPreviewEditing(false);
    setMessage("Preview wording saved for this queued/copied post.");
  };

  const cancelPreviewEdit = () => {
    setPreviewDraft(finalPost);
    setPreviewEditing(false);
  };

  const toggleSection = (field) => {
    setOpenSections((current) => ({ ...current, [field]: !current[field] }));
  };

  const changePlatform = (nextPlatform) => {
    setPlatform(nextPlatform);
    if (promo) buildPartsFromPromo(promo, nextPlatform);
  };

  const addToQueue = () => {
    if (!selectedProduct || !finalPost) return;
    const item = {
      id: `pack-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      source: promoSource || "Promo Studio",
      createdAt: new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      mode,
      platform,
      displayPlatform: platform,
      scheduledPlatform: platform,
      scheduledDate: queueDate || "",
      status: "Draft",
      toneIntensity,
      notes,
      product: selectedProduct,
      promo: {
        ...(promo || {}),
        builder_final: finalPost,
        facebook_post: platform === "facebook" ? finalPost : promo?.facebook_post || "",
        instagram_caption: platform === "instagram" ? finalPost : promo?.instagram_caption || "",
        hashtags: selected.hashtags,
        manuallyEditedFinal: Boolean(manualFinalPost),
      },
    };
    const next = [item, ...queue].slice(0, 100);
    setQueue(next);
    writeArray(QUEUE_KEY, next);
    setMessage("Added to queue as Draft.");
  };

  const clearMemory = () => {
    setRecentPhrases([]);
    writeArray(PHRASES_KEY, []);
    setMessage("No-repeat memory cleared.");
  };

  const optionProps = {
    editingKey,
    onUse: onUsePart,
    onEdit: onEditOption,
    onSave: onSaveOption,
    onEditStart: setEditingKey,
    onEditCancel: () => setEditingKey(""),
  };

  return (
    <div className="promoPage">
      <Head><title>Local Jagoff Promo Studio</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Promo Studio</h1>
            <p>Facebook and Instagram promo builder for Local Jagoff posts. Generate, refine, copy, queue, and track.</p>
          </div>
          <div className="heroCard"><p>No auto-posting.</p><strong>You approve everything before it goes public.</strong></div>
        </header>

        <nav className="tabs">
          <button type="button" className={activeTab === "create" ? "active" : ""} onClick={() => setActiveTab("create")}>Create</button>
          <button type="button" className={activeTab === "output" ? "active" : ""} onClick={() => setActiveTab("output")}>Output</button>
          <button type="button" className={activeTab === "queue" ? "active" : ""} onClick={() => setActiveTab("queue")}>Queue</button>
        </nav>

        {message && <section className="message">{message}</section>}
        {error && <section className="error">{error}</section>}

        {activeTab === "create" && (
          <section className="createGrid">
            <div className="panel controls">
              <p className="mini">CREATE PACK</p><h2>Generate content</h2>
              <label className="full">Promo generation key<input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Only needed for AI generation" /></label>
              <label className="full">Product<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={productsLoading}>{productsLoading && <option>Loading products...</option>}{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              <label>Preset<select onChange={(e) => applyPreset(e.target.value)} defaultValue=""><option value="">Manual / No Preset</option>{PRESETS.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}</select></label>
              <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Platform<select value={platform} onChange={(e) => changePlatform(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Tone<select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>{TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="full">Extra notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Direction, product angle, sale details, what to avoid..." /></label>
              <div className="actions full"><button type="button" className="primary" onClick={generatePromo} disabled={loading || freeLoading}>{loading ? "Generating..." : "Generate With AI"}</button><button type="button" onClick={generateFreePromo} disabled={loading || freeLoading}>{freeLoading ? "Building..." : "Generate Free Template"}</button><button type="button" onClick={clearMemory}>Clear No-Repeat Memory</button></div>
            </div>
            <aside className="panel productPanel">{selectedProduct?.thumbnail_url && <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} />}<p className="mini">SELECTED PRODUCT</p><h2>{selectedProduct?.name || "No product selected"}</h2><p>{selectedProduct?.category || "gear"} {selectedProduct?.retail_price && `• $${selectedProduct.retail_price}`}</p><label>Queue date<input type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} /></label></aside>
          </section>
        )}

        {activeTab === "output" && (
          <section>
            {!promo || !parts ? <div className="empty"><h2>No promo generated yet.</h2><p>Generate a Facebook or Instagram pack first.</p><button type="button" className="primary" onClick={() => setActiveTab("create")}>Create One</button></div> : (
              <>
                <div className="outputTop"><div><p className="mini">{promoSource} • {platformLabel(platform)}{manualFinalPost ? " • Manually edited" : ""}</p><h2>{selectedProduct?.name}</h2></div><div className="actions"><button type="button" className="primary" onClick={() => copyText(finalPost)}>Copy Ready Post</button><button type="button" onClick={promoSource === "Free Template" ? generateFreePromo : generatePromo} disabled={loading || freeLoading}>{loading || freeLoading ? "Regenerating..." : "Regenerate All"}</button><button type="button" onClick={addToQueue}>Add to Queue</button></div></div>
                <div className="platformSwitch"><button type="button" className={platform === "facebook" ? "active" : ""} onClick={() => changePlatform("facebook")}>Facebook</button><button type="button" className={platform === "instagram" ? "active" : ""} onClick={() => changePlatform("instagram")}>Instagram</button></div>
                <div className="builderGrid">
                  <SocialPreview platform={platform} product={selectedProduct} finalPost={finalPost} isEditing={previewEditing} draft={previewDraft} onDraftChange={setPreviewDraft} onEdit={editPreview} onSave={savePreview} onCancel={cancelPreviewEdit} onCopy={() => copyText(finalPost)} onQueue={addToQueue} />
                  <div className="buildDeck">
                    <div className="deckControls"><div><p className="mini">BUILD DECK</p><h2>Pick your parts</h2></div><div><button type="button" onClick={() => setOpenSections(ALL_OPEN_SECTIONS)}>Expand All</button><button type="button" onClick={() => setOpenSections(ALL_CLOSED_SECTIONS)}>Collapse All</button></div></div>
                    <div className="parts">
                      <OptionGroup title="Opening Statement" field="opening" values={parts.opening} selected={selected.opening} isOpen={openSections.opening} onToggle={() => toggleSection("opening")} {...optionProps} />
                      <OptionGroup title="Main Copy" field="main" values={parts.main} selected={selected.main} isOpen={openSections.main} onToggle={() => toggleSection("main")} {...optionProps} />
                      <OptionGroup title="Extra Line" field="extra" values={parts.extra} selected={selected.extra} isOpen={openSections.extra} onToggle={() => toggleSection("extra")} {...optionProps} />
                      <OptionGroup title="Shop Line" field="shop" values={parts.shop} selected={selected.shop} isOpen={openSections.shop} onToggle={() => toggleSection("shop")} {...optionProps} />
                      <OptionGroup title="Hashtags" field="hashtags" values={parts.hashtags} selected={selected.hashtags} isOpen={openSections.hashtags} onToggle={() => toggleSection("hashtags")} {...optionProps} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "queue" && <section className="panel"><p className="mini">QUEUE</p><h2>Drafts</h2>{queue.length === 0 ? <p>No queued drafts yet.</p> : <div className="queueList">{queue.map((item) => <article key={item.queueId}><strong>{item.product?.name || "Queued Promo"}</strong><span>{item.scheduledPlatform} • {item.scheduledDate || "No date"} • {item.status || "Draft"}</span><pre>{item.promo?.builder_final || "No copy saved."}</pre></article>)}</div>}</section>}
      </main>
      <style jsx global>{`.promoPage{min-height:100vh;color:#fff;background:radial-gradient(circle at 12% 0,rgba(255,230,0,.18),transparent 34%),radial-gradient(circle at 88% 10%,rgba(255,230,0,.08),transparent 30%),linear-gradient(180deg,#050505,#000);padding:34px 16px 70px}.promoPage .wrap{max-width:1260px;margin:0 auto}.promoPage .hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;align-items:end;margin-bottom:16px}.promoPage .kicker,.promoPage .mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase}.promoPage h1{margin:0;font-size:clamp(42px,8vw,94px);line-height:.88;text-transform:uppercase}.promoPage h2,.promoPage h3{text-transform:uppercase}.promoPage .hero p{color:#ddd;line-height:1.55}.promoPage .heroCard,.promoPage .panel,.promoPage .partCard,.promoPage .message,.promoPage .error,.promoPage .empty,.promoPage .outputTop,.promoPage .deckControls{background:linear-gradient(145deg,rgba(18,18,18,.96),rgba(4,4,4,.96));border:1px solid rgba(255,230,0,.18);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.04)}.promoPage .heroCard,.promoPage .panel,.promoPage .partCard,.promoPage .message,.promoPage .error,.promoPage .empty,.promoPage .outputTop,.promoPage .deckControls{padding:18px}.promoPage .heroCard p{margin:0 0 8px;color:#ffe600;font-weight:900}.promoPage .tabs,.promoPage .actions,.promoPage .platformSwitch,.promoPage .previewActions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.promoPage .tabs button,.promoPage .actions button,.promoPage .platformSwitch button,.promoPage .deckControls button,.promoPage .previewActions button{border:1px solid #333;border-radius:14px;background:#1b1b1b;color:#fff;padding:12px 14px;font-weight:900;cursor:pointer;text-transform:uppercase}.promoPage .tabs button.active,.promoPage .platformSwitch button.active,.promoPage .primary{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.promoPage .message{color:#ffe600;font-weight:900;margin-bottom:14px}.promoPage .error{color:#ffb4b4;border-color:rgba(255,95,95,.4);margin-bottom:14px}.promoPage .createGrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}.promoPage .controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.promoPage .full{grid-column:1/-1}.promoPage label{display:grid;gap:7px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}.promoPage input,.promoPage select,.promoPage textarea{width:100%;box-sizing:border-box;border:1px solid #333;border-radius:14px;background:#050505;color:#fff;padding:12px;font-size:14px}.promoPage textarea{min-height:110px;resize:vertical}.promoPage .productPanel img{width:100%;height:220px;object-fit:contain;background:#070707;border-radius:16px}.promoPage .outputTop{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:14px}.promoPage .builderGrid{display:grid;grid-template-columns:minmax(290px,410px) minmax(0,1fr);gap:16px;align-items:start}.promoPage .preview{position:sticky;top:74px}.promoPage .previewTop{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;margin-bottom:14px}.promoPage .brandMark{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#ffe600;color:#000;font-weight:1000;box-shadow:0 0 28px rgba(255,230,0,.22)}.promoPage .previewTop h2{margin:0;color:#fff}.promoPage .previewTop span{border:1px solid rgba(255,230,0,.3);border-radius:999px;padding:8px 10px;color:#ffe600;background:rgba(255,230,0,.08);font-size:11px;font-weight:900;text-transform:uppercase}.promoPage .socialCard{border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(180deg,#121212,#050505);overflow:hidden}.promoPage .socialCard.editingPreview{border-color:#ffe600;box-shadow:0 0 0 2px rgba(255,230,0,.1)}.promoPage .socialHeader{display:flex;gap:10px;align-items:center;padding:14px}.promoPage .avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#1d1d1d;border:1px solid rgba(255,230,0,.25)}.promoPage .socialHeader strong,.promoPage .socialHeader small{display:block}.promoPage .socialHeader small{color:#aaa;margin-top:3px}.promoPage .previewProduct{display:block;width:100%;height:220px;object-fit:contain;background:#f7f7f7}.promoPage .previewCopy{display:block;width:100%;border:0;background:transparent;text-align:left;padding:16px;cursor:text}.promoPage .previewCopy p{margin:0 0 12px;color:#f1f1f1;line-height:1.55;white-space:pre-wrap;font-size:15px}.promoPage .previewLink{border:1px solid rgba(255,230,0,.18);border-radius:14px;padding:10px;color:#ffe600;background:rgba(255,230,0,.07);font-size:12px;line-break:anywhere}.promoPage .previewTags{margin-top:12px;color:#9fd1ff;line-height:1.45;font-size:13px}.promoPage .directPreviewEditor{border:0;border-top:1px solid rgba(255,230,0,.18);border-radius:0;background:#050505;min-height:360px;color:#fff;font-size:15px;line-height:1.55;padding:16px}.promoPage .previewActions{margin:12px 0 0}.promoPage .previewActions button{flex:1}.promoPage .buildDeck{display:grid;gap:14px}.promoPage .deckControls{display:flex;justify-content:space-between;gap:14px;align-items:center}.promoPage .deckControls h2{margin:0;color:#ffe600}.promoPage .deckControls>div:last-child{display:flex;gap:8px;flex-wrap:wrap}.promoPage .parts{display:grid;gap:12px}.promoPage .partCard{padding:0;overflow:hidden}.promoPage .partHeadButton{width:100%;border:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;display:grid!important;grid-template-columns:minmax(0,1fr) 44px;gap:12px;align-items:center;text-align:left;padding:16px!important;cursor:pointer;box-shadow:none!important;text-transform:none!important}.promoPage .partTitleRow{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:6px}.promoPage .partTitleRow h3{margin:0;color:#ffe600}.promoPage .partTitleRow span{color:#aaa;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}.promoPage .partHeadButton p{margin:0;color:#cfcfcf;font-size:13px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.promoPage .chevron{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(255,230,0,.1);border:1px solid rgba(255,230,0,.28);color:#ffe600;font-weight:1000;font-size:20px}.promoPage .partBody{border-top:1px solid rgba(255,230,0,.12);padding:14px}.promoPage .optionList{display:grid;gap:10px}.promoPage .optionTile{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015));overflow:hidden;transition:border-color .15s ease,background .15s ease,transform .15s ease,box-shadow .15s ease}.promoPage .optionTile:hover{border-color:rgba(255,230,0,.55);background:rgba(255,230,0,.08);transform:translateY(-1px)}.promoPage .optionTile.selected{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.16),rgba(255,230,0,.045));box-shadow:0 0 0 2px rgba(255,230,0,.08)}.promoPage .optionTop{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:start;padding:14px}.promoPage .radioOnly{width:24px;height:24px;border:0;background:transparent;padding:0;cursor:pointer}.promoPage .radioDot{display:block;width:18px;height:18px;border-radius:999px;border:2px solid #777;box-sizing:border-box;position:relative;margin-top:2px}.promoPage .optionTile.selected .radioDot{border-color:#ffe600;background:#ffe600}.promoPage .optionTile.selected .radioDot:after{content:"";position:absolute;inset:4px;border-radius:999px;background:#000}.promoPage .optionTextButton{border:0!important;background:transparent!important;color:#fff!important;text-align:left!important;padding:0!important;cursor:pointer;text-transform:none!important}.promoPage .optionCopy{color:#f2f2f2;line-height:1.48;overflow-wrap:anywhere;font-size:15px}.promoPage .inlineOptionEditor{min-height:96px;border-color:rgba(255,230,0,.32);background:#050505;line-height:1.5;font-size:15px}.promoPage .tonePill{border:1px solid rgba(255,230,0,.25);border-radius:999px;color:#ffe600;background:rgba(255,230,0,.08);padding:6px 9px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap}.promoPage .optionActions{display:flex;gap:8px;justify-content:flex-end;padding:0 14px 14px}.promoPage .optionActions button{border:1px solid #333;border-radius:999px;background:#171717;color:#fff;padding:8px 11px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer}.promoPage .optionActions button:hover{background:#ffe600;color:#000;border-color:#ffe600}.promoPage .queueList{display:grid;gap:12px}.promoPage .queueList article{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;background:#050505}.promoPage .queueList strong,.promoPage .queueList span{display:block}.promoPage .queueList span{margin-top:6px;color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}.promoPage .queueList pre{white-space:pre-wrap;color:#ddd;line-height:1.45}@media(max-width:900px){.promoPage .hero,.promoPage .createGrid,.promoPage .builderGrid{grid-template-columns:1fr}.promoPage .preview{position:static}.promoPage .outputTop,.promoPage .deckControls{display:grid}.promoPage .controls{grid-template-columns:1fr}.promoPage .actions button,.promoPage .tabs button,.promoPage .platformSwitch button,.promoPage .deckControls button{width:100%}.promoPage .optionTop{grid-template-columns:24px minmax(0,1fr)}.promoPage .tonePill{grid-column:2}.promoPage .optionActions{justify-content:stretch}.promoPage .optionActions button{width:100%}.promoPage .previewTop{grid-template-columns:44px minmax(0,1fr)}}`}</style>
    </div>
  );
}
