import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import productImages from "../lib/productImages";

export default function HatsPage() {
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

  const hats = products.filter((p) => p.category === "hats");

  return (
    <div className="category-page">
      <Navbar />

      <div className="category-wrap">
        <Link href="/" className="back-link">
          ← Back
        </Link>
        <h1>Hats</h1>

        <div className="grid">
          {hats.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
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
