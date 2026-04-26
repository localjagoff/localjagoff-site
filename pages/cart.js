import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { startCheckout } from "../lib/checkout";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

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

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const checkout = () => {
    startCheckout(cart);
  };

  return (
    <div className="cart-page">
      <Navbar />

      <main className="cart-wrap">
        <div className="cart-head">
          <div>
            <p className="eyebrow">YOUR JAGOFF STASH</p>
            <h1>Your Cart</h1>
          </div>

          <Link href="/" className="continue-link">
            ← Keep browsing
          </Link>
        </div>

        {cart.length === 0 ? (
          <section className="empty-card">
            <h2>Cart’s empty.</h2>
            <p>Fix it, jagoff.</p>
            <Link href="/" className="primary-link">
              Go find something
            </Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {cart.map((item, i) => (
                <article key={`${item.id}-${item.variant_id || "default"}-${i}`} className="cart-item">
                  <div className="image-wrap">
                    <img
                      src={item.image || "/images/placeholder.jpg"}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="item-info">
                    <h3>{item.name}</h3>

                    {item.variant_name && (
                      <p className="variant">Size / Option: {item.variant_name}</p>
                    )}

                    <p className="item-price">${item.price}</p>

                    <div className="item-actions">
                      <div className="qty">
                        <button type="button" onClick={() => decreaseQty(i)} aria-label="Decrease quantity">
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => increaseQty(i)} aria-label="Increase quantity">
                          +
                        </button>
                      </div>

                      <button type="button" className="remove" onClick={() => removeItem(i)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="line-total">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </div>
                </article>
              ))}

              <button type="button" className="clear-cart" onClick={clearCart}>
                Clear cart
              </button>
            </section>

            <aside className="summary-card">
              <p className="summary-kicker">ORDER SUMMARY</p>

              <div className="summary-row">
                <span>Subtotal</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <p className="summary-note">
                Shipping and taxes are calculated at checkout.
              </p>

              <button
                type="button"
                className="checkout-btn"
                onClick={checkout}
                disabled={cart.length === 0}
              >
                CHECKOUT
              </button>

              <Link href="/" className="secondary-link">
                Keep shopping
              </Link>
            </aside>
          </div>
        )}
      </main>

      <style jsx>{`
        .cart-page {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.08), transparent 28%),
            radial-gradient(circle at right 18%, rgba(255, 255, 255, 0.04), transparent 20%),
            #000;
        }

        .cart-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 44px;
        }

        .cart-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .eyebrow,
        .summary-kicker {
          margin: 0 0 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 0;
          font-size: 38px;
          line-height: 1;
        }

        .continue-link,
        .secondary-link {
          color: #cfcfcf;
          border: 1px solid #2a2a2a;
          background: rgba(255, 255, 255, 0.025);
          border-radius: 14px;
          padding: 11px 14px;
          font-weight: 800;
          text-decoration: none;
          transition:
            color 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .continue-link:hover,
        .secondary-link:hover {
          color: #ffe600;
          border-color: rgba(255, 230, 0, 0.45);
          background: rgba(255, 230, 0, 0.04);
        }

        .empty-card {
          border: 1px solid #242424;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.04), transparent 28%),
            #111;
          padding: 28px;
          max-width: 560px;
        }

        .empty-card h2 {
          margin: 0 0 8px;
          font-size: 30px;
        }

        .empty-card p {
          color: #aaa;
          margin: 0 0 20px;
        }

        .primary-link {
          display: inline-flex;
          border-radius: 15px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          font-weight: 900;
          padding: 14px 18px;
          text-decoration: none;
        }

        .cart-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
          align-items: start;
        }

        .cart-list {
          display: grid;
          gap: 14px;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 110px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          border: 1px solid #242424;
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.035), rgba(255, 230, 0, 0) 25%),
            rgba(17, 17, 17, 0.96);
          padding: 14px;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
        }

        .image-wrap {
          width: 110px;
          height: 110px;
          border-radius: 16px;
          border: 1px solid #1f1f1f;
          background:
            radial-gradient(circle at top, rgba(255, 230, 0, 0.08), transparent 45%),
            #0b0b0b;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .item-info {
          min-width: 0;
        }

        h3 {
          margin: 0 0 7px;
          font-size: 18px;
          line-height: 1.2;
        }

        .variant {
          margin: 0 0 7px;
          color: #aaa;
          font-size: 13px;
          font-weight: 700;
        }

        .item-price {
          margin: 0 0 12px;
          color: #ffe600;
          font-weight: 900;
        }

        .item-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .qty {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0e0e0e;
          border: 1px solid #333;
          border-radius: 14px;
          padding: 5px;
        }

        .qty button {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 10px;
          background: #1c1c1c;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .qty button:hover {
          background: #ffe600;
          color: #000;
        }

        .qty span {
          min-width: 24px;
          text-align: center;
          font-weight: 900;
        }

        .remove,
        .clear-cart {
          border: none;
          background: none;
          color: #888;
          cursor: pointer;
          font-weight: 800;
          padding: 8px 0;
        }

        .remove:hover,
        .clear-cart:hover {
          color: #fff;
        }

        .line-total {
          color: #fff;
          font-weight: 900;
          font-size: 18px;
          white-space: nowrap;
        }

        .clear-cart {
          justify-self: start;
          margin-top: 4px;
        }

        .summary-card {
          position: sticky;
          top: 92px;
          border: 1px solid #242424;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.045), rgba(255, 230, 0, 0) 24%),
            rgba(17, 17, 17, 0.96);
          padding: 22px;
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid #252525;
          border-bottom: 1px solid #252525;
          margin-bottom: 14px;
        }

        .summary-row span {
          color: #cfcfcf;
          font-weight: 800;
        }

        .summary-row strong {
          font-size: 28px;
        }

        .summary-note {
          color: #aaa;
          font-size: 13px;
          line-height: 1.45;
          margin: 0 0 16px;
        }

        .checkout-btn {
          width: 100%;
          border: none;
          border-radius: 16px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          font-weight: 900;
          font-size: 15px;
          padding: 16px 18px;
          cursor: pointer;
          letter-spacing: 0.7px;
          box-shadow: 0 12px 26px rgba(255, 230, 0, 0.2);
          margin-bottom: 10px;
        }

        .checkout-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 16px 30px rgba(255, 230, 0, 0.25);
        }

        .checkout-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .secondary-link {
          display: block;
          text-align: center;
        }

        @media (max-width: 900px) {
          .cart-layout {
            grid-template-columns: 1fr;
          }

          .summary-card {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .cart-wrap {
            padding: 24px 14px 34px;
          }

          .cart-head {
            align-items: flex-start;
            flex-direction: column;
          }

          h1 {
            font-size: 34px;
          }

          .continue-link {
            width: 100%;
            text-align: center;
          }

          .cart-item {
            grid-template-columns: 92px minmax(0, 1fr);
            align-items: start;
          }

          .image-wrap {
            width: 92px;
            height: 92px;
          }

          .line-total {
            grid-column: 2;
            font-size: 16px;
          }

          h3 {
            font-size: 16px;
          }

          .summary-card {
            border-radius: 20px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
