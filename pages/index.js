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

      {/* 🔥 HERO */}
      <div style={styles.hero}>
        <img src="/images/banner.png" style={styles.heroImg} />
        <div style={styles.overlay} />

        <div style={styles.heroContent}>
          <h1 style={styles.title}>LOCAL JAGOFF</h1>
          <p style={styles.tagline}>
            Certified nonsense. Pittsburgh attitude.
          </p>

          <a href="#products" style={styles.button}>
            SHOP THE DROP
          </a>
        </div>
      </div>

      {/* 🔥 PRODUCTS */}
      <div id="products" style={styles.section}>
        <h2 style={styles.sectionTitle}>FEATURED</h2>

        <div style={styles.grid}>
          {products.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div style={styles.card}>
                  <div style={styles.imageWrap}>
                    <img src={image} style={styles.image} />
                  </div>

                  <div style={styles.cardBody}>
                    <h3 style={styles.productName}>{p.name}</h3>
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
    background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)",
    color: "#fff",
    minHeight: "100vh",
  },

  // 🔥 HERO
  hero: {
    position: "relative",
    height: "520px",
    overflow: "hidden",
  },

  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scale(1.05)",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 90%)",
  },

  heroContent: {
    position: "absolute",
    top: "55%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    maxWidth: "700px",
  },

  title: {
    fontSize: "64px",
    letterSpacing: "2px",
    marginBottom: "10px",
  },

  tagline: {
    fontSize: "18px",
    color: "#ccc",
    marginBottom: "25px",
  },

  button: {
    padding: "14px 30px",
    background: "yellow",
    color: "#000",
    textDecoration: "none",
    fontWeight: "bold",
    letterSpacing: "1px",
    transition: "0.2s",
  },

  // 🔥 SECTION
  section: {
    padding: "60px 20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  sectionTitle: {
    fontSize: "28px",
    marginBottom: "30px",
    letterSpacing: "1px",
  },

  // 🔥 GRID
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "25px",
  },

  // 🔥 CARD
  card: {
    background: "#111",
    border: "1px solid #222",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },

  imageWrap: {
    overflow: "hidden",
  },

  image: {
    width: "100%",
    transition: "transform 0.3s ease",
  },

  cardBody: {
    padding: "15px",
  },

  productName: {
    fontSize: "16px",
    marginBottom: "5px",
  },

  price: {
    color: "#ccc",
  },
};

/* 🔥 HOVER EFFECTS */
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    div:hover > div > img {
      transform: scale(1.08);
    }
    div:hover {
      transform: translateY(-4px);
      border-color: #444;
    }
    a:hover {
      opacity: 0.85;
    }
  `;
  document.head.appendChild(style);
}
