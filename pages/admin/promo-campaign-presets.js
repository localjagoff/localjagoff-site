import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";

const PRESETS_KEY = "localJagoffCampaignPresets";

const DEFAULT_PRESETS = [
  {
    id: "preset-new-drop",
    name: "New Drop Push",
    description: "General launch push for a fresh product drop.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 5,
    notes: "New gear is live. Keep it direct, product-focused, and local. Push urgency without sounding desperate. Mention Local Jagoff and make the product feel like part of Pittsburgh-area everyday gear.",
    system: true,
  },
  {
    id: "preset-hoodie-weather",
    name: "Hoodie Weather",
    description: "Cold-weather push for hoodies and heavier gear.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "Lean into hoodie weather, chilly Pittsburgh mornings, and comfort without sounding generic. Make the copy feel local, practical, and a little jagoff. Avoid overexplaining fabric unless useful.",
    system: true,
  },
  {
    id: "preset-724-local",
    name: "724 Local Push",
    description: "Focused campaign for 724-area gear only.",
    mode: "product_drop",
    tone: "more_jagoff",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "This is for 724-area products. Do not mention 412 unless the product itself is specifically 412. Keep it western PA, local, gritty, and proud. The 724 angle should feel intentional, not like an afterthought.",
    system: true,
  },
  {
    id: "preset-weekend-sale",
    name: "Weekend Sale",
    description: "Short weekend promo with a discount code.",
    mode: "sale",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 3,
    notes: "Weekend sale push. Mention the promo code if provided. Keep the CTA simple and make the post feel like a limited-time reason to shop, not a clearance dump.",
    system: true,
  },
  {
    id: "preset-holiday-promo",
    name: "Holiday Promo",
    description: "Holiday sale framework with promo code support.",
    mode: "holiday",
    tone: "clean",
    platforms: ["facebook", "instagram", "tiktok", "youtube_shorts"],
    days: 7,
    notes: "Holiday promo campaign. Use the selected holiday as the reason for the campaign. Mention the promo code if provided. Keep the copy festive but still Local Jagoff, not corporate or cheesy.",
    system: true,
  },
  {
    id: "preset-winner-reuse",
    name: "Best Winner Reuse",
    description: "Campaign designed around proven Product Bank / Performance winners.",
    mode: "product_drop",
    tone: "balanced",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 7,
    notes: "Reuse proven Product Bank and Performance winners where possible. Keep the structure fresh, but borrow the angles that already worked. Do not copy the same wording over and over.",
    system: true,
  },
  {
    id: "preset-clean-ad-safe",
    name: "Clean Ad-Safe Campaign",
    description: "Safer copy for boosted posts or ad-style captions.",
    mode: "clean_ad",
    tone: "clean",
    platforms: ["facebook", "instagram"],
    days: 5,
    notes: "Keep this ad-safe and clean. Still sound like Local Jagoff, but avoid anything that could be flagged or feel too aggressive. Focus on product, local pride, and a clean CTA.",
    system: true,
  },
  {
    id: "preset-savage-organic",
    name: "Savage Organic",
    description: "Sharper organic posts where attitude matters more than ad safety.",
    mode: "funny_pittsburgh",
    tone: "savage_but_safe",
    platforms: ["facebook", "instagram", "tiktok"],
    days: 5,
    notes: "Organic-only attitude. Be sharper, funnier, and more Pittsburgh, but keep it safe and not hateful. Do not sound like a generic brand. The copy should feel like a local jagoff wrote it on purpose.",
    system: true,
  },
];

const MODE_OPTIONS = [
  ["product_drop", "Product Drop"],
  ["sale", "Sale"],
  ["holiday", "Holiday"],
  ["short_video", "Short Video"],
  ["funny_pittsburgh", "Funny Pittsburgh"],
  ["clean_ad", "Clean Ad-Safe"],
];

const TONE_OPTIONS = [
  ["balanced", "Balanced"],
  ["more_jagoff", "More Jagoff"],
  ["savage_but_safe", "Savage but Safe"],
  ["clean", "Clean"],
];

