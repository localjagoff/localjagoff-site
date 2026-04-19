import Navbar from "../components/Navbar";

export default function Contact() {
  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        <h1>Contact</h1>

        <p>
          Questions, issues, or just want to say something? Reach out.
        </p>

        <h3>Email</h3>
        <p>support@localjagoff.com</p>

        <h3>Response Time</h3>
        <p>We typically respond within 24–48 hours.</p>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#000", minHeight: "100vh" },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px 20px",
    lineHeight: "1.6",
  },
};
