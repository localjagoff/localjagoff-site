const { CommerceError, positiveInteger, validateItems, resolveCart } = require("./commerce.cjs");

function couponCode(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new CommerceError("Invalid promo code");
  }
  return value;
}

function parseMetaCart(query) {
  const products = query.products;
  if (typeof products !== "string" || !products || products.length > 4096) {
    throw new CommerceError("Invalid shop cart");
  }
  const entries = products.split(",");
  if (entries.length > 100) throw new CommerceError("Invalid shop cart");
  const lines = new Map();
  // Next has decoded the query once. Accept only our exact variant-level catalog IDs.
  for (const entry of entries) {
    const match = /^lj_([1-9]\d*)_([1-9]\d*):([1-9]\d*)$/.exec(entry);
    if (!match) throw new CommerceError("Invalid shop cart");
    const id = positiveInteger(match[1], "product ID");
    const variant_id = positiveInteger(match[2], "variant ID");
    const quantity = positiveInteger(match[3], "quantity");
    const key = `${id}:${variant_id}`;
    const previous = lines.get(key);
    lines.set(key, { id, variant_id, quantity: (previous?.quantity || 0) + quantity });
  }
  return { items: validateItems([...lines.values()]), coupon: couponCode(query.coupon) };
}

async function resolveMetaCart(query, options) {
  const input = parseMetaCart(query);
  const items = await resolveCart(input.items, options);
  return { items: items.map(item => ({ ...item, price: (item.unit_amount / 100).toFixed(2) })),
    coupon: input.coupon };
}

module.exports = { couponCode, parseMetaCart, resolveMetaCart };
