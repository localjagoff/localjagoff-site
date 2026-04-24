import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      const c = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(c);
    };

    loadCart();

    const handler = () => {
      loadCart();
      setOpen(true);
    };

    window.addEventListener("cartUpdated", handler);
    return () => window.removeEventListener("cartUpdated", handler);
  }, []);

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
  }, [cart]);

  const checkout = async () => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });

      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Checkout failed");
    }
  };

  return (
    <>
      <div className="navSpacer" />

      <header className="nav">
        <div className="brandArea">
          <button
            type="button"
            className="brand"
            onClick={() => setMenuOpen((v) => !v)}
          >
            LOCAL JAGOFF
            <span className={`arrow ${menuOpen ? "open" : ""}`} />
          </button>
        </div>

        <nav className="desktopLinks">
          <Link href="/tees">TEES</Link>
          <Link href="/hoodies">HOODIES</Link>
          <Link href="/hats">HATS</Link>
        </nav>

        <button className="cartTrigger" onClick={() => setOpen(true)}>
          CART ({cart.length})
        </button>
      </header>

      <div className={`mobileMenu ${menuOpen ? "menuOpen" : ""}`}>
        <Link href="/" onClick={() => setMenuOpen(false)}>HOME</Link>
        <Link href="/tees" onClick={() => setMenuOpen(false)}>TEES</Link>
        <Link href="/hoodies" onClick={() => setMenuOpen(false)}>HOODIES</Link>
        <Link href="/hats" onClick={() => setMenuOpen(false)}>HATS</Link>
      </div>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside className="sideCart" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)}>✕</button>

            <h2>Your Jagoff Stash</h2>

            {cart.length === 0 && <p>Your cart is empty.</p>}

            {cart.map((item, i) => (
              <div key={i} className="item">
                <img src={item.image} className="img" alt={item.name} />
                <div>
                  <p>{item.name}</p>
                  <p>${item.price} x {item.quantity}</p>
                </div>
              </div>
            ))}

            <div className="summary">
              <p>Total: ${total.toFixed(2)}</p>

              <button
                className="checkoutBtn"
                onClick={checkout}
                disabled={cart.length === 0}
              >
                CHECKOUT
              </button>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .navSpacer {
          height: 70px;
        }

        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 16px 22px;
          background: rgba(0, 0, 0, 0.95);
          border-bottom: 1px solid #1d1d1d;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: "Oswald", sans-serif;
          font-size: 18px;
          color: #fff;
          background: none;
          border: none;
          cursor: pointer;
        }

        .arrow {
          width: 8px;
          height: 8px;
          border-right: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(45deg);
          transition: transform 0.22s ease;
          margin-top: 2px;
        }

        .arrow.open {
          transform: rotate(-135deg);
        }

        .desktopLinks {
          display: flex;
          justify-content: center;
          gap: 28px;
          font-family: "Oswald", sans-serif;
          letter-spacing: 1px;
        }

        .desktopLinks :global(a) {
          color: #ccc;
        }

        .desktopLinks :global(a:hover) {
          color: #ffe600;
        }

        .cartTrigger {
          justify-self: end;
          color: #fff;
          background: none;
          border: none;
          cursor: pointer;
          font-family: "Oswald", sans-serif;
          font-size: 18px;
        }

        .mobileMenu {
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          z-index: 999;
          background: #090909;
          border-bottom: 1px solid #222;
          transform: translateY(-120%);
          opacity: 0;
          pointer-events: none;
          transition:
            transform 0.22s ease,
            opacity 0.22s ease;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
        }

        .mobileMenu.menuOpen {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .mobileMenu :global(a) {
          display: block;
          padding: 15px 18px;
          border-top: 1px solid #1d1d1d;
          color: #fff;
          font-family: "Oswald", sans-serif;
          letter-spacing: 1px;
        }

        .mobileMenu :global(a:hover) {
          color: #ffe600;
          background: rgba(255, 230, 0, 0.05);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1100;
        }

        .sideCart {
          position: absolute;
          right: 0;
          width: 350px;
          max-width: 100%;
          height: 100%;
          background: #000;
          padding: 20px;
          overflow-y: auto;
        }

        .close {
          color: #fff;
          background: none;
          border: none;
          font-size: 22px;
          float: right;
          cursor: pointer;
        }

        .item {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }

        .img {
          width: 60px;
          height: 60px;
          object-fit: cover;
        }

        .checkoutBtn {
          width: 100%;
          padding: 14px;
          background: #ffe600;
          border: none;
          margin-top: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (min-width: 769px) {
          .mobileMenu {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .desktopLinks {
            display: none;
          }

          .nav {
            padding: 16px 18px;
          }

          .cartTrigger {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  );
}
