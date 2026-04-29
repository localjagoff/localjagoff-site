import { useEffect } from "react";
import Link from "next/link";

export default function SuccessPage() {
  useEffect(() => {
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>ORDER RECEIVED</h1>

        <p style={styles.subtitle}>
          You're officially less of a jagoff now.
        </p>

        <p style={styles.text}>
          Thank you for your order. We’ve received your payment and your order
          is being prepared.
        </p>

        <p style={styles.text}>
          You’ll receive an email confirmation shortly. Once your order ships,
          you’ll get another email with tracking information.
        </p>

        <p style={styles.note}>
          If there are any issues with your order, we’ll contact you using the
          email you provided at checkout.
        </p>

        <Link href="/" style={styles.button}>
          BACK TO SHOP
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  box: {
    maxWidth: "500px",
    textAlign: "center",
    border: "1px solid #222",
    padding: "40px",
    backgroundColor: "#111",
  },

  title: {
    fontSize: "32px",
    marginBottom: "10px",
    letterSpacing: "1px",
  },

  subtitle: {
    color: "yellow",
    marginBottom: "20px",
  },

  text: {
    marginBottom: "15px",
    color: "#ccc",
  },

  note: {
    marginTop: "20px",
    fontSize: "14px",
    color: "#888",
  },

  button: {
    display: "inline-block",
    marginTop: "30px",
    padding: "12px 24px",
    backgroundColor: "yellow",
    color: "#000",
    fontWeight: "bold",
    textDecoration: "none",
  },
};
