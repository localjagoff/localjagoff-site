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

  const tees = products.filter((p) => p.category === "tees").slice(0, 4);
  const hoodies = products.filter((p) => p.category === "hoodies").slice(0, 4);
  const hats = products.filter((p) => p.category === "hats").slice(0, 4);

  const renderSection = (title, kicker, items, href) => (
    <section className="section-wrap">
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
        <div className="product-grid">
          {items.map((p) => (
            <div className="product-slot" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-box">No {title.toLowerCase()} loaded yet.</div>
      )}
    </section>
  );

  return (
    <div className="page-shell">
      <Navbar />

      <div className="banner-shell">
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/banner-mobile.png" />
          <img src="/images/banner.png" alt="Local Jagoff Banner" />
        </picture>
      </div>

      {loading ? (
        <div className="loading-box">Loading the jagoff goods...</div>
      ) : (
        <>
          {renderSection("T-Shirts", "REP THE 412", tees, "/tees")}
          {renderSection("Hoodies", "HEAVY HITTERS", hoodies, "/hoodies")}
          {renderSection("Hats", "TOP IT OFF", hats, "/hats")}
        </>
      )}

      <section className="trust-bar">
        <div>🔒 Secure checkout</div>
        <div>📦 Made to order</div>
        <div>🖤 Pittsburgh attitude, shipped to your door</div>
      </section>

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
        }

        .banner-shell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px 16px 4px;
        }

        .banner-shell img {
          width: 100%;
          max-height: 430px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
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
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 20px 8px;
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
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
          font-size: 30px;
        }

        .view-all {
          color: #ffe600;
          border: 1px solid rgba(255, 230, 0, 0.35);
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 13px;
          background: rgba(0, 0, 0, 0.35);
          white-space: nowrap;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 240px));
          gap: 18px;
          justify-content: start;
          align-items: start;
        }

        .product-slot {
          width: 100%;
          max-width: 240px;
          min-width: 0;
        }

        .product-slot :global(a) {
          display: block;
          width: 100%;
        }

        .product-slot :global(img) {
          max-width: 100%;
        }

        .empty-box {
          border: 1px dashed #333;
          background: rgba(17, 17, 17, 0.7);
          border-radius: 16px;
          padding: 18px;
          color: #aaa;
        }

        .trust-bar {
          max-width: 1100px;
          margin: 38px auto 0;
          padding: 18px 20px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          border: 1px solid #222;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.05), transparent),
            #0f0f0f;
          color: #ddd;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
        }

        .footer {
          margin-top: 36px;
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
        }

        .footer-links :global(a:hover) {
          color: #fff;
        }

        @media (max-width: 768px) {
          .banner-shell {
            padding: 12px 10px 4px;
          }

          .banner-shell img {
            max-height: 360px;
          }

          .section-wrap {
            padding: 24px 14px 8px;
          }

          .section-head {
            align-items: center;
          }

          h2 {
            font-size: 25px;
          }

          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .product-slot {
            max-width: none;
          }

          .trust-bar {
            margin: 32px 14px 0;
            grid-template-columns: 1fr;
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
