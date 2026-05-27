import { useEffect } from "react";
import Head from "next/head";

export default function PromoBuilderRedirect() {
  useEffect(() => {
    window.location.replace("/admin/promo-generator?mode=builder");
  }, []);

  return (
    <div className="redirectPage">
      <Head>
        <title>Redirecting to Promo Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main>
        <p>Redirecting to Promo Studio...</p>
        <a href="/admin/promo-generator?mode=builder">Open Promo Studio</a>
      </main>
      <style jsx>{`
        .redirectPage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          color: #fff;
          background: linear-gradient(180deg, #050505, #000);
        }

        main {
          width: min(420px, 100%);
          border: 1px solid rgba(255, 230, 0, 0.25);
          border-radius: 24px;
          padding: 26px;
          background: rgba(13, 13, 13, 0.94);
          text-align: center;
        }

        p {
          margin: 0 0 14px;
          color: #ffe600;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          padding: 12px 16px;
          background: #ffe600;
          color: #000;
          font-weight: 900;
          text-decoration: none;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
