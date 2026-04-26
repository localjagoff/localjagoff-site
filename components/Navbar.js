import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { startCheckout } from "../lib/checkout";

export default function Navbar() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const menuRef = useRef(null);
  const brandRef = useRef(null);

  const loadCart = () => {
    const c = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(c);
  };

  useEffect(() => {
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

  useEffect(() => {
    const handleClickAway = (e) => {
      if (!menuOpen) return;

      const clickedMenu = menuRef.current?.contains(e.target);
      const clickedBrand = brandRef.current?.contains(e.target);

      if (!clickedMenu && !clickedBrand) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("touchstart", handleClickAway);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("touchstart", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const updateCart = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const increaseQty = (index) => {
    const updated = [...cart];
    updated[index].quantity += 1;
    updateCart(updated);
  };

  const decreaseQty = (index) => {
    const updated = [...cart];

    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
    } else {
      updated.splice(index, 1);
    }

    updateCart(updated);
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    updateCart(updated);
  };

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cart]);

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
  }, [cart]);

  const checkout = () => {
    startCheckout(cart);
  };

  const handleBrandClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setMenuOpen((v) => !v);
      return;
    }

    window.location.href = "/";
  };

  return (
    <>
      <div className="navSpacer" />

      <header className="nav">
        <div className="brandArea">
          <button
            ref={brandRef}
            type="button"
            className="brand brandButton"
            onClick={handleBrandClick}
            aria-label="Local Jagoff navigation"
            aria-expanded={menuOpen}
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
          CART ({totalItems})
        </button>
      </header>

      <div
        ref={menuRef}
        className={`mobileMenu ${menuOpen ? "menuOpen" : ""}`}
      >
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
                <p>Cart’s empty.</p>
                <p className="muted">Fix it, jagoff.</p>
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="cartItems">
                  {cart.map((item, i) => (
                    <div
                      key={`${item.id}-${item.variant_id || "default"}-${i}`}
                      className="item"
                    >
                      <img
                        src={item.image || "/images/placeholder.jpg"}
                        className="img"
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="itemInfo">
                        <div className="itemTop">
                          <p className="itemName">{item.name}</p>

                          <button
                            type="button"
                            className="removeBtn"
                            onClick={() => removeItem(i)}
                            aria-label="Remove item"
                          >
                            ✕
                          </button>
                        </div>

                        {item.variant_name && (
                          <p className="itemMeta">
                            Size / Option: {item.variant_name}
                          </p>
                        )}

                        <p className="itemMeta">${item.price} each</p>

                        <div className="itemBottom">
                          <div className="drawerQty">
                            <button
                              type="button"
                              onClick={() => decreaseQty(i)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => increaseQty(i)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <strong className="itemTotal">
                            ${(Number(item.price) * item.quantity).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="clearCart" onClick={clearCart}>
                  Clear cart
                </button>
              </>
            )}

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
          display: inline-flex;
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

        .brand:hover {
          color: #ffe600;
        }

        .arrow {
          display: none;
          width: 8px;
          height: 8px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
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
          width: 390px;
          max-width: 100%;
          height: 100%;
          background:
            linear-gradient(
              180deg,
              rgba(255, 230, 0, 0.045),
              rgba(255, 230, 0, 0) 22%
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
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.04), transparent 28%),
            #101010;
          border-radius: 16px;
          padding: 16px;
        }

        .emptyState p {
          margin: 0;
          font-weight: 800;
        }

        .muted {
          color: #9a9a9a;
          margin-top: 6px !important;
          font-weight: 600 !important;
        }

        .cartItems {
          display: grid;
          gap: 12px;
        }

        .item {
          display: grid;
          grid-template-columns: 76px 1fr;
          gap: 12px;
          border: 1px solid #1f1f1f;
          background: rgba(255, 255, 255, 0.025);
          border-radius: 16px;
          padding: 10px;
        }

        .img {
          width: 76px;
          height: 76px;
          object-fit: contain;
          border-radius: 12px;
          background:
            radial-gradient(circle at top, rgba(255, 230, 0, 0.08), transparent 45%),
            #111;
          border: 1px solid #1d1d1d;
        }

        .itemInfo {
          min-width: 0;
        }

        .itemTop {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: start;
        }

        .itemName {
          margin: 0 0 6px;
          font-weight: 800;
          line-height: 1.3;
          font-size: 14px;
        }

        .removeBtn {
          width: 24px;
          height: 24px;
          border: 1px solid #2a2a2a;
          border-radius: 999px;
          background: #111;
          color: #888;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
        }

        .removeBtn:hover {
          color: #fff;
          border-color: #444;
        }

        .itemMeta {
          margin: 0 0 4px;
          color: #bcbcbc;
          font-size: 12px;
          line-height: 1.35;
        }

        .itemBottom {
          margin-top: 9px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .drawerQty {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0e0e0e;
          border: 1px solid #333;
          border-radius: 13px;
          padding: 4px;
        }

        .drawerQty button {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 9px;
          background: #1c1c1c;
          color: #fff;
          font-size: 17px;
          cursor: pointer;
        }

        .drawerQty button:hover {
          background: #ffe600;
          color: #000;
        }

        .drawerQty span {
          min-width: 20px;
          text-align: center;
          font-weight: 900;
          font-size: 13px;
        }

        .itemTotal {
          color: #ffe600;
          font-size: 14px;
          white-space: nowrap;
        }

        .clearCart {
          justify-self: start;
          margin-top: 2px;
          border: none;
          background: none;
          color: #888;
          cursor: pointer;
          font-weight: 800;
          padding: 8px 0;
        }

        .clearCart:hover {
          color: #fff;
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
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(255, 230, 0, 0.16);
          letter-spacing: 0.4px;
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
          font-weight: 800;
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

          .desktopLinks {
            display: none !important;
          }

          .arrow {
            display: inline-block;
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
