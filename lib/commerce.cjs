const { STORE_ID, HIDDEN_PRODUCT_IDS, getDisplayProductName } = require("./commerce-policy.cjs");

class CommerceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function positiveInteger(value, label) {
  if (!((typeof value === "number") || (typeof value === "string" && /^[1-9]\d*$/.test(value))) ||
      !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new CommerceError(`Invalid ${label}`);
  }
  return Number(value);
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new CommerceError("Invalid items");
  }
  return items.map((item) => {
    const id = positiveInteger(item?.id, "product ID");
    const variant_id = positiveInteger(item?.variant_id, "variant ID");
    const quantity = positiveInteger(item?.quantity, "quantity");
    if (quantity > 99) throw new CommerceError("Maximum quantity is 99 per cart line");
    if (HIDDEN_PRODUCT_IDS.has(id)) throw new CommerceError("Product is unavailable");
    return { id, variant_id, quantity };
  });
}

function priceCents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new CommerceError("Product price is unavailable", 503);
  }
  const [whole, fraction = ""] = String(value).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 99999999) {
    throw new CommerceError("Product price is unavailable", 503);
  }
  return cents;
}

async function printfulRequest(path, { fetchImpl = fetch, apiKey, method = "GET", body } = {}) {
  if (!apiKey) throw new CommerceError("Printful is not configured", 503);
  let response;
  try {
    response = await fetchImpl(`https://api.printful.com${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-PF-Store-Id": STORE_ID },
      signal: AbortSignal.timeout(10000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new CommerceError("Printful request unavailable", 503);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new CommerceError(`Printful HTTP ${response.status}`, 503);
  const data = await response.json().catch(() => null);
  if (!data?.result || (data.code && data.code !== 200 && data.code !== 201)) {
    throw new CommerceError("Invalid Printful response", 503);
  }
  return data.result;
}

async function resolveCart(items, options) {
  const clean = validateItems(items);
  // Reject oversized metadata before spending upstream requests on an unusable cart.
  encodeItems(clean.map((item) => ({ ...item, unit_amount: 0 })));
  const products = new Map();
  const resolved = [];
  for (const item of clean) {
    if (!products.has(item.id)) {
      products.set(item.id, await printfulRequest(`/sync/products/${item.id}?store_id=${STORE_ID}`, options));
    }
    const result = products.get(item.id);
    const product = result?.sync_product;
    if (!product || Number(product.id) !== item.id || product.is_ignored === true) {
      throw new CommerceError("Product is unavailable");
    }
    const variant = result.sync_variants?.find((v) => Number(v.id) === item.variant_id);
    if (!variant || Number(variant.sync_product_id) !== item.id ||
        variant.synced !== true || variant.is_ignored === true ||
        variant.availability_status !== "active") {
      throw new CommerceError("Variant is unavailable");
    }
    // Empty currency is returned by some USD sync stores; explicit non-USD is unsafe.
    if (variant.currency && variant.currency.toUpperCase() !== "USD") {
      throw new CommerceError("Product currency is unavailable", 503);
    }
    resolved.push({ ...item, unit_amount: priceCents(variant.retail_price),
      name: getDisplayProductName(product), variant_name: variant.name || "Default",
      image: product.thumbnail_url || null });
  }
  return resolved;
}

function encodeItems(items) {
  const metadata = JSON.stringify(items.map((i) => [i.id, i.variant_id, i.quantity, i.unit_amount]));
  if (metadata.length > 500) throw new CommerceError("Cart has too many distinct items; split it into smaller orders");
  return metadata;
}

function siteOrigin(env) {
  const value = env.SITE_URL || "https://www.localjagoff.com";
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new CommerceError("Invalid site configuration", 503);
  }
  return url.origin;
}

function assertCheckoutEnvironment(env) {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production" && /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || "")) {
    throw new CommerceError("Live checkout is disabled outside production", 503);
  }
}

module.exports = { CommerceError, positiveInteger, validateItems, priceCents, printfulRequest,
  resolveCart, encodeItems, siteOrigin, assertCheckoutEnvironment };
