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
    428983169: "/images/products/local-jagoff-412-hoodie.jpg",
    428982889: "/images/products/localjagoffkeystonetee.jpg",
    428980566: "/images/products/localjagoffhatvr2.jpg",
    428851907: "/images/products/localjagoffhat.jpg",
    428851698: "/images/products/tee-keystone.jpg",
    428851608: "/images/products/tee-steel.jpg",
    428851513: "/images/products/local-jagoff-sideways-tee.jpg",
    428821578: "/images/products/hoodie2.jpg",
    428550417: "/images/products/tee-certified.jpg",
  };

  const tees = products.filter((p) =>
    [
      428851698,
      428851608,
      428851513,
      428550417,
      428982889,
    ].includes(p.id)
  );

  const hoodies = products.filter((p) =>
    [
      428821578,
      428983169,
    ].includes(p.id)
  );

  const hats = products.filter((p) =>
    [
      428851907,
      428980566,
    ].includes(p.id)
  );

  return (
    <div style={styles.page}>
      <Navbar />

      {/* HERO */}
      <div style={styles.hero}>
        <img
          src="/images/banner.png"
          className="hero-desktop"
          style={styles.heroImg}
        />

        <img
          src="/images/banner-mobile.png"
          className="hero-mobile"
          style={styles.heroImg}
        />

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

        {/* T-SHIRTS */}
        <div style={styles.categoryHeader}>
          <h2 style={styles.sectionTitle}>T-SHIRTS</h2>
          <Link href="/tees">View All →</Link>
        </div>

        <div style={styles.scrollRow}>
          {tees.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div style={styles.scrollCard}>
                  <img src={image} style={styles.scrollImg} />
                  <p>{p.name}</p>
                  <p style={styles.price}>${p.retail_price}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* HOODIES */}
        <div style={styles.categoryHeader}>
          <h2 style={styles.sectionTitle}>HOODIES</h2>
          <Link href="/hoodies">View All →</Link>
        </div>

        <div style={styles.scrollRow}>
          {hoodies.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div style={styles.scrollCard}>
                  <img src={image} style={styles.scrollImg} />
                  <p>{p.name}</p>
                  <p style={styles.price}>${p.retail_price}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* HATS */}
        <div style={styles.categoryHeader}>
          <h2 style={styles.sectionTitle}>HATS</h2>
          <Link href="/hats">View All →</Link>
        </div>

        <div style={styles.scrollRow}>
          {hats.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div style={styles.scrollCard}>
                  <img src={image} style={styles.scrollImg} />
                  <p>{p.name}</p>
                  <p style={styles.price}>${p.retail_price}</p>
                </div>
              </Link>
            );
          })}
        </div>

      </div>

      {/* TRUST */}
      <div style={styles.trustSection}>
        <div>🔒 Secure Checkout</div>
        <div>🚚 Fast Shipping</div>
        <div>🇺🇸 Printed in USA</div>
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <p>© 2026 Local Jagoff</p>
        <div style={styles.footerLinks}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#000" },

  // ✅ FIXED HERO (no cropping)
  hero: {
    position: "relative",
    height: "auto",
  },

  heroImg: {
    width: "100%",
    height: "auto",
    display: "block",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.85))",
  },

  heroContent: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    width: "90%",
  },

  title: { fontSize: "58px", marginBottom: "10px" },
  tagline: { color: "#ccc", marginBottom: "20px" },

  section: { padding: "50px 12px" },
  sectionTitle: { fontSize: "23px" },

  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "35px 0 12px",
  },

  scrollRow: {
    display: "flex",
    gap: "15px",
    overflowX: "auto",
    alignItems: "flex-start",
  },

  scrollCard: { flex: "0 0 160px" },

  scrollImg: {
    width: "100%",
    height: "160px",
    objectFit: "contain",
    background: "#000",
  },

  price: { color: "#ccc" },

  trustSection: {
    display: "flex",
    justifyContent: "space-around",
    padding: "30px 10px",
    borderTop: "1px solid #222",
    borderBottom: "1px solid #222",
    marginTop: "40px",
    textAlign: "center",
  },

  footer: { padding: "20px", textAlign: "center", color: "#777" },

  footerLinks: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "10px",
  },
};
