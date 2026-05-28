import { useEffect } from "react";
import Head from "next/head";

export default function PromoLibraryRedirect() {
  useEffect(() => {
    window.location.replace("/admin/promo-queue");
  }, []);

  return (
    <div className="redirectPage">
      <Head>
        <title>Redirecting to Promo Queue</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main>
        <p>Promo Library has been removed. Saved-promo searching is no longer part of the workflow.</p>
        <a href="/admin/promo-queue">Open Promo Queue</a>
      </main>
      <style jsx>{`
        .redirectPage{min-height:100vh;display:grid;place-items:center;padding:20px;color:#fff;background:linear-gradient(180deg,#050505,#000)}
        main{width:min(520px,100%);border:1px solid rgba(255,230,0,.25);border-radius:24px;padding:26px;background:rgba(13,13,13,.94);text-align:center}
        p{margin:0 0 14px;color:#ffe600;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;line-height:1.35}
        a{display:inline-flex;align-items:center;justify-content:center;border-radius:14px;padding:12px 16px;background:#ffe600;color:#000;font-weight:900;text-decoration:none;text-transform:uppercase}
      `}</style>
    </div>
  );
}
