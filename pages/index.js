import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { getProductImages, getProductThumbnail } from "../lib/getProductImages";
import { sortProducts } from "../lib/productSort";

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

      {tees.length > 0 && (
        <section className="section-wrap">
          <div className="section-head">
            <div>
              <p className="section-kicker">NO BORING SHIRTS</p>
              <h2>T-Shirts</h2>
            </div>
          </div>
          <div className="grid">
            {tees.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {hoodies.length > 0 && (
        <section className="section-wrap">
          <div className="section-head">
            <div>
              <p className="section-kicker">COLD WEATHER, STILL A JAGOFF</p>
              <h2>Hoodies</h2>
            </div>
          </div>
          <div className="grid">
            {hoodies.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {hats.length > 0 && (
        <section className="section-wrap">
          <div className="section-head">
            <div>
              <p className="section-kicker">PUT SOMETHIN ON YOUR HEAD</p>
              <h2>Hats</h2>
            </div>
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
            <div>
              <p className="section-kicker">RANDOM JAGOFFERY</p>
              <h2>Other Gear</h2>
            </div>
          </div>
          <div className="grid">
            {other.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
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
          background: #000;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
