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

      {/* 🔥 HERO SECTION */}
      <div style={styles.hero}>
        <img src="/images/banner.jpg" style={styles.heroImg} />

        <div style={styles.overlay} />

        <div style={styles.heroContent}>
          <h1 style={styles.title}>LOCAL JAGOFF</h1>
          <p style={styles.tagline}>
            Certified nonsense. Pittsburgh attitude.
          </p>

          <a href="#products" style={styles.button}>
            SHOP NOW
          </a>
        </div>
      </div>

      {/* 🔥 PRODUCTS */}
      <div id="products" style={styles.grid}>
        {products.map((p) => {
          const image = customImages[p.id] || p.thumbnail_url;

          return (
            <Link key={p.id} href={`/product/${p.id}`}>
              <div style={styles.card}>
                <img src={image} style={styles.image} />
                <h3>{p.name}</h3>
                <p>${p.retail_price}</p>
              </div>
            </Link>
          );
        })}
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
    height: "500px",
    overflow: "hidden",
  },

  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.6)",
  },

  heroContent: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
  },

  title: {
    fontSize: "48px",
    marginBottom: "10px",
  },

  tagline: {
    fontSize: "18px",
    marginBottom: "20px",
    color: "#ccc",
  },

  button: {
    padding: "12px 25px",
    background: "yellow",
    color: "#000",
    textDecoration: "none",
    fontWeight: "bold",
  },

  // 🔥 PRODUCTS
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    padding: "40px 20px",
  },

  card: {
    background: "#111",
    padding: "15px",
    border: "1px solid #222",
    cursor: "pointer",
    transition: "0.2s",
  },

  image: {
    width: "100%",
    marginBottom: "10px",
  },
};
