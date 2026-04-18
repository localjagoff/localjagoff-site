import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.push(product);
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  const buyNow = async (product) => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: product.name,
        price: product.retail_price,
        variantId: product.variantId || 0, // safe fallback
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div style={styles.container}>
      {/* HERO */}
      <div style={styles.hero}>
        <h1 style={styles.title}>LOCAL JAGOFF</h1>
        <p style={styles.subtitle}>
          Certified nonsense. Pittsburgh attitude.
        </p>
        <a href="#shop" style={styles.shopButton}>
          SHOP NOW
        </a>
      </div>

      {/* PRODUCTS */}
      <div id="shop" style={styles.grid}>
        {products.map((product) => (
          <div key={product.id} style={styles.card}>
            <Link href={`/product/${product.id}`}>
              <img
                src={product.thumbnail_url}
                alt={product.name}
                style={styles.image}
              />
            </Link>

            <h2 style={styles.productName}>{product.name}</h2>
            <p style={styles.price}>${product.retail_price}</p>

            <div style={styles.buttonGroup}>
              <button
                style={styles.addToCart}
                onClick={() => addToCart(product)}
              >
                ADD TO CART
              </button>

              <button
                style={styles.buyNow}
                onClick={() => buyNow(product)}
              >
                BUY NOW
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  hero: {
    textAlign: "center",
    padding: "60px 20px",
    borderBottom: "1px solid #222",
  },

  title: {
    fontSize: "48px",
    fontWeight: "bold",
    letterSpacing: "2px",
  },

  subtitle: {
    marginTop: "10px",
    color: "#aaa",
  },

  shopButton: {
    display: "inline-block",
    marginTop: "20px",
    padding: "12px 24px",
    backgroundColor: "yellow",
    color: "#000",
    fontWeight: "bold",
    textDecoration: "none",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "30px",
    marginTop: "40px",
  },

  card: {
    backgroundColor: "#111",
    padding: "15px",
    border: "1px solid #222",
  },

  image: {
    width: "100%",
    marginBottom: "10px",
  },

  productName: {
    fontSize: "18px",
    marginBottom: "5px",
  },

  price: {
    color: "#ccc",
    marginBottom: "10px",
  },

  buttonGroup: {
    display: "flex",
    gap: "10px",
  },

  addToCart: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },

  buyNow: {
    flex: 1,
    padding: "10px",
    backgroundColor: "yellow",
    color: "#000",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
