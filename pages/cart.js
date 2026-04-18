import { useEffect, useState } from "react";

export default function CartPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(stored);
  }, []);

  const removeItem = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const getTotal = () => {
    return cart
      .reduce((sum, item) => sum + Number(item.price), 0)
      .toFixed(2);
  };

  const checkoutAll = async () => {
    if (cart.length === 0) return;

    // For now: checkout first item (we will scale this properly later)
    const item = cart[0];

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${item.name} (${item.size})`,
        price: item.price,
        variantId: item.variantId,
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>YOUR CART</h1>

      {cart.length === 0 ? (
        <p style={styles.empty}>Your cart is empty</p>
      ) : (
        <>
          {cart.map((item, index) => (
            <div key={index} style={styles.item}>
              <div>
                <h2>{item.name}</h2>
                <p>Size: {item.size}</p>
                <p>${item.price}</p>
              </div>

              <button
                style={styles.remove}
                onClick={() => removeItem(index)}
              >
                REMOVE
              </button>
            </div>
          ))}

          <div style={styles.summary}>
            <h2>Total: ${getTotal()}</h2>

            <button style={styles.checkout} onClick={checkoutAll}>
              CHECKOUT
            </button>

            <button style={styles.clear} onClick={clearCart}>
              CLEAR CART
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
  },

  title: {
    fontSize: "32px",
    marginBottom: "20px",
  },

  empty: {
    color: "#aaa",
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #222",
    padding: "15px 0",
  },

  remove: {
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    cursor: "pointer",
  },

  summary: {
    marginTop: "30px",
  },

  checkout: {
    width: "100%",
    padding: "15px",
    backgroundColor: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
    marginBottom: "10px",
    cursor: "pointer",
  },

  clear: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
};
