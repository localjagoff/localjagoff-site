export async function startCheckout(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    alert("Your cart is empty");
    return;
  }

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: cart }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    alert("Checkout failed");
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed");
  }
}
