import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  return (
    <div style={styles.container}>
      <Navbar />

      <div style={styles.hero}>
        <h1 style={styles.title}>LOCAL JAGOFF</h1>
        <p style={styles.subtitle}>
          Certified nonsense. Pittsburgh attitude.
        </p>
      </div>

      <div style={styles.grid}>
        {products.map((product) => (
          <div key={product.id} style={styles.card}>
            <Link href={`/product/${product.id}`}>
              <img src={product.thumbnail_url} style={styles.image} />
            </Link>

            <h2>{product.name}</h2>
            <p>${product.retail_price}</p>

            <Link href={`/product/${product.id}`}>
              <button style={styles.button}>VIEW</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#000",
    color: "#fff",
    minHeight: "100vh",
  },
  hero: {
    textAlign: "center",
    padding: "60px 20px",
  },
  title: {
    fontSize: "48px",
    letterSpacing: "2px",
  },
  subtitle: {
    color: "#aaa",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "30px",
    padding: "20px",
  },
  card: {
    background: "#111",
    padding: "15px",
    border: "1px solid #222",
    transition: "0.2s",
  },
  image: {
    width: "100%",
  },
  button: {
    marginTop: "10px",
    padding: "10px",
    width: "100%",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },
};
