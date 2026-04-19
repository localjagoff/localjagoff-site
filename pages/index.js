import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const customImages = {
    428851907: "/images/products/trucker.png",
    428851698: "/images/products/tee-keystone.png",
    428851608: "/images/products/tee-steel.png",
    428851513: "/images/products/tee-sideways.png",
    428821578: "/images/products/hoodie.png",
    428550417: "/images/products/tee-certified.png",
  };

  return (
    <div style={styles.page}>
      <Navbar />

      {/* HERO */}
      <div style={styles.hero}>
        {/* DESKTOP IMAGE */}
        <img
          src="/images/banner.png"
          className="hero-desktop"
          style={styles.heroImg}
        />

        {/* MOBILE IMAGE */}
        <img
          src="/images/banner-mobile.png"
          className="hero-mobile"
          style={styles.heroImg}
        />

        {/* DESKTOP CONTENT ONLY */}
        <div className="hero-overlay" style={styles.overlay} />
        <div className="hero-content" style={styles.heroContent}>
          <h1 style={styles.title}>LOCAL JAGOFF</h1>
          <p style={styles.tagline}>
            Certified nonsense. Pittsburgh attitude.
          </p>

          <a href="#products" className="btn">
            SHOP THE DROP
          </a>
        </div>

        {/* RESPONSIVE CONTROL */}
        <style jsx>{`
          .hero-mobile {
            display: none;
          }

          @media (max-width: 768px) {
            .hero-desktop {
              display: none;
            }

            .hero-mobile {
              display: block;
            }

            .hero-overlay,
            .hero-content {
              display: none;
            }
          }
        `}</style>
      </div>

      {/* PRODUCTS */}
      <div id="products" style={styles.section}>
        <h2 style={styles.sectionTitle}>FEATURED</h2>

        <div style={styles.grid}>
          {products.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div className="card" style={styles.card}>
                  <img src={image} className="img" />

                  <div style={styles.cardBody}>
                    <h3>{p.name}</h3>
                    <p style={styles.price}>${p.retail_price}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#000",
  },

  hero: {
    position: "relative",
    height: "420px", // restored desktop size
    overflow: "hidden",
  },

  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    position: "absolute",
    top: 0,
    left: 0,
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.85))",
  },

  heroContent: {
    position: "absolute",
    bottom: "40px",
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    width: "90%",
  },

  title: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  tagline: {
    color: "#ccc",
    marginBottom: "15px",
  },

  section: {
    padding: "40px 10px",
  },

  sectionTitle: {
    marginBottom: "20px",
    fontSize: "24px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "15px",
  },

  cardBody: {
    padding: "10px",
  },

  price: {
    color: "#ccc",
  },
};
