import { useEffect, useState } from "react";

export default function CartDrawer({ open, setOpen }) {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);

    const update = () => {
      setCart(JSON.parse(localStorage.getItem("cart")) || []);
    };

    window.addEventListener("cartUpdated", update);
    return () => window.removeEventListener("cartUpdated", update);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <div style={{
      ...styles.drawer,
      right: open ? 0 : "-400px"
    }}>
      <h2>Your Cart</h2>

      {cart.length === 0 && <p>Empty</p>}

      {cart.map((item, i) => (
        <div key={i} style={styles.item}>
          <img src={item.image} style={styles.img} />
          <div>
            <p>{item.name}</p>
            <p>${item.price}</p>
          </div>
        </div>
      ))}

      <h3>Total: ${total.toFixed(2)}</h3>

      <a href="/cart" style={styles.button}>VIEW CART</a>
    </div>
  );
}

const styles = {
  drawer: {
    position: "fixed",
    top: 0,
    width: "350px",
    height: "100%",
    background: "#111",
    color: "#fff",
    padding: "20px",
    transition: "0.3s",
    zIndex: 1000,
  },
  item: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  img: {
    width: "50px",
  },
  button: {
    display: "block",
    marginTop: "20px",
    padding: "10px",
    background: "yellow",
    color: "#000",
    textAlign: "center",
    textDecoration: "none",
  },
};
