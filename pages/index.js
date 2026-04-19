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
        <img src="/images/banner.png" style={styles.heroImg} />
        <div style={styles.overlay} />

        <div style={styles.heroContent}>
          <h1 style={styles.title}>LOCAL JAGOFF</h1>
          <p style={styles.tagline}>
            Certified nonsense. Pittsburgh attitude.
          </p>

          <a href="#products" className="btn">
            SHOP THE DROP
          </a>
        </div>
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
    background: "#000",
    minHeight: "100vh",
  },

  hero: {
    position: "relative",
    height: "520px",
    overflow: "hidden",
  },

  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 90%)",
  },

  heroContent: {
    position: "absolute",
    top: "55%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
  },

  title: {
    fontSize: "60px",
    marginBottom: "10px",
  },

  tagline: {
    color: "#ccc",
    marginBottom: "20px",
  },

  section: {
    padding: "60px 20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  sectionTitle: {
    marginBottom: "30px",
    fontSize: "28px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "25px",
  },

  card: {},

  cardBody: {
    padding: "15px",
  },

  productName: {
    fontSize: "16px",
  },

  price: {
    color: "#ccc",
  },
};
