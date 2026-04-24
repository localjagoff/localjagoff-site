import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";
import productImages from "../lib/productImages";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setProducts([]);
          return;
        }

        const mapped = data.map((product) => ({
          ...product,
          images: productImages[product.id] || [product.thumbnail_url],
          thumbnail_url:
            (productImages[product.id] && productImages[product.id][0]) ||
            product.thumbnail_url,
        }));

        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const tees = products.filter((p) => p.category === "tees");
  const hoodies = products.filter((p) => p.category === "hoodies");
  const hats = products.filter((p) => p.category === "hats");

  const renderSection = (title, kicker, items, href) => (
    <section className="section-wrap" id={title.toLowerCase()}>
      <div className="section-head">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>

        <Link href={href} className="view-all">
          VIEW ALL
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-box">
          <p>No {title.toLowerCase()} loaded yet.</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="page-shell">
      <Navbar />

      <div className="hero-wrap">
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/banner-mobile.png" />
          <img src="/images/banner.png" alt="Local Jagoff Banner" />
        </picture>

        <div className="hero-actions">
          <a href="#t-shirts" className="hero-btn">
            SHOP THE 412
          </a>
        </div>
      </div>

      {loading ? (
        <div className="loading-box">
          <p>Loading the jagoff goods...</p>
        </div>
      ) : (
        <>
          {renderSection("T-Shirts", "REP THE 412", tees, "/tees")}
          {renderSection("Hoodies", "HEAVY HITTERS", hoodies, "/hoodies")}
          {renderSection("Hats", "TOP IT OFF", hats, "/hats")}
        </>
      )}

      <footer className="footer">
        <div className="footer-links">
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} Local Jagoff</p>
      </footer>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.08), transparent 28%),
            radial-gradient(circle at right 20%, rgba(255, 255, 255, 0.04), transparent 22%),
            linear-gradient(180deg, rgba(255, 230, 0, 0.03), transparent 18%),
            #000;
          color: #fff;
          position: relative;
        }

        .page-shell::before,
        .page-shell::after {
          content: "";
          position: fixed;
          top: 0;
          bottom: 0;
          width: 110px;
          pointer-events: none;
          opacity: 0.2;
          z-index: 0;
        }

        .page-shell::before {
          left: 0;
          background:
            linear-gradient(90deg, rgba(255, 230, 0, 0.08), transparent),
            repeating-linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.05) 0,
              rgba(255, 255, 255, 0.05) 2px,
              transparent 2px,
              transparent 16px
            );
          mask-image: linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent);
        }

        .page-shell::after {
          right: 0;
          background:
            linear-gradient(270deg, rgba(255, 230, 0, 0.08), transparent),
            repeating-linear-gradient(
              45deg,
              rgba(255, 255, 255, 0.05) 0,
              rgba(255, 255, 255, 0.05) 2px,
              transparent 2px,
              transparent 16px
            );
          mask-image: linear-gradient(180deg, transparent, #000 18%, #000 82%, transparent);
        }

        .hero-wrap,
        .section-wrap,
        .footer,
        .loading-box {
          position: relative;
          z-index: 1;
        }

        .hero-wrap {
          max-width: 1300px;
          margin: 0 auto;
          padding: 18px 18px 10px;
          text-align: center;
        }

        .hero-wrap img {
          width: 100%;
          max-height: 540px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          border-radius: 18px;
        }

        .hero-actions {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .hero-btn {
          display: inline-block;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          padding: 14px 30px;
          border-radius: 14px;
          font-weight: 900;
          letter-spacing: 1px;
          box-shadow: 0 10px 24px rgba(255, 230, 0, 0.16);
        }

        .loading-box {
          max-width: 1100px;
          margin: 24px auto;
          padding: 24px 20px;
          border: 1px solid #222;
          border-radius: 18px;
          background: rgba(17, 17, 17, 0.9);
          color: #ccc;
          text-align: center;
        }

        .section-wrap {
          max-width: 1300px;
          margin: 0 auto;
          padding: 36px 20px 10px;
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .section-kicker {
          margin: 0 0 6px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        h2 {
          margin: 0;
          font-size: 32px;
        }

        .view-all {
          color: #ffe600;
          border: 1px solid rgba(255, 230, 0, 0.35);
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
          background: rgba(0, 0, 0, 0.35);
        }

        .view-all:hover {
          border-color: #ffe600;
          background: rgba(255, 230, 0, 0.08);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        .empty-box {
          border: 1px dashed #333;
          background: rgba(17, 17, 17, 0.7);
          border-radius: 16px;
          padding: 18px;
          color: #aaa;
        }

        .footer {
          margin-top: 50px;
          padding: 30px 20px 40px;
          border-top: 1px solid #222;
          text-align: center;
          background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.02));
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .footer-links :global(a) {
          color: #ccc;
          text-decoration: none;
        }

        .footer-links :global(a:hover) {
          color: #fff;
        }

        @media (max-width: 768px) {
          .page-shell::before,
          .page-shell::after {
            width: 48px;
            opacity: 0.12;
          }

          .hero-wrap {
            padding: 12px 10px 6px;
          }

          .hero-wrap img {
            border-radius: 12px;
          }

          .hero-btn {
            width: calc(100% - 20px);
            text-align: center;
          }

          .section-wrap {
            padding: 28px 14px 8px;
          }

          .section-head {
            align-items: center;
          }

          h2 {
            font-size: 26px;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .view-all {
            padding: 9px 11px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
