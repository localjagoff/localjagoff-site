import { getTracker } from './meta-pixel.cjs';

export async function startCheckout(cart, coupon) {
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
      body: JSON.stringify({ items: cart, measurement_consent: getTracker()?.allowed() === true, ...(coupon ? { coupon } : {}) }),
    });

    const data = await res.json();

    if (data.url) {
      if (getTracker()?.initiateCheckout(data.measurement_items)) {
        await new Promise(resolve => window.setTimeout(resolve, 180));
      }
      window.location.href = data.url;
      return;
    }

    alert(data.error || "Checkout failed");
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed");
  }
}
