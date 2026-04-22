import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
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

    return () => {
      window.removeEventListener("cartUpdated", handler);
    };
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

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout failed");
    }
  };

  return (
    <>
      <div className="nav">
        <Link href="/" className="brand">
          LOCAL JAGOFF
        </Link>

        <button className="cartTrigger" onClick={() => setOpen(true)}>
          CART ({cart.length})
        </button>
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
                <img src={item.image} className="img" alt={item.name} />
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

              <Link href="/cart" className="viewCart">
                View Cart
              </Link>
            </div>
          </aside>
        </div>
      )}

      {showToast && <div className="toast">Added to cart, n’at 🛒</div>}

      <style jsx>{`
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 1px solid #1d1d1d;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand {
          font-family: "Oswald", sans-serif;
          font-size: 18px;
          letter-spacing: 0.5px;
        }

        .cartTrigger {
          cursor: pointer;
          color: #fff;
          background: transparent;
          border: 1px solid transparent;
          padding: 8px 12px;
          border-radius: 10px;
        }

        .cartTrigger:hover {
          border-color: #2f2f2f;
          background: rgba(255, 255, 255, 0.03);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.68);
          z-index: 999;
        }

        .sideCart {
          position: absolute;
          right: 0;
          top: 0;
          width: 360px;
          max-width: 100%;
          height: 100%;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.04), rgba(255, 230, 0, 0) 20%),
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

        .muted {
          color: #9a9a9a;
          margin-top: 6px;
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

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #111;
          padding: 12px 20px;
          border: 1px solid #333;
          border-radius: 12px;
          z-index: 1000;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        }

        @media (max-width: 768px) {
          .nav {
            padding: 14px;
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
