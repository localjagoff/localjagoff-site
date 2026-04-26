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
          <source
            media="(max-width: 768px)"
            srcSet="/images/banner-mobile.jpg"
          />
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
            <p className="mobile-scroll-hint">Swipe →</p>
          </div>

          <div className="featured-scroll">
            <div className="featured-grid">
              {featured.map((p) => (
                <div key={p.id} className="featured-card-wrap">
                  <span className="featured-badge">FEATURED</span>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.08), transparent 28%),
            radial-gradient(circle at right 20%, rgba(255, 255, 255, 0.04), transparent 22%),
            linear-gradient(180deg, rgba(255, 230, 0, 0.03), transparent 18%),
            #000;
          color: #fff;
          position: relative;
        }

        .banner-shell,
        .featured-wrap,
        .section-wrap,
        .footer {
          position: relative;
          z-index: 1;
        }

        .banner-shell {
          width: 100%;
          margin: 0;
          padding: 0;
          background: #000;
          overflow: hidden;
        }

        .banner-shell img {
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
          object-position: center;
          display: block;
          margin: 0 auto;
        }

        .featured-wrap {
          padding: 38px 20px 12px;
          overflow: hidden;
        }

        .section-wrap {
          padding: 34px 20px 10px;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 18px;
        }

        .section-kicker {
          margin: 0 0 6px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h2 {
          margin: 0;
          font-size: 28px;
        }

        .mobile-scroll-hint {
          display: none;
          margin: 0;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }

        .featured-scroll {
          position: relative;
        }

        .featured-scroll::after {
          display: none;
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 42px;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, #000);
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .featured-card-wrap {
          position: relative;
          min-width: 0;
        }

        .featured-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255, 230, 0, 0.5);
          border-radius: 999px;
          padding: 6px 9px;
          background:
            linear-gradient(180deg, rgba(255, 242, 122, 0.96), rgba(255, 230, 0, 0.96));
          color: #000;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.8px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
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

        @media (max-width: 900px) {
          .featured-grid {
            grid-template-columns: repeat(3, minmax(210px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .banner-shell img {
            max-height: none;
            object-fit: contain;
          }

          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .featured-wrap {
            padding: 28px 0 8px 14px;
          }

          .featured-wrap .section-head {
            padding-right: 14px;
          }

          .mobile-scroll-hint {
            display: block;
          }

          .featured-scroll {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 14px 8px 0;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }

          .featured-scroll::after {
            display: block;
          }

          .featured-grid {
            display: flex;
            gap: 14px;
            width: max-content;
            min-width: 100%;
          }

          .featured-card-wrap {
            width: 72vw;
            max-width: 260px;
            min-width: 220px;
            flex: 0 0 auto;
            scroll-snap-align: start;
          }

          .featured-badge {
            top: 9px;
            left: 9px;
            font-size: 9px;
            padding: 5px 8px;
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
