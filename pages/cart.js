import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { startCheckout } from "../lib/checkout";

export default function CartPage({ transfer = null, transferError = null }) {
  const [cart, setCart] = useState(transfer?.items || []);

  useEffect(() => {
    if (transferError) return;
    if (transfer) {
      setCart(transfer.items);
      try { localStorage.setItem("cart", JSON.stringify(transfer.items)); } catch {}
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { silent: true } }));
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("cart"));
      setCart(Array.isArray(stored) ? stored : []);
    } catch { setCart([]); }
  }, [transfer, transferError]);

  const updateCart = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { silent: true } }));
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { silent: Boolean(transfer) } }));
  };

  const increaseQty = (index) => {
    const updated = [...cart];
    updated[index].quantity = Math.min(99, Number(updated[index].quantity) + 1);
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
    startCheckout(cart, transfer?.coupon);
  };

  return (
    <div className="cart-page">
      <Navbar checkoutCoupon={transfer?.coupon} />

      <main id="main-content" className="cart-wrap">
        <div className="cart-head">
          <div>
            <p className="eyebrow">YOUR JAGOFF STASH</p>
            <h1>Your Cart</h1>
          </div>

          <Link href="/" className="continue-link">
            ← Keep browsing
          </Link>
        </div>

        {transferError ? (
          <section className="empty-card" role="alert">
            <h2>Cart unavailable</h2>
            <p>{transferError}</p>
            <Link href="/" className="primary-link">Return to the store</Link>
          </section>
        ) : cart.length === 0 ? (
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
              {transfer?.coupon && <p className="summary-note">
                Promo code: <strong>{transfer.coupon}</strong>. Eligibility and final discount
                are confirmed at secure checkout.
              </p>}

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


    </div>
  );
}
