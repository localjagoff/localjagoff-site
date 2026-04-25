import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { startCheckout } from "../lib/checkout";

export default function Navbar() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      const c = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(c);
    };

    loadCart();

    const handler = () => {
      loadCart();
      setOpen(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
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

  const checkout = () => {
    startCheckout(cart);
  };

  return (
    <>
      <div className="navSpacer" />

      <header className="nav">
        <div className="brandArea">
          <Link href="/" className="brand desktopBrand">
            LOCAL JAGOFF
          </Link>

          <button
            type="button"
            className="brand mobileBrand"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open navigation menu"
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
        <Link href="/" onClick={() => setMenuOpen(false)}>
          HOME
        </Link>
        <Link href="/tees" onClick={() => setMenuOpen(false)}>
          TEES
        </Link>
        <Link href="/hoodies" onClick={() => setMenuOpen(false)}>
          HOODIES
        </Link>
        <Link href="/hats" onClick={() => setMenuOpen(false)}>
          HATS
        </Link>
      </div>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside className="sideCart" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)}>
              ✕
            </button>

            <div className="drawerHead">
              <p className="eyebrow">CART</p>
              <h2>Your Jagoff Stash</h2>
            </div>

            {cart.length === 0 && (
              <div className="emptyState">
                <p>Your cart is empty.</p>
                <p className="muted">Fix that, jagoff.</p>
              </div>
            )}

            {cart.map((item, i) => (
              <div key={i} className="item">
                <img
                  src={item.image || "/images/placeholder.jpg"}
                  className="img"
                  alt={item.name}
                />

                <div className="itemInfo">
                  <p className="itemName">{item.name}</p>

                  {item.variant_name && (
                    <p className="itemMeta">{item.variant_name}</p>
                  )}

                  <p className="itemMeta">
                    ${item.price} x {item.quantity}
                  </p>
                </div>
              </div>
            ))}

            <div className="summary">
              <div className="summaryRow">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <button
                className="checkoutBtn"
                onClick={checkout}
                disabled={cart.length === 0}
              >
                CHECKOUT
              </button>

              <Link
                href="/cart"
                className="viewCart"
                onClick={() => setOpen(false)}
              >
                View Cart
              </Link>
            </div>
          </aside>
        </div>
      )}

      {showToast && <div className="toast">Added to cart, n’at 🛒</div>}

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
          backdrop-filter: blur(10px);
        }

        .brandArea {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .brand {
          align-items: center;
          gap: 8px;
          font-family: "Oswald", sans-serif;
          font-size: 18px;
          color: #fff;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .desktopBrand {
          display: flex !important;
          text-decoration: none;
        }

        .mobileBrand {
          display: none !important;
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

        .desktopLinks :global(a:hover),
        .desktopBrand:hover {
          color: #ffe600;
        }

        .cartTrigger {
          justify-self: end;
          color: #fff;
          background: none;
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-family: "Oswald", sans-serif;
          font-size: 18px;
        }

        .cartTrigger:hover {
          border-color: #2f2f2f;
          background: rgba(255, 255, 255, 0.03);
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
          top: 0;
          width: 370px;
          max-width: 100%;
          height: 100%;
          background:
            linear-gradient(
              180deg,
              rgba(255, 230, 0, 0.04),
              rgba(255, 230, 0, 0) 20%
            ),
            #090909;
          padding: 20px 18px 24px;
          overflow-y: auto;
          border-left: 1px solid #202020;
          box-shadow: -14px 0 40px rgba(0, 0, 0, 0.4);
        }

        .close {
          position: absolute;
          top: 12px;
          right: 14px;
          font-size: 22px;
          cursor: pointer;
          color: #fff;
          background: transparent;
          border: none;
        }

        .drawerHead {
          padding-right: 28px;
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h2 {
          margin: 0;
          font-size: 28px;
        }

        .emptyState {
          margin-top: 16px;
          border: 1px solid #202020;
          background: #101010;
          border-radius: 14px;
          padding: 16px;
        }

        .emptyState p {
          margin: 0;
        }

        .muted {
          color: #9a9a9a;
          margin-top: 6px !important;
        }

        .item {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 12px;
          margin-bottom: 14px;
          border: 1px solid #1f1f1f;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 14px;
          padding: 10px;
        }

        .img {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 10px;
          background: #111;
          border: 1px solid #1d1d1d;
        }

        .itemInfo {
          min-width: 0;
        }

        .itemName {
          margin: 0 0 6px;
          font-weight: 700;
          line-height: 1.35;
        }

        .itemMeta {
          margin: 0 0 4px;
          color: #bcbcbc;
          font-size: 13px;
        }

        .summary {
          margin-top: 20px;
          border-top: 1px solid #1e1e1e;
          padding-top: 18px;
        }

        .summaryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          font-size: 16px;
        }

        .checkoutBtn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          border: none;
          border-radius: 14px;
          color: #000;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(255, 230, 0, 0.16);
        }

        .checkoutBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .viewCart {
          display: block;
          margin-top: 10px;
          text-align: center;
          color: #cfcfcf;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #2a2a2a;
          background: #111;
        }

        .viewCart:hover {
          color: #ffe600;
          border-color: rgba(255, 230, 0, 0.45);
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #111;
          padding: 12px 20px;
          border: 1px solid #333;
          border-radius: 12px;
          z-index: 1200;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        }

        @media (min-width: 769px) {
          .mobileMenu {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .nav {
            padding: 16px 18px;
            grid-template-columns: 1fr auto;
          }

          .desktopBrand {
            display: none !important;
            visibility: hidden !important;
            position: absolute !important;
            pointer-events: none !important;
          }

          .mobileBrand {
            display: inline-flex !important;
            visibility: visible !important;
            position: static !important;
            pointer-events: auto !important;
          }

          .desktopLinks {
            display: none !important;
          }

          .cartTrigger {
            font-size: 16px;
          }

          .sideCart {
            width: 100%;
            border-left: none;
          }

          h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
}
