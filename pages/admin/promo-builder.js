import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const QUEUE_KEY = "localJagoffPromoQueue";
const BANK_KEY = "localJagoffProductPromoBank";

const PLATFORMS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

const DESTINATIONS = {
  facebook: [
    ["facebook_page_local_jagoff", "Facebook Page - Local Jagoff"],
    ["facebook_personal_local_jagoff", "Facebook Personal - Local Jagoff"],
  ],
  instagram: [["instagram_local_jagoff", "Instagram - Local Jagoff"]],
  tiktok: [["tiktok_local_jagoff", "TikTok - Local Jagoff"]],
  youtube_shorts: [["youtube_shorts_local_jagoff", "YouTube Shorts - Local Jagoff"]],
};

const HOOKS = [
  "New drop for anyone who knows exactly what a jagoff is.",
  "Western PA attitude, cleaned up just enough for public viewing.",
  "Not tourist gear. Not fake tough. Just Local Jagoff.",
  "For the locals, the loud ones, and the beautifully difficult ones.",
  "A little local pride. A little smart mouth. That is the brand.",
  "Clean enough to wear out. Jagoff enough to feel right.",
];

const CTAS = [
  "Grab it at localjagoff.com.",
  "Shop the drop at localjagoff.com.",
  "Get yours at localjagoff.com.",
  "Shop Local Jagoff before someone else gets loud about it.",
  "Check the drop at localjagoff.com.",
];

const OVERLAYS = ["NEW DROP LIVE", "LOCAL JAGOFF ENERGY", "FOR THE LOCALS", "BUILT FOR JAGOFFS", "WESTERN PA READY", "LOCALJAGOFF.COM"];

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

function copyText(value) {
  if (!value || typeof navigator === "undefined") return false;
  navigator.clipboard.writeText(value);
  return true;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value || "promo").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "promo";
}

function platformLabel(value) {
  return PLATFORMS.find(([key]) => key === value)?.[1] || value;
}

function destinationList(platform) {
  return DESTINATIONS[platform] || [[`${platform}_local_jagoff`, `${platformLabel(platform)} - Local Jagoff`]];
}

function destinationLabel(platform, destination) {
  return destinationList(platform).find(([value]) => value === destination)?.[1] || destinationList(platform)[0][1];
}

function productName(product) {
  return product?.name || "Local Jagoff Product";
}

function productImage(product) {
  return product?.thumbnail_url || product?.image || product?.image_url || "";
}

function productUrl(product) {
  return product?.id ? `https://www.localjagoff.com/product/${product.id}` : "https://www.localjagoff.com";
}

function trackedProductUrl(product, platform, destination) {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: "builder-post",
    utm_content: slugify(productName(product)),
    utm_term: destination,
  });
  return `${productUrl(product)}?${params.toString()}`;
}

function productType(product) {
  const name = productName(product).toLowerCase();
  if (name.includes("hoodie")) return "hoodie";
  if (name.includes("shirt") || name.includes("tee")) return "shirt";
  if (name.includes("hat") || name.includes("cap")) return "hat";
  if (name.includes("724")) return "724 gear";
  return "gear";
}

function hashtagOptions(product, platform) {
  const type = productType(product);
  const base = ["#LocalJagoff", "#Pittsburgh", "#WesternPA", "#Yinzer"];
  if (productName(product).includes("724")) base.push("#724");
  else base.push("#412", "#724");
  if (type === "hoodie") base.push("#HoodieSeason");
  if (type === "shirt") base.push("#PittsburghShirts");
  if (type === "hat") base.push("#PittsburghHats");
  if (platform === "tiktok") base.push("#Streetwear", "#SmallBusiness");

  return [
    base,
    base.filter((tag) => tag !== "#Yinzer"),
    ["#LocalJagoff", "#Pittsburgh", "#WesternPA", "#SmallBusiness"],
  ];
}

