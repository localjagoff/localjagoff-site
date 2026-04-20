import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

export default function HoodiesPage() {
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

  // ✅ NEW CATEGORY-BASED FILTER
  const hoodies = products.filter((p) => p.category === "hoodies");

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        <Link href="/">← Back to Home</Link>

        <h1 style={styles.title}>Hoodies</h1>

        <div style={styles.switcher}>
          <Link href="/tees">T-Shirts</Link>
          <Link href="/hoodies">Hoodies</Link>
          <Link href="/hats">Hats</Link>
        </div>

        <div style={styles.grid}>
          {hoodies.map((p) => {
            const image = customImages[p.id] || p.thumbnail_url;

            return (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div>
                  <img src={image} style={styles.img} />
                  <p>{p.name}</p>
                  <p style={styles.price}>${p.retail_price}</p>
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
  page: { background: "#000", minHeight: "100vh" },

  container: {
    padding: "20px",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  title: {
    margin: "20px 0",
  },

  switcher: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "20px",
  },

  img: {
    width: "100%",
  },

  price: {
    color: "#ccc",
  },
};
