import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer";

export default function Navbar() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCount(total);
    };

    update();

    window.addEventListener("cartUpdated", update);
    return () => window.removeEventListener("cartUpdated", update);
  }, []);

  return (
    <>
      <div style={styles.nav}>
        <a href="/" style={styles.logo}>
          LOCAL JAGOFF
        </a>

        <div style={styles.cart} onClick={() => setOpen(true)}>
          CART ({count})
        </div>
      </div>

      <CartDrawer open={open} setOpen={setOpen} />
    </>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px 20px",
    borderBottom: "1px solid #222",
  },

  logo: {
    color: "yellow",
    fontWeight: "bold",
    textDecoration: "none",
  },

  cart: {
    cursor: "pointer",
  },
};
