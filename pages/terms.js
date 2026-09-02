import Navbar from "../components/Navbar";

export default function Terms() {
  return (
    <div className="legal-page">
      <Navbar />

      <main className="legal-card">
        <h1>Terms & Conditions</h1>

        <p>
          By using this site, you agree to the following terms.
        </p>

        <h3>Orders</h3>
        <p>
          All orders are subject to availability. We reserve the right to cancel
          or refuse any order.
        </p>

        <h3>Pricing</h3>
        <p>
          Prices are listed in USD and may change without notice.
        </p>

        <h3>Returns and Refunds</h3>
        <p>
          Because our items are made to order, returns or exchanges are only
          accepted for damaged, defective, incorrect, or misprinted items.
        </p>
        <p>
          If there is an issue with your order, please contact us within 14 days
          of delivery with your order number and photos of the issue.
        </p>
        <p>
          Approved returns are accepted by mail only. Return shipping is the
          customer&apos;s responsibility unless the item was damaged, defective,
          incorrect, or misprinted.
        </p>
        <p>
          We do not charge a restocking fee.
        </p>
        <p>
          If a refund is approved, it will be processed back to the original
          payment method. Please allow 5–10 business days for the refund to
          appear, depending on your bank or card issuer.
        </p>
        <p>
          Local Jagoff reserves the right to deny return or refund requests that
          do not meet this policy.
        </p>

        <h3>Use of Site</h3>
        <p>
          You agree not to misuse the site or attempt to disrupt its operation.
        </p>

        <h3>Contact</h3>
        <p>
          For any concerns, please use the contact page.
        </p>
      </main>
    </div>
  );
}
