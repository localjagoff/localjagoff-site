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
          <h1>YOUR CART</h1>

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              <img
                src={item.image || "/placeholder.png"}
                style={styles.img}
              />

              <div style={{ flex: 1 }}>
                <h3>{item.name}</h3>
                <p style={{ color: "#aaa" }}>{item.size}</p>
                <p>${item.price}</p>
              </div>

              <div style={styles.qty}>
                <button onClick={() => sub(i)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => add(i)}>+</button>
              </div>
            </div>
          ))}
        </div>

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
  },
  qty: {
    display: "flex",
    gap: "10px",
  },
  summary: {
    flex: 1,
    background: "#111",
    padding: "20px",
    border: "1px solid #222",
  },
  checkout: {
    marginTop: "20px",
    width: "100%",
    padding: "15px",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
  },
};
