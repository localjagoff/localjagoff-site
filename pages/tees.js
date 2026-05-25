import Head from "next/head";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import productImages from "../lib/productImages";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/tees`;
const PAGE_TITLE = "Pittsburgh Jagoff T-Shirts | Local Jagoff";
const PAGE_DESCRIPTION =
  "Shop Local Jagoff Pittsburgh jagoff t-shirts, yinzer shirts, 412 tees, 724 gear, and black and gold Western PA streetwear.";

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

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    isPartOf: {
      "@type": "WebSite",
      name: "Local Jagoff",
      url: SITE_URL,
    },
  };

  return (
    <div className="category-page">
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} key="description" />
        <link rel="canonical" href={PAGE_URL} key="canonical" />

        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta
          property="og:description"
          content={PAGE_DESCRIPTION}
          key="og:description"
        />
        <meta property="og:url" content={PAGE_URL} key="og:url" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />
        <meta
          property="og:image"
          content={`${SITE_URL}/images/social-share.jpg`}
          key="og:image"
        />
        <meta
          property="og:image:secure_url"
          content={`${SITE_URL}/images/social-share.jpg`}
          key="og:image:secure_url"
        />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta
          property="og:image:alt"
          content="Local Jagoff Pittsburgh shirts and gear"
          key="og:image:alt"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
          key="twitter:card"
        />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta
          name="twitter:description"
          content={PAGE_DESCRIPTION}
          key="twitter:description"
        />
        <meta
          name="twitter:image"
          content={`${SITE_URL}/images/social-share.jpg`}
          key="twitter:image"
        />
        <meta
          name="twitter:image:alt"
          content="Local Jagoff Pittsburgh shirts and gear"
          key="twitter:image:alt"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
          }}
          key="tees-jsonld"
        />
      </Head>

      <Navbar />

      <main className="category-wrap">
        <Link href="/" className="back-link">
          ← Back
        </Link>

        <section className="category-hero" aria-label="Pittsburgh jagoff t-shirts">
          <p className="section-kicker">PITTSBURGH JAGOFF TEES</p>
          <h1>Pittsburgh Jagoff T-Shirts</h1>
          <p>
            Shop Local Jagoff t-shirts built for Pittsburgh attitude, yinzer
            humor, black and gold pride, 412 energy, and Western PA locals who
            know exactly what jagoff means.
          </p>
        </section>

        {tees.length > 0 && (
          <section className="category-section">
            <p className="section-kicker">NO BORING SHIRTS</p>
            <h2>T-Shirts</h2>

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
            <h2>For the 724, Jagoffs</h2>

            <p className="section-copy">
              Western PA does not stop at the 412. This section is for the 724
              jagoffs repping the same black and gold attitude.
            </p>

            <div className="grid">
              {products724.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

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

        .category-hero {
          max-width: 880px;
          margin: 0 0 30px;
          padding: 22px;
          border: 1px solid #242424;
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.055), rgba(255, 230, 0, 0) 40%),
            rgba(17, 17, 17, 0.72);
        }

        .category-hero h1 {
          margin: 0 0 10px;
          font-size: 36px;
          line-height: 1.08;
          letter-spacing: 0.4px;
        }

        .category-hero p {
          max-width: 760px;
          margin: 0;
          color: #d8d8d8;
          font-size: 15px;
          line-height: 1.6;
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

        h2 {
          margin: 0 0 12px;
          font-size: 28px;
          line-height: 1.1;
        }

        .section-copy {
          max-width: 720px;
          margin: 0 0 18px;
          color: #cfcfcf;
          font-size: 15px;
          line-height: 1.55;
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

          .category-hero {
            margin-bottom: 24px;
            padding: 18px;
            border-radius: 18px;
          }

          .category-hero h1 {
            font-size: 28px;
          }

          .category-hero p,
          .section-copy {
            font-size: 14px;
            line-height: 1.55;
          }

          h2 {
            font-size: 24px;
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