const PLATFORM_OPTIONS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube_shorts", "YouTube Shorts"],
];

function readPresets() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRESETS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePresets(value) {
  if (typeof window !== "undefined") window.localStorage.setItem(PRESETS_KEY, JSON.stringify(Array.isArray(value) ? value : []));
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

function copyText(value) {
  if (value && typeof navigator !== "undefined") navigator.clipboard.writeText(value);
}

function nowId() {
  return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePreset(item) {
  return {
    id: item.id || nowId(),
    name: String(item.name || "Untitled Preset").trim(),
    description: String(item.description || "").trim(),
    mode: item.mode || "product_drop",
    tone: item.tone || "balanced",
    platforms: Array.isArray(item.platforms) && item.platforms.length ? item.platforms : ["facebook", "instagram"],
    days: Math.max(1, Math.min(Number(item.days) || 7, 31)),
    notes: String(item.notes || "").trim(),
    promoCode: String(item.promoCode || "").trim(),
    holiday: String(item.holiday || "").trim(),
    system: Boolean(item.system),
  };
}

function mergeDefaults(saved) {
  const normalizedSaved = saved.map(normalizePreset);
  const savedIds = new Set(normalizedSaved.map((item) => item.id));
  const missingDefaults = DEFAULT_PRESETS.filter((item) => !savedIds.has(item.id));
  return [...missingDefaults, ...normalizedSaved].map(normalizePreset);
}

function label(options, value) {
  return options.find(([key]) => key === value)?.[1] || value;
}

function presetSummary(preset) {
  return [
    `Campaign Preset: ${preset.name}`,
    `Mode: ${label(MODE_OPTIONS, preset.mode)}`,
    `Tone: ${label(TONE_OPTIONS, preset.tone)}`,
    `Days: ${preset.days}`,
    `Platforms: ${preset.platforms.map((platform) => label(PLATFORM_OPTIONS, platform)).join(", ")}`,
    preset.holiday ? `Holiday: ${preset.holiday}` : "",
    preset.promoCode ? `Promo Code: ${preset.promoCode}` : "",
    "",
    preset.notes,
  ].filter(Boolean).join("\n");
}

export default function PromoCampaignPresets() {
  const [presets, setPresets] = useState([]);
  const [selectedId, setSelectedId] = useState("preset-new-drop");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState("product_drop");
  const [tone, setTone] = useState("balanced");
  const [platforms, setPlatforms] = useState(["facebook", "instagram", "tiktok"]);
  const [days, setDays] = useState(7);
  const [holiday, setHoliday] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [notes, setNotes] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const merged = mergeDefaults(readPresets());
    setPresets(merged);
    writePresets(merged);
  }, []);

  const selectedPreset = useMemo(() => presets.find((preset) => preset.id === selectedId) || presets[0], [presets, selectedId]);

  useEffect(() => {
    if (!selectedPreset) return;
    setName(selectedPreset.name);
    setDescription(selectedPreset.description);
    setMode(selectedPreset.mode);
    setTone(selectedPreset.tone);
    setPlatforms(selectedPreset.platforms);
    setDays(selectedPreset.days);
    setHoliday(selectedPreset.holiday || "");
    setPromoCode(selectedPreset.promoCode || "");
    setNotes(selectedPreset.notes);
  }, [selectedPreset]);

  const stats = useMemo(() => ({
    total: presets.length,
    custom: presets.filter((item) => !item.system).length,
    system: presets.filter((item) => item.system).length,
    holiday: presets.filter((item) => item.mode === "holiday").length,
  }), [presets]);

  const savePresets = (next) => {
    const clean = next.map(normalizePreset);
    setPresets(clean);
    writePresets(clean);
  };

  const togglePlatform = (platform) => {
    setPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  };

  const currentDraft = () => normalizePreset({
    id: selectedPreset?.system ? nowId() : selectedId || nowId(),
    name,
    description,
    mode,
    tone,
    platforms,
    days,
    holiday,
    promoCode,
    notes,
    system: false,
  });

  const savePreset = () => {
    const draft = currentDraft();
    if (!draft.name || !draft.notes) {
      setMessage("Add a preset name and notes before saving.");
      return;
    }

    const next = presets.filter((preset) => preset.id !== draft.id);
    savePresets([draft, ...next]);
    setSelectedId(draft.id);
    setMessage("Campaign preset saved.");
  };

  const duplicatePreset = () => {
    if (!selectedPreset) return;
    const duplicate = normalizePreset({ ...selectedPreset, id: nowId(), name: `${selectedPreset.name} Copy`, system: false });
    savePresets([duplicate, ...presets]);
    setSelectedId(duplicate.id);
    setMessage("Preset duplicated.");
  };

  const removePreset = () => {
    if (!selectedPreset) return;
    if (selectedPreset.system) {
      setMessage("Default presets cannot be removed. Duplicate it first if you want a custom version.");
      return;
    }
    const next = presets.filter((preset) => preset.id !== selectedPreset.id);
    savePresets(next);
    setSelectedId(next[0]?.id || "preset-new-drop");
    setMessage("Custom preset removed.");
  };

  const resetDefaults = () => {
    const custom = presets.filter((preset) => !preset.system);
    const next = [...DEFAULT_PRESETS, ...custom].map(normalizePreset);
    savePresets(next);
    setMessage("Default presets restored. Custom presets were kept.");
  };

  const exportJson = () => downloadFile("local-jagoff-campaign-presets.json", JSON.stringify({ exportedAt: new Date().toISOString(), campaignPresets: presets }, null, 2), "application/json");

  const importJson = (value) => {
    try {
      const parsed = JSON.parse(value || "{});
      const source = Array.isArray(parsed) ? parsed : parsed.campaignPresets || parsed.presets || [];
      if (!Array.isArray(source) || source.length === 0) {
        setMessage("No campaign presets found in that JSON.");
        return;
      }
      const imported = source.map((item) => normalizePreset({ ...item, id: item.id || nowId(), system: false }));
      savePresets(mergeDefaults([...imported, ...presets.filter((preset) => !preset.system)]));
      setMessage(`${imported.length} preset${imported.length === 1 ? "" : "s"} imported.`);
    } catch {
      setMessage("Could not read that preset JSON.");
    }
  };

  const copyPreset = () => {
    copyText(presetSummary(normalizePreset({ name, description, mode, tone, platforms, days, holiday, promoCode, notes })));
    setMessage("Preset notes copied.");
  };

  const openWeekBuilder = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("localJagoffSelectedCampaignPreset", JSON.stringify(normalizePreset({ name, description, mode, tone, platforms, days, holiday, promoCode, notes })));
      window.location.href = "/admin/promo-week-builder";
    }
  };

  return (
    <div className="page">
      <Head><title>Local Jagoff Campaign Presets</title><meta name="robots" content="noindex,nofollow" /></Head>
      <PromoAdminNav />
      <main className="wrap">
        <header className="hero"><p className="kicker">PRIVATE ADMIN TOOL</p><h1>Campaign Presets</h1><p>Save reusable campaign strategies so you do not have to retype the same notes every time you build a promo run.</p></header>

        <section className="stats"><div><strong>{stats.total}</strong><span>Total</span></div><div><strong>{stats.system}</strong><span>Defaults</span></div><div><strong>{stats.custom}</strong><span>Custom</span></div><div><strong>{stats.holiday}</strong><span>Holiday</span></div></section>

        <section className="layout">
          <aside className="panel listPanel">
            <div className="panelHead"><p className="kicker">PRESETS</p><h2>Strategy bank</h2></div>
            <div className="presetList">{presets.map((preset) => <button key={preset.id} type="button" className={selectedId === preset.id ? "selected" : ""} onClick={() => setSelectedId(preset.id)}><strong>{preset.name}</strong><span>{preset.description || label(MODE_OPTIONS, preset.mode)}</span>{preset.system && <em>Default</em>}</button>)}</div>
          </aside>

          <section className="panel editor">
            <div className="panelHead"><p className="kicker">EDIT</p><h2>{selectedPreset?.system ? "Duplicate default or save as custom" : "Custom preset"}</h2></div>
            <label className="full">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="full">Description<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
            <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{MODE_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label>Tone<select value={tone} onChange={(e) => setTone(e.target.value)}>{TONE_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label>Days<input type="number" min="1" max="31" value={days} onChange={(e) => setDays(e.target.value)} /></label>
            <label>Promo code<input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Optional" /></label>
            <label className="full">Holiday<input value={holiday} onChange={(e) => setHoliday(e.target.value)} placeholder="Optional" /></label>
            <div className="full"><p className="mini">Platforms</p><div className="checks">{PLATFORM_OPTIONS.map(([value, text]) => <button key={value} type="button" className={platforms.includes(value) ? "active" : ""} onClick={() => togglePlatform(value)}>{text}</button>)}</div></div>
            <label className="full">Strategy notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <div className="actions full"><button type="button" className="primary" onClick={savePreset}>Save Custom Preset</button><button type="button" onClick={duplicatePreset}>Duplicate</button><button type="button" onClick={copyPreset}>Copy Notes</button><button type="button" onClick={openWeekBuilder}>Use in Week Builder</button><button type="button" className="danger" onClick={removePreset}>Remove</button></div>{message && <p className="message full">{message}</p>}
          </section>
        </section>

        <section className="panel importPanel"><div><p className="kicker">BACKUP</p><h2>Export / import presets</h2></div><div className="actions"><button type="button" onClick={exportJson}>Export Presets JSON</button><button type="button" onClick={resetDefaults}>Restore Defaults</button></div><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste campaign preset JSON here..." /><button type="button" onClick={() => importJson(importText)}>Import Pasted JSON</button></section>
      </main>
      <style jsx>{`.page{min-height:100vh;padding:0 16px 80px;color:#fff;background:radial-gradient(circle at top left,rgba(255,230,0,.14),transparent 30%),linear-gradient(180deg,#050505,#000)}.wrap{max-width:1240px;margin:0 auto;padding-top:34px}.hero,.stats div,.panel{background:rgba(13,13,13,.9);border:1px solid rgba(255,230,0,.18);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.35)}.hero{padding:24px;margin-bottom:14px}.kicker,.mini{margin:0 0 8px;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,96px);line-height:.9;text-transform:uppercase}.hero p{color:#ddd;line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.stats div{padding:16px}.stats strong{display:block;color:#ffe600;font-size:30px}.stats span{color:#ccc;font-size:12px;font-weight:900;text-transform:uppercase}.layout{display:grid;grid-template-columns:380px minmax(0,1fr);gap:14px;margin-bottom:14px}.panel{padding:16px}.panelHead h2{font-size:26px;text-transform:uppercase}.presetList{display:grid;gap:8px;max-height:680px;overflow:auto}.presetList button{text-align:left;border:1px solid #333;border-radius:14px;background:#050505;color:#fff;padding:12px;cursor:pointer}.presetList button.selected{border-color:#ffe600;background:rgba(255,230,0,.1)}.presetList strong,.presetList span,.presetList em{display:block}.presetList span{color:#ccc;margin-top:4px}.presetList em{color:#ffe600;margin-top:6px;font-size:11px;font-style:normal;font-weight:900;text-transform:uppercase}.editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.full,.panelHead{grid-column:1/-1}label{display:block;color:#ffe600;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}input,select,textarea{width:100%;margin-top:8px;color:#fff;background:#050505;border:1px solid #333;border-radius:14px;padding:12px}textarea{min-height:170px}.checks,.actions{display:flex;gap:8px;flex-wrap:wrap}button{border:none;border-radius:14px;padding:12px 14px;cursor:pointer;font-weight:900;background:#1b1b1b;color:#fff;border:1px solid #333}.primary,.active{background:#ffe600!important;color:#000!important;border-color:#ffe600!important}.danger{color:#ff9a9a!important}.message{color:#ffe600;font-weight:900}.importPanel{display:grid;gap:12px} .importPanel textarea{min-height:140px}@media(max-width:950px){.layout{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.editor{grid-template-columns:1fr}.actions button,.checks button{width:100%}}`}</style>
    </div>
  );
}
