import { useEffect, useState } from "react";

export default function CartDrawer({ open, setOpen }) {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const update = () => {
      const stored = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(stored);
    };

    update();

    window.addEventListener("cartUpdated", update);
    return () => window.removeEventListener("cartUpdated", update);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <>
      {/* BACKDROP */}
      {open && (
        <div style={styles.backdrop} onClick={() => setOpen(false)} />
      )}

      {/* DRAWER */}
      <div style={{ ...styles.drawer, right: open ? 0 : "-380px" }}>
        <h2 style={{ marginBottom: "20px" }}>Your Cart</h2>

        {cart.length === 0 && <p>Cart is empty</p>}

        {cart.map((item, i) => (
          <div key={i} style={styles.item}>
            <img
              src={item.image || "/images/placeholder.jpg"}
              style={styles.image}
            />
            <div>
              <p style={{ margin: 0 }}>{item.name}</p>
              <p style={{ margin: 0 }}>${item.price}</p>
            </div>
          </div>
        ))}

        <h3 style={{ marginTop: "20px" }}>
          Total: ${total.toFixed(2)}
        </h3>

        <a href="/cart" style={styles.button}>
          VIEW CART
        </a>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    zIndex: 999,
  },

  drawer: {
    position: "fixed",
    top: 0,
    width: "360px",
    height: "100%",
    background: "#111",
    color: "#fff",
    padding: "20px",
    transition: "0.3s",
    zIndex: 1000,
    overflowY: "auto",
  },

  item: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
    borderBottom: "1px solid #222",
    paddingBottom: "10px",
  },

  image: {
    width: "50px",
    height: "50px",
    objectFit: "cover",
  },

  button: {
    display: "block",
    marginTop: "20px",
    padding: "12px",
    background: "yellow",
    color: "#000",
    textAlign: "center",
    textDecoration: "none",
    fontWeight: "bold",
  },
};
