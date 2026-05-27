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

const OVERLAYS = [
  "NEW DROP LIVE",
  "LOCAL JAGOFF ENERGY",
  "FOR THE LOCALS",
  "BUILT FOR JAGOFFS",
  "WESTERN PA READY",
  "LOCALJAGOFF.COM",
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
  if (!value || typeof navigator === "undefined" || !navigator?.clipboard?.writeText) return false;
  navigator.clipboard.writeText(value);
  return true;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value || "promo")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "promo";
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

function buildCaption(options, selected) {
  return [options?.hooks?.[selected.hook], options?.captions?.[selected.caption], options?.ctas?.[selected.cta]]
    .filter(Boolean)
    .join("\n\n");
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

function ChoiceGroup({ title, items, selected, onSelect, render = (item) => item }) {
  if (!items?.length) return null;

  return (
    <section className="choiceGroup">
      <div className="choiceHead">
        <div>
          <p className="miniKicker">Pick one</p>
          <h2>{title}</h2>
        </div>
        <span>{items.length} options</span>
      </div>

      <div className="optionList">
        {items.map((item, index) => (
          <article key={`${title}-${index}`} className={`optionRow ${selected === index ? "picked" : ""}`}>
            <div className="optionText">
              <strong>Option {index + 1}</strong>
              <p>{render(item)}</p>
            </div>
            <button type="button" className="useBtn" onClick={() => onSelect(index)}>
              {selected === index ? "Using" : "Use"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlatformPreview({ product, platform, destination, caption, hashtags, link, overlay, firstComment, script }) {
  const image = productImage(product);
  const isVideo = platform === "tiktok" || platform === "youtube_shorts";

  return (
    <section className="preview">
      <div className="previewHeader">
        <div className="avatar">LJ</div>
        <div>
          <strong>Local Jagoff</strong>
          <span>{destinationLabel(platform, destination)}</span>
        </div>
      </div>

      <div className="previewText">
        <p>{caption}</p>
        {hashtags && <p className="hashes">{hashtags}</p>}
      </div>

      <div className={isVideo ? "media videoMedia" : "media"}>
        {image ? <img src={image} alt={productName(product)} /> : <div className="noImage">Product Image</div>}
        {overlay && <div className="overlay">{overlay}</div>}
      </div>

      <div className="linkPreview">
        <span>localjagoff.com</span>
        <strong>{productName(product)}</strong>
        <small>{link}</small>
      </div>

      {firstComment && (
        <div className="comment">
          <strong>Admin note: first comment idea</strong>
          <p>{firstComment}</p>
        </div>
      )}

      {isVideo && script && (
        <details className="script">
          <summary>Video script</summary>
          <pre>{script}</pre>
        </details>
      )}
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
    if (!destinationList(platform).some(([value]) => value === destination)) {
      setDestination(destinationList(platform)[0][0]);
    }
  }, [platform, destination]);

  const product = useMemo(
    () => products.find((item) => String(item.id) === String(productId)) || products[0] || null,
    [products, productId]
  );
  const generatedCaption = useMemo(() => (options ? buildCaption(options, selected) : ""), [options, selected]);
  const finalCaption = finalEdit || generatedCaption;
  const tags = options ? (options.hashtags[selected.hashtags] || []).join(" ") : "";
  const overlay = options ? options.overlays[selected.overlay] || "" : "";
  const firstComment = options ? `${options.ctas[selected.cta] || ""} 🖤💛`.trim() : "";
  const script = options ? options.scripts[selected.script] || "" : "";
  const link = product ? trackedProductUrl(product, platform, destination) : "https://www.localjagoff.com";
  const isVideoPlatform = platform === "tiktok" || platform === "youtube_shorts";

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
    setMessage("Options generated. Use the yellow buttons to pick the final post parts.");
  };

  const copyCaptionOnly = () => setMessage(copyText(finalCaption) ? "Copied caption." : "Nothing to copy.");
  const copyFullPost = () => setMessage(copyText([finalCaption, tags, link].filter(Boolean).join("\n\n")) ? "Copied clean full post." : "Nothing to copy.");

  const saveToQueueWithStatus = (status) => {
    if (!finalCaption || !product) {
      setMessage("Build a final caption first.");
      return;
    }

    const queue = readArray(QUEUE_KEY);
    const cleanCaptionWithTags = [finalCaption, tags].filter(Boolean).join("\n\n");
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
        builder_final: cleanCaptionWithTags,
        facebook_post: platform === "facebook" ? finalCaption : "",
        instagram_caption: platform === "instagram" ? cleanCaptionWithTags : "",
        tiktok_caption: platform === "tiktok" ? cleanCaptionWithTags : "",
        youtube_shorts_title: platform === "youtube_shorts" ? `${productName(product)} | Local Jagoff Drop` : "",
        youtube_shorts_description: platform === "youtube_shorts" ? cleanCaptionWithTags : "",
        cta: [firstComment ? `First comment: ${firstComment}` : "", `Link: ${link}`].filter(Boolean).join("\n"),
        hashtags: tags,
        image_overlay_text: overlay,
        short_video_script: isVideoPlatform ? script : "",
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
      bankEntry(product, "hook", platform, options.hooks[selected.hook], "Builder hook"),
      bankEntry(product, "caption", platform, options.captions[selected.caption], "Builder caption"),
      bankEntry(product, "cta", platform, options.ctas[selected.cta], "Builder CTA"),
      bankEntry(product, "overlay", "general", overlay, "Builder overlay"),
    ].filter((entry) => entry.text);

    writeArray(BANK_KEY, [...entries, ...bank].slice(0, 800));
    setMessage(`${entries.length} selected parts saved to Promo Parts.`);
  };

  return (
    <div className="page">
      <Head>
        <title>Local Jagoff Promo Builder</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <PromoAdminNav />

      <main className="wrap">
        <header className="hero">
          <p className="kicker">PRIVATE ADMIN TOOL</p>
          <h1>Promo Builder</h1>
          <p>Pick clean post parts, preview the post, then save it to the Posting Board. Facebook and Instagram stay caption-only with no video script junk.</p>
        </header>

        <section className="setup" aria-label="Promo setup">
          <label>
            Product
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label>
            Platform
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label>
            Destination
            <select value={destination} onChange={(e) => setDestination(e.target.value)}>
              {destinationList(platform).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label>
            Date
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </label>

          <button type="button" className="generate" onClick={generateOptions}>Generate Options</button>
        </section>

        {message && <section className="message">{message}</section>}

        {!options && (
          <section className="empty">
            <h2>Generate options first</h2>
            <p>You will get clean dark option cards with yellow Use buttons for hook, caption, CTA, hashtags, and overlay text.</p>
          </section>
        )}

        {options && (
          <section className="builder">
            <div className="left">
              <ChoiceGroup title="Hook" items={options.hooks} selected={selected.hook} onSelect={(index) => setSelected({ ...selected, hook: index })} />
              <ChoiceGroup title="Caption" items={options.captions} selected={selected.caption} onSelect={(index) => setSelected({ ...selected, caption: index })} />
              <ChoiceGroup title="CTA" items={options.ctas} selected={selected.cta} onSelect={(index) => setSelected({ ...selected, cta: index })} />
              <ChoiceGroup title="Hashtags" items={options.hashtags} selected={selected.hashtags} onSelect={(index) => setSelected({ ...selected, hashtags: index })} render={(items) => items.join(" ")} />
              <ChoiceGroup title="Image Overlay" items={options.overlays} selected={selected.overlay} onSelect={(index) => setSelected({ ...selected, overlay: index })} />
              {isVideoPlatform && <ChoiceGroup title="Video Script" items={options.scripts} selected={selected.script} onSelect={(index) => setSelected({ ...selected, script: index })} />}
            </div>

            <aside className="right">
              <section className="finalBox">
                <div className="choiceHead">
                  <div>
                    <p className="miniKicker">Final copy</p>
                    <h2>Edit Before Saving</h2>
                  </div>
                </div>

                <textarea value={finalEdit} onChange={(e) => setFinalEdit(e.target.value)} rows={12} />

                <div className="cleanCopy">
                  <strong>Clean copy output</strong>
                  <p>No labels are included when copying. Copy Full Post includes caption, hashtags, and tracked link only.</p>
                </div>

                <div className="actions">
                  <button type="button" onClick={copyCaptionOnly}>Copy Caption</button>
                  <button type="button" onClick={copyFullPost}>Copy Full Post</button>
                  <button type="button" onClick={() => saveToQueueWithStatus("Draft")}>Save Draft</button>
                  <button type="button" onClick={() => saveToQueueWithStatus("Ready")}>Save Ready</button>
                  <button type="button" onClick={saveSelectedToBank}>Save Parts</button>
                </div>
              </section>

              <PlatformPreview
                product={product}
                platform={platform}
                destination={destination}
                caption={finalCaption}
                hashtags={tags}
                link={link}
                overlay={overlay}
                firstComment={firstComment}
                script={script}
              />
            </aside>
          </section>
        )}
      </main>

      <style jsx>{`
        .page{min-height:100vh;padding:0 16px 90px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.16),transparent 30%),linear-gradient(180deg,#050505,#000)}
        .wrap{max-width:1320px;margin:0 auto;padding-top:34px}
        .hero,.setup,.choiceGroup,.finalBox,.preview,.empty,.message{background:rgba(12,12,12,.94);border:1px solid rgba(255,230,0,.2);border-radius:26px;box-shadow:0 22px 80px rgba(0,0,0,.42)}
        .hero{padding:28px;margin-bottom:16px}
        .kicker,.miniKicker{margin:0 0 9px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
        .miniKicker{font-size:10px;letter-spacing:1.6px;margin-bottom:5px}
        h1,h2,p{margin-top:0}
        h1{margin-bottom:12px;font-size:clamp(46px,8vw,96px);line-height:.9;text-transform:uppercase}
        h2{margin-bottom:0;color:#ffe600;text-transform:uppercase;line-height:1.05}
        p{color:#ddd;line-height:1.55}
        .setup{display:grid;grid-template-columns:minmax(240px,2fr) repeat(3,minmax(150px,1fr)) auto;gap:12px;align-items:end;padding:18px;margin-bottom:14px}
        label{display:grid;gap:8px;color:#ffe600;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
        select,input,textarea{width:100%;border:1px solid rgba(255,230,0,.25);border-radius:14px;background:#050505;color:#fff;padding:12px;font:inherit;outline:none}
        textarea{min-height:240px;resize:vertical;line-height:1.5;white-space:pre-wrap}
        select:focus,input:focus,textarea:focus{border-color:#ffe600;box-shadow:0 0 0 3px rgba(255,230,0,.1)}
        button{border:none;border-radius:14px;background:#ffe600;color:#000;padding:12px 15px;font-weight:950;letter-spacing:.3px;cursor:pointer;text-transform:uppercase}
        button:hover{filter:brightness(1.03);transform:translateY(-1px)}
        .generate{min-height:45px;white-space:nowrap}
        .message,.empty{padding:18px;margin-bottom:14px}
        .message{color:#ffe600;font-weight:900}
        .builder{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr);gap:16px;align-items:start}
        .left{display:grid;gap:14px}
        .right{position:sticky;top:74px;display:grid;gap:14px}
        .choiceGroup,.finalBox,.preview{padding:18px}
        .choiceHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
        .choiceHead span{flex:0 0 auto;border:1px solid rgba(255,230,0,.3);border-radius:999px;padding:7px 10px;color:#ffe600;font-size:11px;font-weight:900;text-transform:uppercase;white-space:nowrap}
        .optionList{display:grid;gap:10px}
        .optionRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))}
        .optionRow.picked{border-color:#ffe600;background:linear-gradient(135deg,rgba(255,230,0,.15),rgba(12,12,12,.94))}
        .optionText strong{display:block;margin-bottom:7px;color:#fff;font-size:12px;font-weight:950;letter-spacing:1px;text-transform:uppercase}
        .optionText p{margin:0;white-space:pre-wrap;color:#e8e8e8}
        .useBtn{min-width:82px}
        .optionRow.picked .useBtn{background:#fff;color:#000}
        .cleanCopy{margin:12px 0;padding:13px;border:1px solid rgba(255,230,0,.18);border-radius:16px;background:#050505}
        .cleanCopy strong{display:block;color:#ffe600;text-transform:uppercase;font-size:12px;letter-spacing:1px}
        .cleanCopy p{margin:6px 0 0;color:#cfcfcf;font-size:13px}
        .actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .actions button:last-child{grid-column:1 / -1;background:#fff;color:#000}
        .previewHeader{display:flex;gap:12px;align-items:center;margin-bottom:14px}
        .avatar{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#ffe600;color:#000;font-weight:950}
        .previewHeader strong,.previewHeader span{display:block}
        .previewHeader span{color:#aaa;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
        .previewText{padding:14px;border-radius:18px;background:#050505;border:1px solid rgba(255,255,255,.08)}
        .previewText p{white-space:pre-wrap;margin:0 0 12px}
        .previewText p:last-child{margin-bottom:0}
        .hashes{color:#ffe600;font-weight:800}
        .media{position:relative;display:grid;place-items:center;min-height:340px;margin-top:12px;border-radius:22px;overflow:hidden;background:#111;border:1px solid rgba(255,230,0,.15)}
        .videoMedia{min-height:520px;max-width:330px;margin-left:auto;margin-right:auto}
        .media img{display:block;width:100%;height:100%;object-fit:cover}
        .noImage{color:#777;font-weight:900;text-transform:uppercase}
        .overlay{position:absolute;left:16px;right:16px;bottom:16px;padding:12px 14px;border-radius:14px;background:rgba(0,0,0,.74);color:#ffe600;font-size:24px;font-weight:950;text-align:center;text-transform:uppercase;letter-spacing:1px}
        .linkPreview,.comment,.script{margin-top:12px;padding:13px;border-radius:16px;background:#050505;border:1px solid rgba(255,255,255,.08)}
        .linkPreview span,.linkPreview strong,.linkPreview small{display:block}
        .linkPreview span{color:#ffe600;font-size:12px;font-weight:900;text-transform:uppercase}
        .linkPreview small{margin-top:6px;color:#999;overflow-wrap:anywhere}
        .comment strong{color:#ffe600;text-transform:uppercase;font-size:12px;letter-spacing:1px}
        .comment p{margin:7px 0 0}
        .script summary{color:#ffe600;font-weight:950;cursor:pointer;text-transform:uppercase}
        .script pre{white-space:pre-wrap;color:#ddd;line-height:1.5;font-family:inherit}
        @media(max-width:1100px){.setup{grid-template-columns:repeat(2,minmax(0,1fr))}.generate{grid-column:1 / -1}.builder{grid-template-columns:1fr}.right{position:static}.videoMedia{max-width:none}}
        @media(max-width:680px){.page{padding-left:12px;padding-right:12px}.setup,.optionRow,.choiceHead{grid-template-columns:1fr;display:grid}.useBtn,.generate,.actions button{width:100%}.actions{grid-template-columns:1fr}.hero,.setup,.choiceGroup,.finalBox,.preview,.empty,.message{border-radius:20px;padding:16px}.media{min-height:260px}}
      `}</style>
    </div>
  );
}
