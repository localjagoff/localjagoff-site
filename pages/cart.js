import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity;
  }, 0);

  const updateQty = (index, amount) => {
    const updated = [...cart];
    updated[index].quantity = Math.max(1, updated[index].quantity + amount);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  return (
    <div className="page">
      <Navbar />

      <main className="wrap">
        <h1>Your Cart</h1>

        {cart.length === 0 ? (
          <p className="empty">Cart’s empty. Fix it jagoff.</p>
        ) : (
          <>
            <div className="list">
              {cart.map((item, i) => (
                <div key={i} className="item">
                  <img src={item.image} alt={item.name} />

                  <div className="info">
                    <h3>{item.name}</h3>

                    {item.variant_name && (
                      <p className="variant">Size: {item.variant_name}</p>
                    )}

                    <p className="price">${item.price}</p>

                    <div className="qty">
                      <button onClick={() => updateQty(i, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(i, 1)}>+</button>
                    </div>

                    <button className="remove" onClick={() => removeItem(i)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary">
              <p>Total</p>
              <strong>${total.toFixed(2)}</strong>

              <button className="checkout">
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .page {
          background: #000;
          color: #fff;
          min-height: 100vh;
        }

        .wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        h1 {
          margin-bottom: 20px;
        }

        .empty {
          color: #ccc;
        }

        .list {
          display: grid;
          gap: 16px;
        }

        .item {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 14px;
          border: 1px solid #222;
          border-radius: 12px;
          padding: 12px;
          background: #111;
        }

        img {
          width: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .info h3 {
          margin: 0;
          font-size: 16px;
        }

        .variant {
          color: #aaa;
          font-size: 13px;
        }

        .price {
          color: #ffe600;
          margin: 6px 0;
        }

        .qty {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .qty button {
          width: 28px;
          height: 28px;
          background: #222;
          color: #fff;
          border: none;
          cursor: pointer;
        }

        .remove {
          margin-top: 8px;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 12px;
        }

        .summary {
          margin-top: 30px;
          border-top: 1px solid #222;
          padding-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .checkout {
          background: #ffe600;
          color: #000;
          border: none;
          padding: 12px 18px;
          font-weight: bold;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
