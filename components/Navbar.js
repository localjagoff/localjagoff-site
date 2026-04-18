import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [count, setCount] = useState(0);

  const updateCount = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCount(total);
  };

  useEffect(() => {
    updateCount();

    window.addEventListener("cartUpdated", updateCount);

    return () => {
      window.removeEventListener("cartUpdated", updateCount);
    };
  }, []);

  return (
    <div style={styles.nav}>
      <Link href="/" style={styles.logo}>
        LOCAL JAGOFF
      </Link>

      <Link href="/cart" style={styles.cart}>
        CART ({count})
      </Link>
    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px 20px",
    borderBottom: "1px solid #222",
    background: "#000",
  },
  logo: {
    color: "yellow",
    fontWeight: "bold",
    textDecoration: "none",
  },
  cart: {
    color: "#fff",
    textDecoration: "none",
  },
};
