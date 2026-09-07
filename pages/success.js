import { useEffect } from "react";
import Link from "next/link";

export default function SuccessPage() {
  useEffect(() => {
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
  }, []);

  return (
    <div className="success-page">
      <main className="success-card">
        <h1>CHECKOUT RETURN</h1>

        <p className="success-subtitle">
          Thanks for repping Local Jagoff.
        </p>

        <p className="success-text">
          Your payment is confirmed by Stripe, not by this page. Check your
          inbox for your paid-order confirmation before placing another order.
        </p>

        <p className="success-text">
          After payment is confirmed, we prepare your order and send tracking
          as each package ships.
        </p>

        <p className="success-note">
          Missing a confirmation or need a hand? Email hello@localjagoff.com
          using the address you entered at checkout.
        </p>

        <Link href="/" className="success-button">
          BACK TO SHOP
        </Link>
      </main>
    </div>
  );
}