function captionOptions(product) {
  const name = productName(product);
  const type = productType(product);
  const local = name.includes("724") ? "724 / Western PA" : "Pittsburgh / Western PA";

  return [
    `⚡ New from Local Jagoff.\n\n${name}. ${local} ${type} with enough attitude to make it feel right.\n\nGrab yours before another jagoff does.`,
    `${name} is live.\n\nLocal gear for people who can take a joke, give one back, and still somehow have good taste.`,
    `A little black-and-gold attitude. A little local mouth.\n\n${name} from Local Jagoff is ready to go.`,
    `Not tourist gear. Not fake tough.\n\n${name}. Built for the locals who get it.`,
    `For the jagoff who says they are leaving in five and is absolutely not.\n\n${name} is live now.`,
    `Fresh drop from Local Jagoff.\n\n${name}. Local gear with a little attitude built in.`,
  ];
}

function scriptOptions(product) {
  const name = productName(product);
  return [
    `Scene 1: Product pops on a black-and-gold background. Text: NEW DROP LIVE.\nScene 2: Quick zoom on design. Text: ${name}.\nScene 3: End card. Text: LOCALJAGOFF.COM. Voiceover: Shop Local Jagoff before someone else gets loud about it.`,
    `Scene 1: Start with product closeup. Text: LOCAL JAGOFF ENERGY.\nScene 2: Show full product. Text: FOR THE LOCALS.\nScene 3: Site URL and CTA. Voiceover: Grab it at localjagoff.com.`,
    `Scene 1: Fast intro cut. Text: NOT TOURIST GEAR.\nScene 2: Product detail. Text: ${name}.\nScene 3: Logo/site. Text: LOCALJAGOFF.COM.`,
  ];
}

function defaultSelected() {
  return { hook: 0, caption: 0, cta: 0, hashtags: 0, overlay: 0, script: 0 };
}

function buildOptions(product, platform) {
  return {
    hooks: HOOKS,
    captions: captionOptions(product),
    ctas: CTAS,
    hashtags: hashtagOptions(product, platform),
    overlays: OVERLAYS,
    scripts: scriptOptions(product),
  };
}

function buildCleanCaption(options, selected) {
  const hook = options?.hooks?.[selected.hook] || "";
  const caption = options?.captions?.[selected.caption] || "";
  const cta = options?.ctas?.[selected.cta] || "";
  return [hook, caption, cta].filter(Boolean).join("\n\n");
}

