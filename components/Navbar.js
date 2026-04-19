import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      const c = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(c);
    };

    loadCart();

    const handler = () => loadCart();

    window.addEventListener("cartUpdated", handler);

    return () =>
      window.removeEventListener("cartUpdated", handler);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const checkout = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed");
      }
    } catch {
      alert("Checkout failed");
    }
  };

  return (
    <>
      <div style={styles.nav}>
        <Link href="/">LOCAL JAGOFF</Link>

        <div onClick={() => setOpen(true)} style={styles.cart}>
          CART ({cart.length})
        </div>
      </div>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.sideCart}>
            <div style={styles.close} onClick={() => setOpen(false)}>
              ✕
            </div>

            <h2>Your Cart</h2>

            {cart.map((item, i) => (
              <div key={i} style={styles.item}>
                <img src={item.image} style={styles.img} />
                <div>
                  <p>{item.name}</p>
                  <p>
                    ${item.price} x {item.quantity}
                  </p>
                </div>
              </div>
            ))}

            <h3>Total: ${total.toFixed(2)}</h3>

            <button style={styles.btn} onClick={checkout}>
              CHECKOUT
            </button>

            <Link href="/cart">
              <div style={styles.viewCart}>View Cart</div>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px",
    borderBottom: "1px solid #222",
  },

  cart: {
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 999,
  },

  sideCart: {
    position: "absolute",
    right: 0,
    top: 0,
    width: "300px",
    height: "100%",
    background: "#000",
    padding: "20px",
    overflowY: "auto",
  },

  close: {
    position: "absolute",
    top: 10,
    right: 15,
    fontSize: "22px",
    cursor: "pointer",
  },

  item: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },

  img: {
    width: "60px",
  },

  btn: {
    width: "100%",
    padding: "15px",
    background: "yellow",
    border: "none",
    fontWeight: "bold",
    marginTop: "10px",
  },

  viewCart: {
    marginTop: "10px",
    textAlign: "center",
    color: "#aaa",
  },
};
