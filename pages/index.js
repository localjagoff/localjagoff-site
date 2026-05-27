import Head from "next/head";
import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { getProductImages, getProductThumbnail } from "../lib/getProductImages";
import { sortProducts } from "../lib/productSort";
import { getFeaturedProducts } from "../lib/featuredProducts";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = SITE_URL;
const PAGE_TITLE = "Local Jagoff | Pittsburgh Shirts, Hoodies & Gear";
const PAGE_DESCRIPTION =
  "Shop Local Jagoff for Pittsburgh shirts, hoodies, hats, 412 gear, 724 gear, and black-and-gold Western PA streetwear built for jagoffs, yinzers, and locals who get it.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

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
  const products724 = sortProducts(products.filter((p) => p.category === "724"));
  const tees = sortProducts(products.filter((p) => p.category === "tees"));
  const hoodies = sortProducts(products.filter((p) => p.category === "hoodies"));
  const hats = sortProducts(products.filter((p) => p.category === "hats"));
  const other = sortProducts(products.filter((p) => p.category === "other"));

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Local Jagoff",
    url: SITE_URL,
    description: PAGE_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: "Local Jagoff",
      url: SITE_URL,
      logo: `${SITE_URL}/images/social-share.jpg`,
    },
  };

  return (
    <div className="page-shell">
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} key="description" />
        <link rel="canonical" href={PAGE_URL} key="canonical" />

        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta property="og:description" content={PAGE_DESCRIPTION} key="og:description" />
        <meta property="og:url" content={PAGE_URL} key="og:url" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />
        <meta property="og:image" content={SHARE_IMAGE} key="og:image" />
        <meta property="og:image:secure_url" content={SHARE_IMAGE} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content="Local Jagoff Pittsburgh shirts, hoodies, hats, and gear" key="og:image:alt" />

        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={SHARE_IMAGE} key="twitter:image" />
        <meta name="twitter:image:alt" content="Local Jagoff Pittsburgh shirts, hoodies, hats, and gear" key="twitter:image:alt" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c"),
          }}
          key="home-jsonld"
        />
      </Head>

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

      <section className="seo-intro" aria-label="About Local Jagoff">
        <p className="seo-kicker">PITTSBURGH CLOTHING WITH YINZER ATTITUDE</p>
        <h1>Local Jagoff Pittsburgh Shirts, Hoodies & Gear</h1>
        <p>
          Local Jagoff is a Pittsburgh clothing brand built for jagoffs, yinzers,
          and Western PA locals who rep black and gold attitude. Shop Pittsburgh
          jagoff shirts, hoodies, hats, 412 gear, 724 gear, and everyday streetwear
          made for the people who get it.
        </p>
      </section>

      {featured.length > 0 && (
        <section className="featured-wrap">
          <div className="section-head">
            <div>
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

      <nav className="quick-links" aria-label="Product categories">
        {tees.length > 0 && <a href="#tees">TEES</a>}
        {hoodies.length > 0 && <a href="#hoodies">HOODIES</a>}
        {hats.length > 0 && <a href="#hats">HATS</a>}
        {products724.length > 0 && <a href="#seven-two-four">724</a>}
      </nav>

      {tees.length > 0 && (
        <section id="tees" className="section-wrap">
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
        <section id="hoodies" className="section-wrap">
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
        <section id="hats" className="section-wrap">
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

      {products724.length > 0 && (
        <section id="seven-two-four" className="section-wrap">
          <div className="section-head">
            <div>
              <p className="section-kicker">SAME ATTITUDE, DIFFERENT AREA CODE</p>
              <h2>For the 724, Jagoffs</h2>
            </div>
          </div>
          <div className="grid">
            {products724.map((p) => (
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
        html {
          scroll-behavior: smooth;
        }

        .page-shell {
          min-height: 100vh;
          background: transparent;
          color: #fff;
          position: relative;
        }

        .banner-shell,
        .featured-wrap,
        .quick-links,
        .section-wrap,
        .footer {
          position: relative;
          z-index: 1;
        }

        .banner-shell {
          position: relative;
          width: 100%;
          margin: 0;
          padding: 0;
          background: transparent;
          overflow: hidden;
        }

        .banner-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: transparent;
        }

        .banner-shell::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 92px;
          z-index: 2;
          pointer-events: none;
          background: transparent;
        }

        .banner-shell picture {
          position: relative;
          z-index: 1;
          display: block;
        }

        .banner-shell img {
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
          object-position: center;
          display: block;
          margin: 0 auto;
          filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.48));
        }

        .seo-intro {
          position: relative;
          z-index: 1;
          max-width: 980px;
          margin: 24px auto 4px;
          padding: 22px 20px 8px;
          text-align: center;
        }

        .seo-kicker {
          margin: 0 0 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .seo-intro h1 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 34px;
          line-height: 1.08;
          font-weight: 950;
        }

        .seo-intro p {
          max-width: 780px;
          margin: 0 auto;
          color: #d8d8d8;
          font-size: 15px;
          line-height: 1.65;
        }

        .featured-wrap {
          padding: 38px 20px 12px;
          overflow: hidden;
        }

        .section-wrap {
          padding: 34px 20px 10px;
          scroll-margin-top: 86px;
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

        .quick-links {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 18px 20px 4px;
          flex-wrap: wrap;
        }

        .quick-links a {
          padding: 9px 16px;
          border: 1px solid #333;
          border-radius: 999px;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.9px;
          background: rgba(255, 255, 255, 0.025);
        }

        .quick-links a:hover {
          background: #ffe600;
          border-color: #ffe600;
          color: #000;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
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
          background: linear-gradient(180deg, rgba(255, 242, 122, 0.96), rgba(255, 230, 0, 0.96));
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
          .banner-shell {
            max-height: none;
          }

          .banner-shell::before {
            background: transparent;
          }

          .banner-shell::after {
            background: transparent;
          }

          .banner-shell img {
            width: 100%;
            height: auto;
            max-height: none;
            object-fit: contain;
            object-position: center top;
          }

          .seo-intro {
            margin: 14px auto 0;
            padding: 18px 14px 4px;
            text-align: left;
          }

          .seo-intro h1 {
            font-size: 26px;
          }

          .seo-intro p {
            font-size: 14px;
            line-height: 1.55;
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

          .quick-links {
            justify-content: flex-start;
            padding: 16px 14px 0;
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
          }

          .quick-links a {
            flex: 0 0 auto;
          }

          .section-wrap {
            padding: 24px 14px 8px;
            scroll-margin-top: 82px;
          }

          h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
