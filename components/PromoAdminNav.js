import { useEffect, useState } from "react";

export default function PromoAdminNav() {
  const [copied, setCopied] = useState(false);

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

  const primaryLinks = [
    ["/admin/promo-hub", "Hub"],
    ["/admin/promo-generator", "Generator"],
    ["/admin/promo-week-builder", "Week Builder"],
    ["/admin/promo-posting-board", "Posting Board"],
    ["/admin/promo-queue", "Queue"],
  ];

  const moreLinks = [
    ["/admin/promo-performance", "Performance"],
    ["/admin/promo-insights", "Insights"],
    ["/admin/promo-calendar", "Calendar"],
    ["/admin/promo-library", "Library"],
    ["/admin/promo-product-bank", "Product Bank"],
    ["/admin/promo-bank-repair", "Bank Repair"],
    ["/admin/promo-health", "Health"],
    ["/admin/promo-backup", "Backup"],
  ];

  return (
    <>
      <nav className="promoAdminNav" aria-label="Promo admin navigation">
        <div className="navPrimary">
          {primaryLinks.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>

        <details className="navMore">
          <summary>More</summary>
          <div className="morePanel">
            {moreLinks.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </div>
        </details>
      </nav>
      <div className={`copyToast ${copied ? "show" : ""}`} role="status" aria-live="polite">Copied</div>

      <style jsx>{`.promoAdminNav{position:sticky;top:0;z-index:1000;display:flex;gap:10px;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,.86);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,230,0,.18)}.navPrimary{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.promoAdminNav a,.navMore summary{color:#fff;background:#151515;border:1px solid #333;border-radius:999px;padding:9px 12px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;list-style:none;white-space:nowrap}.navMore summary::-webkit-details-marker{display:none}.promoAdminNav a:hover,.navMore summary:hover,.navMore[open] summary{color:#000;background:#ffe600;border-color:#ffe600}.navMore{position:relative}.morePanel{position:absolute;right:0;top:calc(100% + 8px);display:grid;grid-template-columns:1fr;gap:7px;min-width:190px;padding:10px;background:rgba(0,0,0,.94);border:1px solid rgba(255,230,0,.22);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55)}.morePanel a{display:block;text-align:left;border-radius:12px}.copyToast{position:fixed;right:18px;bottom:18px;z-index:2000;opacity:0;transform:translateY(10px);pointer-events:none;background:#ffe600;color:#000;border-radius:999px;padding:12px 16px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;box-shadow:0 16px 50px rgba(0,0,0,.45);transition:opacity .18s ease,transform .18s ease}.copyToast.show{opacity:1;transform:translateY(0)}@media(max-width:820px){.promoAdminNav{position:relative;display:grid;grid-template-columns:1fr;align-items:stretch}.navPrimary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.promoAdminNav a,.navMore summary{text-align:center}.navMore{display:block}.navMore summary{display:block}.morePanel{position:static;margin-top:8px;grid-template-columns:repeat(2,minmax(0,1fr));min-width:0}.copyToast{left:50%;right:auto;transform:translate(-50%,10px)}.copyToast.show{transform:translate(-50%,0)}}@media(max-width:480px){.navPrimary,.morePanel{grid-template-columns:1fr}}`}</style>
    </>
  );
}
