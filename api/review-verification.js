const crypto = require("node:crypto");
const Stripe = require("stripe");

// Temporary protected review tooling. Remove before merging the review branch.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const env = process.env;
  if (env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== "fix/checkout-draft-integrity" ||
      !/^sk_test_/.test(env.STRIPE_SECRET_KEY || "")) {
    return res.status(404).json({ error: "Not found" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const expected = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const provided = req.headers["x-commerce-verification-token"];
  if (!expected || typeof provided !== "string" || Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const origin = new URL(env.SITE_URL).origin;
    if (!origin.startsWith("https://") || !new URL(origin).hostname.endsWith(".vercel.app")) {
      return res.status(409).json({ error: "Review origin required" });
    }
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 0 });
    if (req.body?.action === "configure-test-webhook" && /^we_[A-Za-z0-9]+$/.test(req.body.endpointId || "")) {
      const endpoint = await stripe.webhookEndpoints.retrieve(req.body.endpointId);
      const current = new URL(endpoint.url);
      if (endpoint.livemode !== false || current.origin !== origin || current.pathname !== "/api/webhook") {
        return res.status(409).json({ error: "Dedicated test destination required" });
      }
      current.search = "";
      current.searchParams.set("x-vercel-protection-bypass", expected);
      const updated = await stripe.webhookEndpoints.update(endpoint.id, {
        url: current.toString(),
        enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded"],
      });
      return res.status(200).json({ id: updated.id, livemode: updated.livemode, status: updated.status,
        destination: `${origin}/api/webhook`, transport: "vercel_automation_bypass", events: updated.enabled_events });
    }
    if (req.body?.action === "inspect-test-session" && /^cs_test_[A-Za-z0-9]+$/.test(req.body.sessionId || "")) {
      const session = await stripe.checkout.sessions.retrieve(req.body.sessionId);
      if (session.livemode !== false) return res.status(409).json({ error: "Test session required" });
      const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      return res.status(200).json({ id: session.id, livemode: session.livemode, status: session.status,
        payment_status: session.payment_status, amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total, currency: session.currency,
        success_url: session.success_url, cancel_url: session.cancel_url,
        lines: lines.data.map((line) => ({ quantity: line.quantity, unit_amount: line.price?.unit_amount,
          currency: line.currency, amount_total: line.amount_total })) });
    }
    return res.status(400).json({ error: "Unsupported verification action" });
  } catch {
    return res.status(502).json({ error: "Verification provider request failed" });
  }
};
