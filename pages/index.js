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

  return (
    <div style={styles.page}>
      <Navbar />

      {/* BANNER */}
      <div style={styles.banner}>
        <img src="/images/banner.jpg" style={styles.bannerImg} />
      </div>

      {/* PRODUCTS */}
      <div style={styles.grid}>
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`}>
            <div style={styles.card}>
              <img src={p.thumbnail_url} style={styles.image} />
              <h3>{p.name}</h3>
              <p>${p.retail_price}</p>
            </div>
          </Link>
        ))}
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

  banner: {
    width: "100%",
    padding: "20px",
  },

  bannerImg: {
    width: "100%",
    borderRadius: "8px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    padding: "20px",
  },

  card: {
    background: "#111",
    padding: "15px",
    border: "1px solid #222",
    cursor: "pointer",
  },

  image: {
    width: "100%",
  },
};
