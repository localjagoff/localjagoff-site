import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  makeHolidayPromoPack,
  US_HOLIDAY_PROMOS,
} from "../../lib/holidayPromoTemplates";
import { normalizePromoProduct, formatPromoHashtags } from "../../lib/promoTemplates";

const PLATFORMS = [
  ["full_pack", "Full Pack"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const TONES = [
  ["clean", "Clean"],
  ["balanced", "Balanced"],
  ["more_jagoff", "More Jagoff"],
  ["savage_but_safe", "Savage but Safe"],
];

const CAMPAIGN_STYLES = [
  ["sale_announcement", "Sale Announcement"],
  ["gift_guide", "Gift Guide"],
  ["weekend_push", "Weekend Push"],
  ["last_chance", "Last Chance"],
];

const PLATFORM_LABELS = Object.fromEntries(PLATFORMS);

function copyText(value) {
  if (!value || typeof navigator === "undefined") return;
  navigator.clipboard.writeText(value);
}

function scriptToText(scenes) {
  return Array.isArray(scenes)
    ? scenes
        .map(
          (s) =>
            `${s.scene}\nVisual: ${s.visual}\nText: ${s.on_screen_text}\nVoiceover: ${s.voiceover}`
        )
        .join("\n\n")
    : "";
}

function fieldText(field) {
  if (!field) return "";
  if (field.type === "hashtags") return formatPromoHashtags(field.value);
  if (field.type === "script") return scriptToText(field.value);
  if (Array.isArray(field.value)) return field.value.join("\n");
  return String(field.value || "");
}

function getDisplayFields(pack, selectedPlatform) {
  if (!pack) return [];

  const shared = [{ title: "Brand Angle", value: pack.brand_angle }];
  const support = [
    { title: "Image Overlay Text", value: pack.image_overlay_text, pre: true },
    { title: "Alt Text", value: pack.alt_text },
    { title: "CTA / Link Helper", value: pack.cta, pre: true },
  ];

  const map = {
    facebook: [
      ...shared,
      { title: "Facebook Post", value: pack.facebook_post },
      { title: "Clean Ad Version", value: pack.clean_ad_version },
      { title: "Edgy Version", value: pack.edgy_version },
      ...support,
    ],
    instagram: [
      ...shared,
      { title: "Instagram Caption", value: pack.instagram_caption },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
    ],
    tiktok: [
      ...shared,
      { title: "TikTok Caption", value: pack.tiktok_caption },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
    ],
    youtube_shorts: [
      ...shared,
      { title: "YouTube Shorts Title", value: pack.youtube_shorts_title },
      { title: "YouTube Shorts Description", value: pack.youtube_shorts_description },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      ...support,
    ],
    full_pack: [
      ...shared,
      { title: "Facebook Post", value: pack.facebook_post },
      { title: "Instagram Caption", value: pack.instagram_caption },
      { title: "TikTok Caption", value: pack.tiktok_caption },
      { title: "YouTube Shorts Title", value: pack.youtube_shorts_title },
      { title: "YouTube Shorts Description", value: pack.youtube_shorts_description },
      { title: "Hashtags", value: pack.hashtags, type: "hashtags" },
      { title: "Video Hooks", value: pack.video_hooks, pre: true },
      { title: "Short Video Script", value: pack.short_video_script, type: "script" },
      { title: "Image Overlay Text", value: pack.image_overlay_text, pre: true },
      { title: "Alt Text", value: pack.alt_text },
      { title: "Clean Ad Version", value: pack.clean_ad_version },
      { title: "Edgy Version", value: pack.edgy_version },
      { title: "CTA / Link Helper", value: pack.cta, pre: true },
    ],
  };

  const fields = map[selectedPlatform] || map.full_pack;
  return pack.warnings?.length
    ? [...fields, { title: "Warnings / Notes", value: pack.warnings, pre: true }]
    : fields;
}

function formatPackText(pack, selectedPlatform = "full_pack") {
  return getDisplayFields(pack, selectedPlatform)
    .map((field) => `${field.title}:\n${fieldText(field)}`)
    .join("\n\n---\n\n");
}

function ResultBlock({ field }) {
  const text = fieldText(field);

  return (
    <div className="resultBlock">
      <div className="resultTop">
        <h3>{field.title}</h3>
        <button type="button" onClick={() => copyText(text)}>
          Copy
        </button>
      </div>
      {field.pre || field.type === "script" ? <pre>{text}</pre> : <p>{text}</p>}
    </div>
  );
}

export default function HolidayPromoGenerator() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [holidayValue, setHolidayValue] = useState("black_friday");
  const [platform, setPlatform] = useState("full_pack");
  const [displayPlatform, setDisplayPlatform] = useState("full_pack");
  const [toneIntensity, setToneIntensity] = useState("balanced");
  const [campaignStyle, setCampaignStyle] = useState("sale_announcement");
  const [offerDetails, setOfferDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [pack, setPack] = useState(null);

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

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedId)),
    [products, selectedId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.name, product.category, product.id].join(" ").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const displayFields = getDisplayFields(pack, displayPlatform);

  const generatePack = () => {
    if (!selectedProduct) return;

    const nextPack = makeHolidayPromoPack(selectedProduct, {
      holidayValue,
      platform,
      toneIntensity,
      campaignStyle,
      offerDetails,
      notes,
    });

    setPack(nextPack);
    setDisplayPlatform(platform);
  };

  return (
    <div className="holidayPage">
      <Head>
        <title>Holiday Promo Generator | Local Jagoff</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className="wrap">
        <header className="hero">
          <div>
            <p className="kicker">PRIVATE ADMIN TOOL</p>
            <h1>Holiday Promo Generator</h1>
            <p>
              Build free holiday campaign copy for Local Jagoff products. Add sale
              details only when the offer is real — this tool will not invent fake discounts.
            </p>
          </div>
          <a className="backLink" href="/admin/promo-generator">
            Back to Promo Command Center
          </a>
        </header>

        <section className="grid">
          <div className="panel controls">
            <div className="field full">
              <label>Holiday / Sales Event</label>
              <select value={holidayValue} onChange={(e) => setHolidayValue(e.target.value)}>
                {US_HOLIDAY_PROMOS.map((holiday) => (
                  <option key={holiday.value} value={holiday.value}>
                    {holiday.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field full">
              <label>Product</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={productsLoading}
              >
                {productsLoading && <option>Loading products...</option>}
                {!productsLoading && products.length === 0 && <option>No products found</option>}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Campaign Style</label>
              <select value={campaignStyle} onChange={(e) => setCampaignStyle(e.target.value)}>
                {CAMPAIGN_STYLES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tone</label>
              <select value={toneIntensity} onChange={(e) => setToneIntensity(e.target.value)}>
                {TONES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Product Search</label>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filter product tiles below..."
              />
            </div>

            <div className="field full">
              <label>Real Offer / Discount Details</label>
              <textarea
                value={offerDetails}
                onChange={(e) => setOfferDetails(e.target.value)}
                placeholder="Example: 15% off hoodies through Monday with code JAGOFF15. Leave blank if there is no real sale."
              />
            </div>

            <div className="field full">
              <label>Extra Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: push gifts, less salesy, more 724, keep clean, last chance, hoodie weather..."
              />
            </div>

            <div className="actions full">
              <button type="button" className="primary" onClick={generatePack}>
                Generate Holiday Promo Pack
              </button>
              {pack && (
                <button type="button" onClick={() => copyText(formatPackText(pack, displayPlatform))}>
                  Copy Shown Pack
                </button>
              )}
            </div>
          </div>

          <aside className="panel side">
            <p className="miniKicker">SELECTED PRODUCT</p>
            {selectedProduct?.thumbnail_url && (
              <img src={selectedProduct.thumbnail_url} alt={selectedProduct.name} />
            )}
            <h2>{selectedProduct?.name || "No product selected"}</h2>
            <p>{selectedProduct?.category || "gear"}</p>

            <div className="productTiles">
              {filteredProducts.slice(0, 12).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={String(product.id) === String(selectedId) ? "selected" : ""}
                  onClick={() => setSelectedId(String(product.id))}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </aside>
        </section>

        {pack && (
          <section className="resultsWrap">
            <div className="resultToolbar">
              <div>
                <p className="miniKicker">HOLIDAY PROMO • {PLATFORM_LABELS[displayPlatform]}</p>
                <h2>Current Holiday Pack</h2>
              </div>
              <div className="switcher">
                {PLATFORMS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={displayPlatform === value ? "active" : ""}
                    onClick={() => setDisplayPlatform(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="results">
              {displayFields.map((field) => (
                <ResultBlock key={field.title} field={field} />
              ))}
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .holidayPage{min-height:100vh;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000);padding:34px 16px 70px}.wrap{max-width:1260px;margin:0 auto}.hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:20px}.kicker,.miniKicker{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.miniKicker{font-size:11px;letter-spacing:1.4px}h1{font-size:clamp(38px,7vw,82px);line-height:.92;text-transform:uppercase;margin:0 0 12px}.hero p:last-child{max-width:780px;color:#d8d8d8;line-height:1.6}.backLink{color:#000;background:#ffe600;border-radius:14px;padding:12px 16px;font-weight:900;text-decoration:none}.grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.panel,.resultBlock{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 22px 80px rgba(0,0,0,.42)}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}.full{grid-column:1/-1}.field label{display:block;margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:13px 14px;outline:none}textarea{min-height:108px;resize:vertical}button{border:none;border-radius:14px;padding:12px 16px;cursor:pointer;font-weight:900;letter-spacing:.5px;color:#fff;background:#1b1b1b;border:1px solid #333}.primary,.switcher button.active{color:#000;background:#ffe600}.actions{display:flex;gap:10px;flex-wrap:wrap}.side{padding:18px}.side img{width:100%;max-height:260px;object-fit:contain;background:#070707;border-radius:16px;margin-bottom:12px}.side h2{text-transform:uppercase;font-size:24px}.side p{color:#bbb}.productTiles{display:grid;gap:8px;margin-top:18px;max-height:360px;overflow:auto}.productTiles button{text-align:left;font-size:12px}.productTiles button.selected{border-color:#ffe600;color:#ffe600}.resultsWrap{margin-top:20px}.resultToolbar{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:16px;padding:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px}.resultToolbar h2{text-transform:uppercase}.switcher{display:flex;flex-wrap:wrap;gap:8px}.results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.resultBlock{padding:18px}.resultTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.resultTop h3{color:#ffe600;text-transform:uppercase;font-size:18px}.resultBlock p,.resultBlock pre{margin:0;color:#f3f3f3;font-size:15px;line-height:1.58;white-space:pre-wrap}@media(max-width:980px){.hero,.grid,.resultToolbar{display:grid;grid-template-columns:1fr}.results{grid-template-columns:1fr}.controls{grid-template-columns:1fr}.full{grid-column:auto}.backLink{text-align:center}.actions button,.switcher button{width:100%}}
      `}</style>
    </div>
  );
}
