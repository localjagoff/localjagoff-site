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
        <h1>ORDER RECEIVED</h1>

        <p className="success-subtitle">
          You're officially less of a jagoff now.
        </p>

        <p className="success-text">
          Thank you for your order. We’ve received your payment and your order
          is being prepared.
        </p>

        <p className="success-text">
          You’ll receive an email confirmation shortly. Once your order ships,
          you’ll get another email with tracking information.
        </p>

        <p className="success-note">
          If there are any issues with your order, we’ll contact you using the
          email you provided at checkout.
        </p>

        <Link href="/" className="success-button">
          BACK TO SHOP
        </Link>
      </main>
    </div>
  );
}
