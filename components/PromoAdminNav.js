import { useEffect, useRef, useState } from "react";

export default function PromoAdminNav() {
  const [copied, setCopied] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) return undefined;

    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);

    if (navigator.clipboard.__localJagoffCopyPatched) {
      const onCopied = () => {
        setCopied(true);
        window.clearTimeout(window.__localJagoffCopiedTimer);
        window.__localJagoffCopiedTimer = window.setTimeout(() => setCopied(false), 1400);
      };

      window.addEventListener("local-jagoff-copied", onCopied);
      return () => window.removeEventListener("local-jagoff-copied", onCopied);
    }

    navigator.clipboard.writeText = async (...args) => {
      const result = await originalWriteText(...args);
      window.dispatchEvent(new Event("local-jagoff-copied"));
      return result;
    };

    navigator.clipboard.__localJagoffCopyPatched = true;

    const onCopied = () => {
      setCopied(true);
      window.clearTimeout(window.__localJagoffCopiedTimer);
      window.__localJagoffCopiedTimer = window.setTimeout(() => setCopied(false), 1400);
    };

    window.addEventListener("local-jagoff-copied", onCopied);
    return () => window.removeEventListener("local-jagoff-copied", onCopied);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const closeMore = (event) => {
      const node = moreRef.current;
      if (!node || !node.open || node.contains(event.target)) return;
      node.open = false;
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape" && moreRef.current?.open) moreRef.current.open = false;
    };

    document.addEventListener("pointerdown", closeMore);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMore);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const primaryLinks = [
    ["/admin/promo-hub", "Hub"],
    ["/admin/promo-generator", "Promo Studio"],
    ["/admin/promo-posting-board", "Posting Board"],
    ["/admin/promo-performance", "Performance"],
  ];

  const moreLinks = [
    ["/admin/promo-launch-checklist", "Checklist"],
    ["/admin/promo-queue", "Queue"],
    ["/admin/promo-calendar", "Calendar"],
    ["/admin/promo-product-bank", "Promo Parts"],
    ["/admin/promo-campaign-presets", "Presets"],
    ["/admin/promo-library", "Library"],
    ["/admin/promo-bank-repair", "Parts Repair"],
    ["/admin/promo-health", "Health"],
    ["/admin/promo-backup", "Backup"],
  ];

  return (
    <>
      <div className="promoAdminNavSpacer" aria-hidden="true" />
      <nav className="promoAdminNav" aria-label="Promo admin navigation">
        <div className="navPrimary">
          {primaryLinks.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>

        <details className="navMore" ref={moreRef}>
          <summary>More</summary>
          <div className="morePanel">
            {moreLinks.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </div>
        </details>
      </nav>
      <div className={`copyToast ${copied ? "show" : ""}`} role="status" aria-live="polite">Copied</div>

      <style jsx>{`.promoAdminNavSpacer{height:58px}.promoAdminNav{position:fixed;top:0;left:0;right:0;z-index:5000;display:flex;gap:10px;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,.9);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,230,0,.18)}.navPrimary{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.promoAdminNav a,.navMore summary{color:#fff;background:#151515;border:1px solid #333;border-radius:999px;padding:9px 12px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;list-style:none;white-space:nowrap}.navMore summary::-webkit-details-marker{display:none}.promoAdminNav a:hover,.navMore summary:hover,.navMore[open] summary{color:#000;background:#ffe600;border-color:#ffe600}.navMore{position:relative}.morePanel{position:absolute;right:0;top:calc(100% + 8px);display:grid;grid-template-columns:1fr;gap:7px;min-width:190px;padding:10px;background:rgba(0,0,0,.94);border:1px solid rgba(255,230,0,.22);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55)}.morePanel a{display:block;text-align:left;border-radius:12px}.copyToast{position:fixed;right:18px;bottom:18px;z-index:6000;opacity:0;transform:translateY(10px);pointer-events:none;background:#ffe600;color:#000;border-radius:999px;padding:12px 16px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;box-shadow:0 16px 50px rgba(0,0,0,.45);transition:opacity .18s ease,transform .18s ease}.copyToast.show{opacity:1;transform:translateY(0)}@media(max-width:820px){.promoAdminNavSpacer{height:108px}.promoAdminNav{display:grid;grid-template-columns:1fr;align-items:stretch}.navPrimary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.promoAdminNav a,.navMore summary{text-align:center}.navMore{display:block}.navMore summary{display:block}.morePanel{position:absolute;left:0;right:0;top:calc(100% + 8px);grid-template-columns:repeat(2,minmax(0,1fr));min-width:0}.copyToast{left:50%;right:auto;transform:translate(-50%,10px)}.copyToast.show{transform:translate(-50%,0)}}@media(max-width:480px){.promoAdminNavSpacer{height:194px}.navPrimary,.morePanel{grid-template-columns:1fr}}`}</style>
    </>
  );
}
