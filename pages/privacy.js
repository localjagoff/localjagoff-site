import Navbar from "../components/Navbar";

export default function Privacy() {
  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
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

        <h3>Security</h3>
        <p>
          Payments are processed securely through Stripe. We do not store your
          payment information.
        </p>

        <h3>Contact</h3>
        <p>
          If you have any questions, reach out via the contact page.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "transparent", minHeight: "100vh" },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px 20px",
    lineHeight: "1.6",
  },
};
