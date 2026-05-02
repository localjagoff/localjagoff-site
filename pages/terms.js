import Navbar from "../components/Navbar";

export default function Terms() {
  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
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

        <h3>Returns</h3>
        <p>
          All sales are final unless an item arrives damaged or incorrect.
        </p>

        <h3>Use of Site</h3>
        <p>
          You agree not to misuse the site or attempt to disrupt its operation.
        </p>

        <h3>Contact</h3>
        <p>
          For any concerns, please use the contact page.
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