function bankEntry(product, type, platform, text, tag) {
  return {
    id: `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    productId: String(product?.id || ""),
    productName: productName(product),
    productImage: productImage(product),
    productCategory: product?.category || productType(product),
    type,
    platform,
    text,
    source: "Promo Builder",
    tag,
    status: "Approved",
  };
}

function OptionBlock({ title, value, items, selected, onSelect, render = (item) => item }) {
  if (!items?.length) return null;
  return (
    <section className="choiceBlock">
      <h2>{title}</h2>
      <div className="choiceList">
        {items.map((item, index) => (
          <button key={`${value}-${index}`} type="button" className={`choiceCard ${selected === index ? "chosen" : ""}`} onClick={() => onSelect(index)}>
            <span className="choiceDot" />
            <span>{render(item)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlatformPreview({ product, platform, destination, caption, hashtags, link, overlay, firstComment, script }) {
  const image = productImage(product);
  const isVideoPlatform = platform === "tiktok" || platform === "youtube_shorts";

  return (
    <section className={`preview preview-${platform}`}>
      <div className="previewTop">
        <div className="avatar">LJ</div>
        <div>
          <strong>Local Jagoff</strong>
          <span>{destinationLabel(platform, destination)} preview</span>
        </div>
      </div>

      <div className="previewBody">
        <p>{caption || "Your final caption will preview here."}</p>
        {hashtags && <p className="tags">{hashtags}</p>}
      </div>

      <div className={isVideoPlatform ? "media videoMedia" : "media"}>
        {image ? <img src={image} alt={productName(product)} /> : <div className="noImage">Product Image</div>}
        {overlay && <div className="overlayText">{overlay}</div>}
      </div>

      <div className="linkCard">
        <span>LOCALJAGOFF.COM</span>
        <strong>{productName(product)}</strong>
        <small>{link}</small>
      </div>

      {firstComment && <div className="comment"><strong>First comment</strong><p>{firstComment}</p></div>}
      {isVideoPlatform && script && <details className="script"><summary>Video script</summary><pre>{script}</pre></details>}
    </section>
  );
}

export default function PromoBuilder() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [destination, setDestination] = useState("facebook_page_local_jagoff");
  const [scheduledDate, setScheduledDate] = useState(todayIso());
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(defaultSelected());
  const [finalEdit, setFinalEdit] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setProductId(list[0]?.id ? String(list[0].id) : "");
      })
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!destinationList(platform).some(([value]) => value === destination)) setDestination(destinationList(platform)[0][0]);
  }, [platform, destination]);

  const product = useMemo(() => products.find((item) => String(item.id) === String(productId)) || products[0] || null, [products, productId]);
  const generatedCaption = useMemo(() => options ? buildCleanCaption(options, selected) : "", [options, selected]);
  const finalCaption = finalEdit || generatedCaption;
  const tags = options ? (options.hashtags[selected.hashtags] || []).join(" ") : "";
  const overlay = options ? options.overlays[selected.overlay] || "" : "";
  const firstComment = options ? `${options.ctas[selected.cta] || ""} 🖤💛`.trim() : "";
  const script = options ? options.scripts[selected.script] || "" : "";
  const link = product ? trackedProductUrl(product, platform, destination) : "https://www.localjagoff.com";

  useEffect(() => {
    setFinalEdit(generatedCaption);
  }, [generatedCaption]);

  const generateOptions = () => {
    if (!product) {
      setMessage("Pick a product first.");
      return;
    }
    setOptions(buildOptions(product, platform));
    setSelected(defaultSelected());
    setMessage("Options generated. Pick the cards you want, then edit the clean final caption.");
  };

  const resetFinal = () => {
    setFinalEdit(generatedCaption);
    setMessage("Final caption reset to the generated version.");
  };

  const copyBundle = () => {
    const bundle = [
      finalCaption,
      tags ? `\n${tags}` : "",
      link ? `\n${link}` : "",
    ].filter(Boolean).join("\n");
    setMessage(copyText(bundle) ? "Copied clean posting copy." : "Nothing to copy.");
  };

  const saveToQueueWithStatus = (status) => {
    if (!finalCaption || !product) {
      setMessage("Build a final caption first.");
      return;
    }

    const queue = readArray(QUEUE_KEY);
    const item = {
      id: `builder-${Date.now()}`,
      queueId: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      source: "Promo Builder",
      mode: "builder",
      platform,
      displayPlatform: platform,
      scheduledPlatform: platform,
      destination,
      destinationLabel: destinationLabel(platform, destination),
      scheduledDate,
      status,
      product,
      promo: {
        brand_angle: "Built from selected Promo Builder parts.",
        builder_final: finalCaption,
        facebook_post: platform === "facebook" ? finalCaption : "",
        instagram_caption: platform === "instagram" ? `${finalCaption}\n\n${tags}`.trim() : "",
        tiktok_caption: platform === "tiktok" ? `${finalCaption}\n\n${tags}`.trim() : "",
        youtube_shorts_title: platform === "youtube_shorts" ? `${productName(product)} | Local Jagoff Drop` : "",
        youtube_shorts_description: platform === "youtube_shorts" ? `${finalCaption}\n\n${tags}`.trim() : "",
        cta: [firstComment ? `First comment: ${firstComment}` : "", `Link: ${link}`].filter(Boolean).join("\n"),
        hashtags: tags,
        image_overlay_text: overlay,
        short_video_script: platform === "tiktok" || platform === "youtube_shorts" ? script : "",
      },
    };

    writeArray(QUEUE_KEY, [item, ...queue].slice(0, 500));
    setMessage(`Saved to Queue as ${status} for ${destinationLabel(platform, destination)}.`);
  };

  const saveSelectedToBank = () => {
    if (!options || !product) {
      setMessage("Generate options first.");
      return;
    }
    const bank = readArray(BANK_KEY);
    const entries = [
      bankEntry(product, "hook", platform, options.hooks[selected.hook], "Builder selected hook"),
      bankEntry(product, "caption", platform, options.captions[selected.caption], "Builder selected caption"),
      bankEntry(product, "cta", platform, options.ctas[selected.cta], "Builder selected CTA"),
      bankEntry(product, "overlay", "general", overlay, "Builder selected overlay"),
    ].filter((entry) => entry.text);
    writeArray(BANK_KEY, [...entries, ...bank].slice(0, 800));
    setMessage(`${entries.length} selected part${entries.length === 1 ? "" : "s"} saved to Promo Parts.`);
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Promo Builder</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Promo Builder</h1>
          <p>Pick clean post parts, preview the platform post, then save it to the queue. Facebook and Instagram do not include video script text.</p>
        </header>

        <section className="controls">
          <label>Product<select value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Destination<select value={destination} onChange={(e) => setDestination(e.target.value)}>{destinationList(platform).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Schedule Date<input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></label>
          <button type="button" onClick={generateOptions}>Generate Options</button>
        </section>

        {message && <section className="message">{message}</section>}

        {!options && <section className="empty"><h2>Start with Generate Options</h2><p>This creates several hooks, captions, CTAs, hashtags, and overlay lines you can pick from.</p></section>}

        {options && <section className="builderGrid">
          <div className="choices">
            <OptionBlock title="Choose Hook" value="hook" items={options.hooks} selected={selected.hook} onSelect={(index) => setSelected({ ...selected, hook: index })} />
            <OptionBlock title="Choose Caption" value="caption" items={options.captions} selected={selected.caption} onSelect={(index) => setSelected({ ...selected, caption: index })} />
            <OptionBlock title="Choose CTA" value="cta" items={options.ctas} selected={selected.cta} onSelect={(index) => setSelected({ ...selected, cta: index })} />
            <OptionBlock title="Choose Hashtags" value="hashtags" items={options.hashtags} selected={selected.hashtags} onSelect={(index) => setSelected({ ...selected, hashtags: index })} render={(item) => item.join(" ")} />
            <OptionBlock title="Choose Overlay" value="overlay" items={options.overlays} selected={selected.overlay} onSelect={(index) => setSelected({ ...selected, overlay: index })} />
            {(platform === "tiktok" || platform === "youtube_shorts") && <OptionBlock title="Choose Video Script" value="script" items={options.scripts} selected={selected.script} onSelect={(index) => setSelected({ ...selected, script: index })} />}
          </div>

          <aside className="finalPanel">
            <p className="kicker">FINAL CLEAN POST</p>
            <h2>{platformLabel(platform)}</h2>
            <label>Final caption<textarea value={finalEdit} onChange={(e) => setFinalEdit(e.target.value)} /></label>
            <div className="helperGrid">
              <div><strong>Hashtags</strong><p>{tags}</p></div>
              <div><strong>Link</strong><p>{link}</p></div>
              <div><strong>First comment</strong><p>{firstComment}</p></div>
              <div><strong>Overlay</strong><p>{overlay}</p></div>
            </div>
            {product && <PlatformPreview product={product} platform={platform} destination={destination} caption={finalCaption} hashtags={tags} link={link} overlay={overlay} firstComment={firstComment} script={script} />}
            <div className="actions">
              <button type="button" onClick={copyBundle}>Copy Clean Post</button>
              <button type="button" onClick={() => saveToQueueWithStatus("Approved")}>Save as Approved</button>
              <button type="button" onClick={() => saveToQueueWithStatus("Needs Review")} className="secondary">Save as Needs Review</button>
              <button type="button" onClick={saveSelectedToBank} className="secondary">Save Parts</button>
              <button type="button" className="secondary" onClick={resetFinal}>Reset Caption</button>
            </div>
          </aside>
        </section>}
      </main>

      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.15),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1320px;margin:0 auto;padding-top:34px}.hero,.controls,.message,.empty,.choiceBlock,.finalPanel{background:rgba(13,13,13,.94);border:1px solid rgba(255,230,0,.18);border-radius:24px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:26px;margin-bottom:14px}.kicker{margin:0 0 10px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p,.empty p{color:#ddd;line-height:1.55}.controls{display:grid;grid-template-columns:2fr 1fr 1.4fr 1fr auto;gap:12px;align-items:end;padding:16px;margin-bottom:14px}label{display:block;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}select,input,textarea{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:260px;resize:vertical;line-height:1.55;text-transform:none;letter-spacing:0;font-size:14px}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#ffe600;color:#000}.secondary{background:#1b1b1b;color:#fff;border:1px solid #333}.message,.empty{padding:16px;margin-bottom:14px;color:#ffe600;font-weight:900}.builderGrid{display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:14px;align-items:start}.choiceBlock{padding:16px;margin-bottom:14px}.choiceBlock h2,.finalPanel h2{text-transform:uppercase;color:#ffe600;margin:0 0 12px}.choiceList{display:grid;gap:10px}.choiceCard{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;text-align:left;width:100%;padding:14px;border-radius:16px;background:#050505;color:#f2f2f2;border:1px solid #2b2b2b;line-height:1.45;white-space:pre-wrap;text-transform:none;letter-spacing:0;font-size:14px}.choiceCard:hover,.choiceCard.chosen{border-color:#ffe600;background:rgba(255,230,0,.08)}.choiceDot{width:14px;height:14px;border-radius:999px;border:2px solid #777;margin-top:3px}.choiceCard.chosen .choiceDot{background:#ffe600;border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.18)}.finalPanel{position:sticky;top:76px;padding:16px}.helperGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.helperGrid div{background:#050505;border:1px solid #242424;border-radius:14px;padding:12px}.helperGrid strong{display:block;color:#ffe600;font-size:11px;text-transform:uppercase;letter-spacing:1px}.helperGrid p{margin:6px 0 0;color:#eee;line-height:1.35;overflow-wrap:anywhere}.actions{display:grid;gap:10px;margin-top:12px}.preview{margin:14px 0;background:#090909;border:1px solid rgba(255,230,0,.2);border-radius:20px;overflow:hidden}.previewTop{display:flex;gap:10px;align-items:center;padding:12px;border-bottom:1px solid #222}.avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;background:#ffe600;color:#000;font-weight:900}.previewTop strong,.previewTop span{display:block}.previewTop span{margin-top:3px;color:#aaa;font-size:12px}.previewBody{padding:12px}.previewBody p{white-space:pre-wrap;color:#f2f2f2;line-height:1.45;margin:0 0 10px}.tags{color:#ffe600!important;font-weight:800}.media{position:relative;display:grid;place-items:center;min-height:250px;background:linear-gradient(135deg,#171717,#050505)}.videoMedia{min-height:400px}.media img{max-width:100%;max-height:410px;object-fit:contain}.noImage{display:grid;place-items:center;width:100%;height:250px;color:#888;text-transform:uppercase;font-weight:900}.overlayText{position:absolute;left:18px;right:18px;bottom:18px;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.72);color:#ffe600;text-align:center;font-size:clamp(18px,4vw,34px);font-weight:1000;text-transform:uppercase;letter-spacing:1px}.linkCard{padding:12px;background:#f2f2f2;color:#111}.linkCard span,.linkCard strong,.linkCard small{display:block}.linkCard span{font-size:11px;color:#555;font-weight:900;letter-spacing:1px}.linkCard strong{margin:4px 0;text-transform:uppercase}.linkCard small{color:#666;overflow-wrap:anywhere}.comment{padding:12px;border-top:1px solid #222;background:#050505}.comment strong{color:#ffe600;text-transform:uppercase;font-size:12px;letter-spacing:1px}.comment p{white-space:pre-wrap;color:#eee;line-height:1.45}.script{padding:12px;border-top:1px solid #222;background:#050505}.script summary{cursor:pointer;color:#ffe600;font-weight:900;text-transform:uppercase}.script pre{white-space:pre-wrap;color:#eee;line-height:1.45}@media(max-width:1100px){.controls,.builderGrid{grid-template-columns:1fr}.finalPanel{position:static}textarea{min-height:240px}.helperGrid{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
