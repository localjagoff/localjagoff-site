import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";
import productImages from "../lib/productImages";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;

        const mapped = data.map((product) => ({
          ...product,
          images: productImages[product.id] || [product.thumbnail_url],
          thumbnail_url:
            (productImages[product.id] && productImages[product.id][0]) ||
            product.thumbnail_url,
        }));

        setProducts(mapped);
      })
      .catch(() => setProducts([]));
  }, []);

  const tees = products.filter((p) => p.category === "tees");
  const hoodies = products.filter((p) => p.category === "hoodies");
  const hats = products.filter((p) => p.category === "hats");

  return (
    <div className="page-shell">
      <Navbar />

      <div className="banner-shell">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/images/banner-mobile.png"
          />
          <img src="/images/banner.png" alt="Local Jagoff Banner" />
        </picture>
      </div>

      <section className="section-wrap">
        <div className="section-head">
          <h2>T-Shirts</h2>
        </div>
        <div className="grid">
          {tees.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-head">
          <h2>Hoodies</h2>
        </div>
        <div className="grid">
          {hoodies.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-head">
          <h2>Hats</h2>
        </div>
        <div className="grid">
          {hats.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
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

        .banner-shell img {
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        .section-wrap {
          padding: 34px 20px 10px;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        h2 {
          margin: 0;
          font-size: 28px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
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
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .section-wrap {
            padding: 24px 14px 8px;
          }

          h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
