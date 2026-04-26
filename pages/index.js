import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { getProductImages, getProductThumbnail } from "../lib/getProductImages";
import { sortProducts } from "../lib/productSort";
import { getFeaturedProducts } from "../lib/featuredProducts";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;

        const mapped = data.map((product) => ({
          ...product,
          images: getProductImages(product),
          thumbnail_url: getProductThumbnail(product),
        }));

        setProducts(mapped);
      })
      .catch(() => setProducts([]));
  }, []);

  const featured = getFeaturedProducts(products);
  const tees = sortProducts(products.filter((p) => p.category === "tees"));
  const hoodies = sortProducts(products.filter((p) => p.category === "hoodies"));
  const hats = sortProducts(products.filter((p) => p.category === "hats"));
  const other = sortProducts(products.filter((p) => p.category === "other"));

  return (
    <div className="page-shell">
      <Navbar />

      <div className="banner-shell">
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/banner-mobile.jpg" />
          <img src="/images/banner.jpg" alt="Local Jagoff Banner" />
        </picture>
      </div>

      {featured.length > 0 && (
        <section className="featured-wrap">
          <div className="section-head">
            <div>
              <p className="section-kicker">STUFF WORTH CLICKING</p>
              <h2>Featured Picks</h2>
            </div>
          </div>

          <div className="featured-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* QUICK LINKS */}
      <div className="quick-links">
        <a href="#tees">TEES</a>
        <a href="#hoodies">HOODIES</a>
        <a href="#hats">HATS</a>
      </div>

      {tees.length > 0 && (
        <section id="tees" className="section-wrap">
          <div className="section-head">
            <h2>T-Shirts</h2>
          </div>
          <div className="grid">
            {tees.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {hoodies.length > 0 && (
        <section id="hoodies" className="section-wrap">
          <div className="section-head">
            <h2>Hoodies</h2>
          </div>
          <div className="grid">
            {hoodies.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {hats.length > 0 && (
        <section id="hats" className="section-wrap">
          <div className="section-head">
            <h2>Hats</h2>
          </div>
          <div className="grid">
            {hats.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section className="section-wrap">
          <div className="section-head">
            <h2>Other Gear</h2>
          </div>
          <div className="grid">
            {other.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .page-shell {
          background: #000;
          color: #fff;
        }

        .banner-shell img {
          width: 100%;
        }

        .featured-wrap {
          padding: 30px 20px;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .quick-links {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 10px 0 20px;
        }

        .quick-links a {
          padding: 8px 14px;
          border: 1px solid #333;
          border-radius: 999px;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .quick-links a:hover {
          background: #ffe600;
          color: #000;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .featured-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
