import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";

// ✅ NEW IMPORT (centralized images)
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
          images:
            productImages[product.id] || [product.thumbnail_url],
          thumbnail_url:
            (productImages[product.id] &&
              productImages[product.id][0]) ||
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
    <div className="container">
      <Navbar />

      <div className="banner">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/images/banner-mobile.png"
          />
          <img src="/images/banner.png" alt="Local Jagoff Banner" />
        </picture>
      </div>

      <section>
        <h2>T-Shirts</h2>
        <div className="grid">
          {tees.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h2>Hoodies</h2>
        <div className="grid">
          {hoodies.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h2>Hats</h2>
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
        .container {
          background: #000;
          color: #fff;
          min-height: 100vh;
        }

        .banner img {
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        section {
          padding: 40px 20px;
        }

        h2 {
          margin-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
        }

        .footer {
          margin-top: 50px;
          padding: 30px;
          border-top: 1px solid #222;
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 10px;
        }

        .footer-links a {
          color: #ccc;
          text-decoration: none;
        }

        .footer-links a:hover {
          color: #fff;
        }
      `}</style>
    </div>
  );
}
