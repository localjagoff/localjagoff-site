const crypto = require("node:crypto");
const { validEmail } = require("./customer-mail.cjs");

function secretKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("contact_security_not_configured");
  return secret;
}

function challenge(secret, now = Date.now()) {
  const payload = `${now}.${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${crypto.createHmac("sha256", secretKey(secret)).update(payload).digest("hex")}`;
}

function verifyChallenge(value, secret, now = Date.now()) {
  if (typeof value !== "string" || !/^\d{13}\.[a-f\d]{32}\.[a-f\d]{64}$/.test(value)) return false;
  const [issued, nonce, signature] = value.split(".");
  const age = now - Number(issued);
  if (age < 2000 || age > 60 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", secretKey(secret)).update(`${issued}.${nonce}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

function validateContact(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Please check your message and try again.");
  const allowed = new Set(["name", "email", "topic", "message", "orderNumber", "website", "challenge", "requestId"]);
  if (Object.keys(body).some(key => !allowed.has(key))) throw new Error("Please check your message and try again.");
  const text = (key, min, max) => {
    if (typeof body[key] !== "string" || body[key].trim().length < min || body[key].length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body[key])) throw new Error("Please check your message and try again.");
    return body[key].trim();
  };
  const name = text("name", 1, 80);
  const email = text("email", 3, 254);
  const message = text("message", 10, 4000);
  if (/[\r\n]/.test(name) || !validEmail(email) || !["order", "product", "return", "other"].includes(body.topic)) throw new Error("Please check your name, email, and topic.");
  if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(body.requestId || "")) throw new Error("Reload the form and try again.");
  const orderNumber = body.orderNumber === undefined ? "" : text("orderNumber", 0, 80);
  if (/[\r\n<>]/.test(orderNumber) || (body.website !== undefined && typeof body.website !== "string")) throw new Error("Please check your order reference.");
  return { name, email, topic: body.topic, message, orderNumber, requestId: body.requestId,
    honeypot: Boolean(body.website?.trim()) };
}

function sameOrigin(req, siteUrl) {
  try {
    const expected = new URL(siteUrl);
    if (!/^https?:$/.test(expected.protocol) || expected.username || expected.password) return false;
    return req.headers?.origin === expected.origin &&
      (!req.headers["sec-fetch-site"] || ["same-origin", "none"].includes(req.headers["sec-fetch-site"]));
  } catch { return false; }
}

function rateKey(ip, secret) {
  if (typeof ip !== "string" || !ip || ip.length > 128) throw new Error("client_address_unavailable");
  return crypto.createHmac("sha256", secretKey(secret)).update(`contact-rate:${ip}`).digest("hex");
}

module.exports = { challenge, verifyChallenge, validateContact, sameOrigin, rateKey };
