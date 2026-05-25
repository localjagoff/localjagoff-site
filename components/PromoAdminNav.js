export default function PromoAdminNav() {
  const links = [
    ["/admin/promo-hub", "Hub"],
    ["/admin/promo-generator", "Generator"],
    ["/admin/promo-queue", "Queue"],
    ["/admin/promo-calendar", "Calendar"],
    ["/admin/promo-library", "Library"],
    ["/admin/promo-backup", "Backup"],
  ];

  return (
    <nav className="promoAdminNav" aria-label="Promo admin navigation">
      {links.map(([href, label]) => (
        <a key={href} href={href}>{label}</a>
      ))}

      <style jsx>{`.promoAdminNav{position:sticky;top:0;z-index:1000;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:10px;background:rgba(0,0,0,.84);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,230,0,.18)}.promoAdminNav a{color:#fff;background:#151515;border:1px solid #333;border-radius:999px;padding:9px 12px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}.promoAdminNav a:hover{color:#000;background:#ffe600;border-color:#ffe600}@media(max-width:700px){.promoAdminNav{position:relative}.promoAdminNav a{flex:1;text-align:center}}`}</style>
    </nav>
  );
}
