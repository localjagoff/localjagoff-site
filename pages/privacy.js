import Navbar from "../components/Navbar";

export default function Privacy() {
  return (
    <div className="legal-page">
      <Navbar />

      <main className="legal-card">
        <h1>Privacy Policy</h1>

        <p>
          We use information to process orders, provide support, and, only when
          you allow optional Meta cookies, measure shopping activity as described below.
        </p>

        <h3>Information We Collect</h3>
        <p>
          When you make a purchase, we collect your name, email, shipping
          address, and payment details through secure third-party providers.
        </p>

        <h3>How We Use It</h3>
        <p>
          Your information is used to fulfill orders, provide support, and
          communicate updates related to your purchase.
        </p>

        <h3>Messages and Reviews</h3>
        <p>
          Contact messages include the name, email, topic, message, and optional
          order reference you provide. We use Resend to send store email and Neon
          to hold communication and review records. A keyed, non-public hash of
          your network address helps limit spam; the contact service does not log
          message contents or raw network addresses.
        </p>
        <p>
          Purchase-linked reviews are optional. Only your chosen public name,
          rating, and review are displayed after moderation. Your email, shipping
          address, order reference, and private review link are not published.
          Moderation checks for abuse and personal information, not positive ratings.
        </p>
        <h3>Retention and Requests</h3>
        <p>
          Completed communication payloads are cleared from our delivery queue
          after 30 days. Customer email and invitation links are cleared from
          inactive, resolved communication records after 180 days when no job or
          invitation remains outstanding. Unresolved records are retained for
          follow-up. Public reviews and delivery deduplication records remain
          until removed through an appropriate support request. Mailbox and
          payment or fulfillment provider records have separate retention policies.
          Contact hello@localjagoff.com to request access, correction, or removal.
        </p>

        <h3>Security</h3>
        <p>
          Payments are processed securely through Stripe. We do not store your
          payment information.
        </p>

        <h3>Optional Meta Cookies</h3>
        <p>
          With your permission, Meta Pixel receives visits and product-view,
          add-to-cart, checkout, and verified purchase events from our storefront.
          Events include product identifiers, quantities, currency and value, along
          with browser and network information Meta receives when its script connects.
          Meta may use this data for measurement, personalized content and advertising.
          We do not include your name, email, shipping address or payment details in
          these events, and automatic advanced matching is off.
        </p>
        <p>
          Optional Meta tracking is off until you choose Allow Meta cookies. Use
          Cookie choices at the bottom of our pages to decline or withdraw consent.
          We honor Global Privacy Control and Do Not Track signals by keeping this
          tracking off. Declining does not prevent shopping or checkout. Blocking
          cookies or changing browsers may require you to set your choice again.
          Private review and administration pages do not initialize the Pixel.
        </p>
        <p>
          Our choice and recent purchase-event deduplication records are stored in
          your browser. A secure, HttpOnly checkout-verification cookie lasts up to
          24 hours and is used only by our paid-status endpoint, not sent to Meta.
          See <a href="https://www.facebook.com/privacy/policy/">Meta's Privacy Policy</a>
          {' '}and <a href="https://optout.aboutads.info/">industry advertising choices</a>
          {' '}for additional information and controls.
        </p>

        <h3>Contact</h3>
        <p>
          If you have any questions, email <a href="mailto:hello@localjagoff.com">hello@localjagoff.com</a> or reach out via the contact page.
        </p>
      </main>
    </div>
  );
}
