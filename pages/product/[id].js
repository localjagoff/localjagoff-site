import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found);
      });
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.retail_price,
        quantity,
        image: product.thumbnail_url,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    // ✅ smooth feedback instead of alert
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!product) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        <img src={product.thumbnail_url} style={styles.image} />

        <div style={styles.details}>
          <h1>{product.name}</h1>
          <h2>${product.retail_price}</h2>

          {/* Quantity */}
          <div style={styles.qty}>
            <button
              style={styles.qtyBtn}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>

            <span style={styles.qtyNum}>{quantity}</span>

            <button
              style={styles.qtyBtn}
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>

          {/* Buttons */}
          <div style={styles.actions}>
            <button style={styles.cartBtn} onClick={addToCart}>
              ADD TO CART
            </button>
          </div>

          {/* Toast */}
          {added && (
            <div style={styles.toast}>
              ✓ Added to cart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#000",
    color: "#fff",
    minHeight: "100vh",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 20px",
    display: "flex",
    gap: "40px",
    flexWrap: "wrap",
  },

  image: {
    width: "400px",
    maxWidth: "100%",
    background: "#111",
  },

  details: {
    flex: 1,
  },

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "20px 0",
  },

  qtyBtn: {
    width: "40px",
    height: "40px",
    background: "#222",
    color: "#fff",
    border: "1px solid #333",
    cursor: "pointer",
    fontSize: "18px",
  },

  qtyNum: {
    minWidth: "20px",
    textAlign: "center",
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },

  cartBtn: {
    flex: 1,
    padding: "12px",
    background: "#222",
    color: "#fff",
    border: "1px solid #333",
    cursor: "pointer",
    fontWeight: "bold",
  },

  toast: {
    marginTop: "15px",
    padding: "10px",
    background: "#111",
    border: "1px solid yellow",
    color: "yellow",
    fontWeight: "bold",
  },
};
