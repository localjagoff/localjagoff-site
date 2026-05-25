import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

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

function copyText(value) {
  if (!value) return;
  navigator.clipboard.writeText(value);
}

function formatHashtags(tags) {
  return Array.isArray(tags) ? tags.join(" ") : "";
}

function normalizeProduct(product) {
  return {
    id: product?.id || "",
    name: product?.name || "Unnamed product",
    retail_price: product?.retail_price || product?.price || "",
    category: product?.category || "gear",
    thumbnail_url: product?.thumbnail_url || product?.image || "",
  };
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
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("localJagoffPromoKey") || "";
    const savedPhrases = JSON.parse(
      localStorage.getItem("localJagoffRecentPromoPhrases") || "[]"
    );

    setAdminKey(savedKey);
    setRecentPhrases(Array.isArray(savedPhrases) ? savedPhrases : []);
  }, []);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const clean = Array.isArray(data) ? data.map(normalizeProduct) : [];
        setProducts(clean);
        setSelectedId(clean[0]?.id ? String(clean[0].id) : "");
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((product) => String(product.id) === String(selectedId));
  }, [products, selectedId]);

  const filteredRecentPhrases = useMemo(() => {
    return recentPhrases.filter(Boolean).slice(0, 40);
  }, [recentPhrases]);

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

  const generatePromo = async () => {
    setError("");
    setPromo(null);

    if (!adminKey.trim()) {
      setError("Enter the promo generator password first.");
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
      saveRecentPhrases(data.promo);
    } catch (err) {
      setError(err.message || "Promo generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearMemory = () => {
    setRecentPhrases([]);
    localStorage.removeItem("localJagoffRecentPromoPhrases");
  };

  return (
    <div className="promoPage">
      <Head>
        <title>Local Jagoff Promo Generator</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Local Jagoff Promo Generator</h1>
          <p>
            Pick a product, choose a vibe, and generate fresh social posts,
            hooks, hashtags, video script, image overlay text, and ad-safe copy.
          </p>
        </header>

        <section className="panel controls">
          <div className="field full">
            <label>Promo generator password</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Set this as PROMO_ADMIN_KEY in Vercel"
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

          {selectedProduct && (
            <div className="selectedProduct full">
              <img
                src={selectedProduct.thumbnail_url || "/images/placeholder.jpg"}
                alt={selectedProduct.name}
              />
              <div>
                <h2>{selectedProduct.name}</h2>
                <p>
                  {selectedProduct.category} {selectedProduct.retail_price && `• $${selectedProduct.retail_price}`}
                </p>
              </div>
            </div>
          )}

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
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tone</label>
            <select
              value={toneIntensity}
              onChange={(e) => setToneIntensity(e.target.value)}
            >
              {TONES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Goal</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="sell_product, product_drop, brand_awareness..."
            />
          </div>

          <div className="field full">
            <label>Extra notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: make it more 724, less salesy, mention hoodie season, avoid Steelers references, etc."
            />
          </div>

          <div className="actions full">
            <button type="button" className="primary" onClick={generatePromo} disabled={loading}>
              {loading ? "Generating..." : "Generate Promo Pack"}
            </button>
            <button type="button" className="ghost" onClick={clearMemory}>
              Clear No-Repeat Memory
            </button>
          </div>

          {error && <div className="error full">{error}</div>}
        </section>

        {promo && (
          <section className="results">
            <ResultBlock title="Brand Angle" value={promo.brand_angle} />
            <ResultBlock title="Facebook Post" value={promo.facebook_post} />
            <ResultBlock title="Instagram Caption" value={promo.instagram_caption} />
            <ResultBlock title="TikTok Caption" value={promo.tiktok_caption} />
            <ResultBlock title="YouTube Shorts Title" value={promo.youtube_shorts_title} />
            <ResultBlock
              title="YouTube Shorts Description"
              value={promo.youtube_shorts_description}
            />
            <ResultBlock title="Hashtags" value={formatHashtags(promo.hashtags)} />
            <ResultBlock title="Video Hooks" value={promo.video_hooks} pre />
            <ScriptBlock scenes={promo.short_video_script} />
            <ResultBlock title="Image Overlay Text" value={promo.image_overlay_text} pre />
            <ResultBlock title="Alt Text" value={promo.alt_text} />
            <ResultBlock title="Clean Ad Version" value={promo.clean_ad_version} />
            <ResultBlock title="Edgy Version" value={promo.edgy_version} />
            <ResultBlock title="CTA" value={promo.cta} />
            {promo.warnings?.length > 0 && (
              <ResultBlock title="Warnings / Notes" value={promo.warnings} pre />
            )}
          </section>
        )}
      </main>

      <style jsx>{`
        .promoPage {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(circle at top, rgba(255, 230, 0, 0.14), transparent 28%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.92), rgba(0, 0, 0, 0.98));
          padding: 34px 16px 70px;
        }

        .wrap {
          max-width: 1180px;
          margin: 0 auto;
        }

        .hero {
          margin-bottom: 22px;
        }

        .kicker {
          margin: 0 0 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          font-size: clamp(34px, 6vw, 72px);
          line-height: 0.95;
          text-transform: uppercase;
        }

        .hero p:last-child {
          max-width: 780px;
          color: #d8d8d8;
          font-size: 16px;
          line-height: 1.6;
        }

        .panel,
        .resultBlock {
          background: rgba(13, 13, 13, 0.88);
          border: 1px solid rgba(255, 230, 0, 0.18);
          border-radius: 22px;
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.45);
        }

        .controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding: 20px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        input,
        select,
        textarea {
          width: 100%;
          color: #fff;
          background: #050505;
          border: 1px solid #333;
          border-radius: 14px;
          padding: 13px 14px;
          outline: none;
        }

        textarea {
          min-height: 110px;
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #ffe600;
          box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.12);
        }

        .selectedProduct {
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
        }

        .selectedProduct img {
          width: 86px;
          height: 86px;
          object-fit: cover;
          border-radius: 14px;
          background: #111;
        }

        .selectedProduct h2 {
          font-size: 24px;
        }

        .selectedProduct p {
          margin: 8px 0 0;
          color: #bbb;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 12px;
          font-weight: 800;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        button {
          border: none;
          border-radius: 14px;
          padding: 12px 16px;
          cursor: pointer;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primary {
          color: #000;
          background: #ffe600;
          box-shadow: 0 12px 28px rgba(255, 230, 0, 0.16);
        }

        .ghost,
        .resultTop button {
          color: #fff;
          background: #1b1b1b;
          border: 1px solid #333;
        }

        .error {
          color: #fff;
          background: rgba(170, 0, 0, 0.35);
          border: 1px solid rgba(255, 90, 90, 0.5);
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 800;
        }

        .results {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .resultBlock {
          padding: 18px;
        }

        .wide {
          grid-column: 1 / -1;
        }

        .resultTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .resultTop h3 {
          color: #ffe600;
          font-size: 18px;
          text-transform: uppercase;
        }

        .resultBlock p,
        .resultBlock pre {
          margin: 0;
          color: #f3f3f3;
          font-size: 15px;
          line-height: 1.58;
          white-space: pre-wrap;
        }

        .scriptGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .scriptScene {
          padding: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
        }

        .scriptScene strong {
          display: block;
          color: #ffe600;
          margin-bottom: 8px;
        }

        .scriptScene p {
          margin: 7px 0;
          color: #ddd;
        }

        .scriptScene span {
          color: #fff;
          font-weight: 900;
        }

        @media (max-width: 860px) {
          .controls,
          .results,
          .scriptGrid {
            grid-template-columns: 1fr;
          }

          .promoPage {
            padding-top: 22px;
          }

          .actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
