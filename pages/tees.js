import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import productImages from "../lib/productImages";

export default function TeesPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data.map((product) => ({
              ...product,
              images: productImages[product.id] || [product.thumbnail_url],
              thumbnail_url:
                (productImages[product.id] && productImages[product.id][0]) ||
                product.thumbnail_url,
            }))
          : [];

        setProducts(mapped);
      });
  }, []);

  const products724 = products.filter((p) => p.category === "724");
  const tees = products.filter((p) => p.category === "tees");

  return (
    <div className="category-page">
      <Navbar />

      <div className="category-wrap">
        <Link href="/" className="back-link">
          ← Back
        </Link>
        {tees.length > 0 && (
          <section className="category-section">
            <p className="section-kicker">NO BORING SHIRTS</p>
            <h1>T-Shirts</h1>

            <div className="grid">
              {tees.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {products724.length > 0 && (
          <section className="category-section">
            <p className="section-kicker">SAME ATTITUDE, DIFFERENT AREA CODE</p>
            <h1>For the 724, Jagoffs</h1>

            <div className="grid">
              {products724.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .category-page {
          min-height: 100vh;
          color: #fff;
          background: transparent;
        }

        .category-wrap {
          padding: 24px 20px 40px;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 14px;
          color: #ccc;
        }

        .category-section {
          margin-bottom: 36px;
        }

        .category-section:last-of-type {
          margin-bottom: 0;
        }

        .section-kicker {
          margin: 0 0 6px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h1 {
          margin: 0 0 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .category-wrap {
            padding: 18px 14px 26px;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
        }
      `}</style>
    </div>
  );
}
