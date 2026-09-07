import Navbar from "../components/Navbar";

export default function Privacy() {
  return (
    <div className="legal-page">
      <Navbar />

      <main className="legal-card">
        <h1>Privacy Policy</h1>

        <p>
          We respect your privacy. Any information you provide is used solely to
          process orders and improve your experience.
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

        <h3>Contact</h3>
        <p>
          If you have any questions, email <a href="mailto:hello@localjagoff.com">hello@localjagoff.com</a> or reach out via the contact page.
        </p>
      </main>
    </div>
  );
}
