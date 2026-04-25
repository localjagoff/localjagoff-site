import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { startCheckout } from "../lib/checkout";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

  const updateCart = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const increaseQty = (index) => {
    const updated = [...cart];
    updated[index].quantity += 1;
    updateCart(updated);
  };

  const decreaseQty = (index) => {
    const updated = [...cart];
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
    } else {
      updated.splice(index, 1);
    }
    updateCart(updated);
  };

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        {/* LEFT */}
        <div style={styles.left}>
          <div style={styles.headerRow}>
            <h1>YOUR CART</h1>
            {cart.length > 0 && (
              <button style={styles.clearBtn} onClick={clearCart}>
                CLEAR
              </button>
            )}
          </div>

          {cart.length === 0 && <p>Your cart is empty</p>}

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              <img
                src={item.image || "https://via.placeholder.com/80"}
                style={styles.image}
              />

              <div style={styles.details}>
                <h3>{item.name}</h3>
                <p style={styles.price}>${item.price}</p>
              </div>

              <div style={styles.qty}>
                <button style={styles.qtyBtn} onClick={() => decreaseQty(i)}>
                  −
                </button>
                <span>{item.quantity}</span>
                <button style={styles.qtyBtn} onClick={() => increaseQty(i)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={styles.right}>
          <h2>Total</h2>
          <h1>${total.toFixed(2)}</h1>

          <button
            style={styles.checkoutBtn}
            onClick={() => startCheckout(cart)}
            disabled={cart.length === 0}
          >
            CHECKOUT
          </button>
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

  left: {
    flex: 2,
  },

  right: {
    flex: 1,
    background: "#111",
    padding: "25px",
    border: "1px solid #222",
    height: "fit-content",
    minWidth: "260px",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  clearBtn: {
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

  image: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    background: "#111",
  },

  details: {
    flex: 1,
  },

  price: {
    color: "#ccc",
  },

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
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

  checkoutBtn: {
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
