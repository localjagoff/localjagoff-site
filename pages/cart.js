import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart")) || []);
  }, []);

  const update = (c) => {
    setCart(c);
    localStorage.setItem("cart", JSON.stringify(c));

    // 🔥 update navbar live
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const add = (i) => {
    const c = [...cart];
    c[i].quantity++;
    update(c);
  };

  const sub = (i) => {
    const c = [...cart];
    if (c[i].quantity > 1) c[i].quantity--;
    else c.splice(i, 1);
    update(c);
  };

  const total = cart.reduce(
    (s, item) => s + item.quantity * Number(item.price),
    0
  );

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={styles.container}>
        {/* LEFT */}
        <div style={styles.items}>
          <div style={styles.header}>
            <h1>YOUR CART</h1>
            <button style={styles.clear} onClick={clearCart}>
              CLEAR
            </button>
          </div>

          {cart.length === 0 && <p>Your cart is empty</p>}

          {cart.map((item, i) => (
            <div key={item.key} style={styles.item}>
              <img
                src={item.image || "https://via.placeholder.com/80"}
                style={styles.img}
              />

              <div style={styles.details}>
                <h3>{item.name}</h3>
                <p style={styles.sub}>{item.size}</p>
                <p>${item.price}</p>
              </div>

              {/* 🔥 FIXED BUTTONS */}
              <div style={styles.qty}>
                <button style={styles.qtyBtn} onClick={() => sub(i)}>
                  −
                </button>
                <span style={styles.qtyNum}>{item.quantity}</span>
                <button style={styles.qtyBtn} onClick={() => add(i)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={styles.summary}>
          <h2>Total</h2>
          <h1>${total.toFixed(2)}</h1>

          <button style={styles.checkout}>CHECKOUT</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    gap: "40px",
    padding: "40px 20px",
    flexWrap: "wrap",
  },

  items: { flex: 2 },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  clear: {
    background: "none",
    border: "1px solid #333",
    color: "#aaa",
    padding: "6px 12px",
    cursor: "pointer",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    borderBottom: "1px solid #222",
    padding: "15px 0",
  },

  img: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    background: "#111",
  },

  details: {
    flex: 1,
  },

  sub: {
    color: "#aaa",
    fontSize: "14px",
  },

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  qtyBtn: {
    width: "36px",
    height: "36px",
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

  summary: {
    flex: 1,
    background: "#111",
    padding: "25px",
    border: "1px solid #222",
    height: "fit-content",
    minWidth: "280px",
  },

  checkout: {
    marginTop: "20px",
    width: "100%",
    padding: "15px",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },
};
