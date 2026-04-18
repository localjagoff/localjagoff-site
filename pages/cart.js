import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

  const update = (c) => {
    setCart(c);
    localStorage.setItem("cart", JSON.stringify(c));
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
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
        <div style={styles.items}>
          <div style={styles.headerRow}>
            <h1>YOUR CART</h1>

            {cart.length > 0 && (
              <button style={styles.clearBtn} onClick={clearCart}>
                CLEAR CART
              </button>
            )}
          </div>

          {cart.length === 0 && <p>Your cart is empty</p>}

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              {/* IMAGE */}
              <img
                src={
                  item.image ||
                  "https://via.placeholder.com/80x80?text=Item"
                }
                style={styles.img}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/80x80?text=Item";
                }}
              />

              {/* DETAILS */}
              <div style={{ flex: 1 }}>
                <h3>{item.name}</h3>
                <p style={{ color: "#aaa" }}>{item.size}</p>
                <p>${item.price}</p>
              </div>

              {/* QTY */}
              <div style={styles.qty}>
                <button onClick={() => sub(i)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => add(i)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* SUMMARY */}
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

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  clearBtn: {
    background: "none",
    color: "#aaa",
    border: "1px solid #333",
    padding: "8px 12px",
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

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  summary: {
    flex: 1,
    background: "#111",
    padding: "20px",
    border: "1px solid #222",
    height: "fit-content",
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
