import Navbar from "../components/Navbar";

export default function Contact() {
  return (
    <div className="legal-page">
      <Navbar />

      <main className="legal-card">
        <h1>Contact</h1>

        <p>
          Questions, issues, or just want to say something? Reach out.
        </p>

        <h3>Email</h3>
        <p><a href="mailto:Info@localjagoff.com">Info@localjagoff.com</a></p>

        <h3>Response Time</h3>
        <p>We typically respond within 24–48 hours.</p>
      </main>
    </div>
  );
}
