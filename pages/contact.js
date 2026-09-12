import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/Contact.module.css";

export default function Contact() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [challenge, setChallenge] = useState("");
  const [preview, setPreview] = useState(false);
  const requestId = useRef("");
  const result = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    requestId.current = crypto.randomUUID();
    fetch("/api/contact", { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.challenge) throw new Error("challenge_unavailable");
        setChallenge(data.challenge);
        setPreview(data.preview === true);
      })
      .catch(() => setError("The form is temporarily unavailable. Email us directly at hello@localjagoff.com."))
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  useEffect(() => {
    if (status === "sent" || status === "error") result.current?.focus();
  }, [status]);

  async function send(event) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, challenge, requestId: requestId.current }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't send that. Please try again or email us directly.");
      setStatus("sent");
      setPreview(data.preview === true);
      form.reset();
    } catch (failure) {
      setStatus("error");
      setError(failure.name === "AbortError" || failure instanceof TypeError
        ? "Connection interrupted. Retry this message or email hello@localjagoff.com."
        : failure.message || "We couldn't send that. Please try again or email us directly.");
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>Contact Local Jagoff | Orders & Support</title>
        <meta name="description" content="An order question, a gear issue, or something else? Talk to Local Jagoff at hello@localjagoff.com." key="description" />
      </Head>
      <Navbar />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <header className={styles.heading}>
          <img src="/images/icon.png" alt="" width="80" height="80" />
          <div><p className={styles.eyebrow}>LOCAL JAGOFF / SUPPORT</p><h1>LET'S SORT IT OUT.</h1></div>
        </header>
        <div className={styles.layout}>
          <aside className={styles.details}>
            <h2>Real questions.<br /><span>Real answers.</span></h2>
            <p>Order question? Gear not right? Tell us what's up.</p>
            <div className={styles.direct}><span>DIRECT LINE</span><a href="mailto:hello@localjagoff.com">hello@localjagoff.com</a><p>We typically reply within 24-48 hours.</p></div>
            <p className={styles.note}>For an order issue, include your reference number. Keep payment details and passwords out of your message.</p>
            <Link href="/terms">Returns & order policy</Link>
          </aside>
          <section className={styles.formArea} aria-labelledby="message-heading">
            <h2 id="message-heading">SEND A MESSAGE</h2>
            {status === "sent" ? <div className={styles.success} ref={result} tabIndex={-1} role="status"><h3>{preview ? "Preview message recorded." : "Message received."}</h3><p>{preview ? "No email was sent. For real support, email hello@localjagoff.com." : "We'll get back to you at the email you provided. No need to send it twice."}</p><Link href="/">Back to the shop</Link></div> : <form onSubmit={send}>
              {preview && <p className={styles.note}>Preview only. Messages here are not delivered.</p>}
              <div className={styles.row}>
                <label>Your name<input name="name" autoComplete="name" maxLength={80} required /></label>
                <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
              </div>
              <label>What's this about?<select name="topic" value={topic} onChange={e => setTopic(e.target.value)} required><option value="">Choose a topic</option><option value="order">My order</option><option value="product">Product question</option><option value="return">Something isn't right</option><option value="other">Something else</option></select></label>
              {(topic === "order" || topic === "return") && <label>Order reference <span>(optional)</span><input name="orderNumber" maxLength={80} autoComplete="off" placeholder="From your confirmation email" /></label>}
              <label>Your message<textarea name="message" rows={6} minLength={10} maxLength={4000} required /></label>
              <div className={styles.trap} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <p className={styles.privacy}>Your details are used to answer your message, not sign you up for marketing. <Link href="/privacy">Privacy policy</Link></p>
              <div ref={result} tabIndex={-1} role="status" aria-live="polite" className={error ? styles.error : undefined}>{error}</div>
              <button className={styles.send} type="submit" disabled={!challenge || status === "sending"}>{status === "sending" ? "SENDING..." : "SEND MESSAGE"}</button>
            </form>}
          </section>
        </div>
      </main>
    </div>
  );
}
