import { useEffect, useState } from "react";

function actionLabelFromText(text, element) {
  const label = String(text || "").replace(/\s+/g, " ").trim();
  const lower = label.toLowerCase();

  if (!label) return "Action received";
  if (element?.tagName === "A") return `Opening ${label}`;
  if (lower.includes("copy")) return "Copied";
  if (lower.includes("save + use")) return "Saved and selected";
  if (lower.includes("save")) return "Saved";
  if (lower.includes("generate") || lower.includes("regenerate")) return "Generating";
  if (lower.includes("remix")) return "Remixing";
  if (lower.includes("edit")) return "Editing";
  if (lower.includes("cancel") || lower.includes("close")) return "Closed";
  if (lower.includes("facebook")) return "Facebook selected";
  if (lower.includes("instagram")) return "Instagram selected";
  if (lower.includes("clear")) return "Cleared";
  if (lower.includes("unlock")) return "Unlocked";
  if (lower.includes("lock")) return "Locked";
  if (lower.includes("open")) return `Opening ${label.replace(/^open\s+/i, "")}`;

  return `${label} clicked`;
}

export default function PromoAdminNav() {
  const [toast, setToast] = useState("");

  const showToast = (text) => {
    const message = String(text || "Action received").trim();
    setToast(message);
    if (typeof window !== "undefined") {
      window.clearTimeout(window.__localJagoffActionTimer);
      window.__localJagoffActionTimer = window.setTimeout(() => setToast(""), 1350);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) return undefined;

    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);

    if (navigator.clipboard.__localJagoffCopyPatched) {
      const onCopied = () => showToast("Copied");
      window.addEventListener("local-jagoff-copied", onCopied);
      return () => window.removeEventListener("local-jagoff-copied", onCopied);
    }

    navigator.clipboard.writeText = async (...args) => {
      const result = await originalWriteText(...args);
      window.dispatchEvent(new Event("local-jagoff-copied"));
      return result;
    };

    navigator.clipboard.__localJagoffCopyPatched = true;

    const onCopied = () => showToast("Copied");
    window.addEventListener("local-jagoff-copied", onCopied);
    return () => window.removeEventListener("local-jagoff-copied", onCopied);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const showClickFeedback = (event) => {
      const target = event.target?.closest?.("button,a");
      if (!target) return;
      if (target.closest(".copyToast")) return;
      if (target.disabled || target.getAttribute("aria-disabled") === "true") return;
      if (!target.closest(".promoAdminNav") && !target.closest(".promoPage") && !target.closest("main")) return;

      const text = target.getAttribute("aria-label") || target.textContent || "Action received";
      showToast(actionLabelFromText(text, target));
    };

    document.addEventListener("click", showClickFeedback, true);
    return () => document.removeEventListener("click", showClickFeedback, true);
  }, []);

  return (
    <>
      <div className="promoAdminNavSpacer" aria-hidden="true" />
      <nav className="promoAdminNav" aria-label="Promo admin navigation">
        <a href="/admin/promo-generator">Promo Studio</a>
        <a href="/admin/holiday-promo-generator">Holiday Shortcut</a>
      </nav>
      <div className={`copyToast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast || "Action received"}
      </div>

      <style jsx global>{`.promoAdminNavSpacer{height:58px}.promoAdminNav{position:fixed;top:0;left:0;right:0;z-index:5000;display:flex;gap:10px;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,.9);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,230,0,.18)}.promoAdminNav a{color:#fff;background:#151515;border:1px solid #333;border-radius:999px;padding:9px 12px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;white-space:nowrap}.promoAdminNav a:hover{color:#000;background:#ffe600;border-color:#ffe600}.copyToast{position:fixed;right:18px;bottom:18px;z-index:6000;opacity:0;transform:translateY(10px);pointer-events:none;background:#ffe600;color:#000;border-radius:999px;padding:12px 16px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;box-shadow:0 16px 50px rgba(0,0,0,.45);transition:opacity .18s ease,transform .18s ease}.copyToast.show{opacity:1;transform:translateY(0)}.promoPage button,.promoAdminNav a{transition:transform .12s ease,box-shadow .12s ease,filter .12s ease}.promoPage button:active,.promoAdminNav a:active{transform:translateY(1px) scale(.985);filter:brightness(1.15);box-shadow:0 0 0 3px rgba(255,230,0,.18)}@media(max-width:640px){.promoAdminNavSpacer{height:98px}.promoAdminNav{display:grid;grid-template-columns:1fr;padding:10px 12px}.promoAdminNav a{text-align:center}.copyToast{left:50%;right:auto;transform:translate(-50%,10px)}.copyToast.show{transform:translate(-50%,0)}}`}</style>
    </>
  );
}
