import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCount(total);
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
    position: "sticky",
    top: 0,
    backgroundColor: "#000",
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #222",
    zIndex: 1000,
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
