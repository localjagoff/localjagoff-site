import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart")) || []);
  }, []);

  const update = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const addQty = (i) => {
    const c = [...cart];
    c[i].quantity++;
    update(c);
  };

  const subQty = (i) => {
    const c = [...cart];
    if (c[i].quantity > 1) c[i].quantity--;
    else c.splice(i, 1);
    update(c);
  };

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * Number(item.price),
    0
  );

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        {/* LEFT SIDE */}
        <div style={styles.items}>
          <h1 style={styles.title}>YOUR CART</h1>

          {cart.length === 0 && <p>Your cart is empty</p>}

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              {/* IMAGE */}
              <img
                src={item.image || "/placeholder.png"}
                style={styles.image}
              />

              {/* DETAILS */}
              <div style={styles.details}>
                <h3>{item.name}</h3>
                <p style={styles.sub}>{item.size}</p>
                <p>${item.price}</p>
              </div>

              {/* QTY */}
              <div style={styles.qty}>
                <button onClick={() => subQty(i)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => addQty(i)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE SUMMARY */}
        <div style={styles.summary}>
          <h2>Order Summary</h2>

          <div style={styles.totalRow}>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button style={styles.checkout}>CHECKOUT</button>
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

  items: {
    flex: 2,
  },

  title: {
    marginBottom: "30px",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "20px 0",
    borderBottom: "1px solid #222",
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

  sub: {
    color: "#aaa",
    fontSize: "14px",
  },

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  summary: {
    flex: 1,
    background: "#111",
    padding: "25px",
    border: "1px solid #222",
    height: "fit-content",
    minWidth: "280px",
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    fontSize: "18px",
  },

  checkout: {
    marginTop: "30px",
    width: "100%",
    padding: "15px",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },
};
