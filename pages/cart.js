import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const addQty = (index) => {
    const updated = [...cart];
    updated[index].quantity += 1;
    updateCart(updated);
  };

  const removeQty = (index) => {
    const updated = [...cart];
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
    } else {
      updated.splice(index, 1);
    }
    updateCart(updated);
  };

  const getTotal = () =>
    cart
      .reduce((sum, item) => sum + item.quantity * Number(item.price), 0)
      .toFixed(2);

  const checkoutAll = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: cart }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <h1>YOUR CART</h1>

      {cart.length === 0 && <p>Your cart is empty</p>}

      {cart.map((item, index) => (
        <div key={index} style={styles.item}>
          <div>
            <h2>{item.name}</h2>
            <p>Size: {item.size}</p>
            <p>${item.price}</p>
          </div>

          <div>
            <button onClick={() => removeQty(index)}>-</button>
            <span style={{ margin: "0 10px" }}>{item.quantity}</span>
            <button onClick={() => addQty(index)}>+</button>
          </div>
        </div>
      ))}

      <h2>Total: ${getTotal()}</h2>

      <button style={styles.checkout} onClick={checkoutAll}>
        CHECKOUT
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: "#000",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "15px",
  },
  checkout: {
    background: "yellow",
    color: "#000",
    padding: "15px",
    width: "100%",
    fontWeight: "bold",
    border: "none",
  },
};
