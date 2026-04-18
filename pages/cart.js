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

  const checkout = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ items: cart }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <div style={styles.wrapper}>
        <div style={styles.items}>
          <h1>YOUR CART</h1>

          {cart.map((item, i) => (
            <div key={i} style={styles.item}>
              <div>
                <h3>{item.name}</h3>
                <p>{item.size}</p>
                <p>${item.price}</p>
              </div>

              <div style={styles.qty}>
                <button onClick={() => subQty(i)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => addQty(i)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.summary}>
          <h2>Total</h2>
          <h1>${total.toFixed(2)}</h1>

          <button style={styles.checkout} onClick={checkout}>
            CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { background: "#000", color: "#fff", minHeight: "100vh", padding: "20px" },
  wrapper: { display: "flex", gap: "40px", flexWrap: "wrap" },
  items: { flex: 2 },
  summary: {
    flex: 1,
    background: "#111",
    padding: "20px",
    border: "1px solid #222",
    height: "fit-content",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #222",
    padding: "15px 0",
  },
  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
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
