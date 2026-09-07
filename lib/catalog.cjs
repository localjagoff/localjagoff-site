const { STORE_ID, HIDDEN_PRODUCT_IDS, APPROVED_PRODUCT_IDS, productVisible, variantUnavailableReason,
  amountCents, getDisplayProductName, detectCategory, variantLabel } = require("./commerce-policy.cjs");
const { CommerceError, positiveInteger, printfulRequest } = require("./commerce.cjs");
const productImages = require("./product-images.cjs");

function curateProduct(result, expectedId) {
  const product = result?.sync_product;
  if (!product || Number(product.id) !== Number(expectedId)) {
    throw new CommerceError("Invalid catalog response", 503);
  }
  if (!productVisible(product)) return null;
  if (!Array.isArray(result.sync_variants)) throw new CommerceError("Invalid variants", 503);
  const ids = new Set();
  const variants = result.sync_variants.filter(v => !variantUnavailableReason(product, v)).map(v => {
    if (ids.has(Number(v.id))) throw new CommerceError("Duplicate catalog variant", 503);
    ids.add(Number(v.id));
    const unit_amount = amountCents(v.retail_price);
    return { id: Number(v.id), name: variantLabel(product, v), price: (unit_amount / 100).toFixed(2),
      unit_amount, currency: "USD", availability: "in stock", size: String(v.size || ""),
      color: String(v.color || ""), sku: String(v.sku || "") };
  });
  if (!variants.length) return null;
  const images = productImages[product.id] || (product.thumbnail_url ? [product.thumbnail_url] : []);
  if (!images.length) return null;
  const name = getDisplayProductName(product);
  return { id: Number(product.id), name, thumbnail_url: images[0], images,
    retail_price: (Math.min(...variants.map(v => v.unit_amount)) / 100).toFixed(2),
    currency: "USD", availability: "in stock", variants, category: detectCategory(name),
    description: `${name} from Local Jagoff. Made to order. Choose your size or style on our website.` };
}

async function loadProduct(id, options = {}) {
  id = positiveInteger(id, "product ID");
  if (HIDDEN_PRODUCT_IDS.has(id) || !APPROVED_PRODUCT_IDS.has(id)) return null;
  const result = await printfulRequest(`/sync/products/${id}?store_id=${STORE_ID}`, options);
  return result ? curateProduct(result, id) : null;
}

async function loadCatalog(options = {}) {
  const ids = new Set();
  let offset = 0;
  // Require complete pagination. Never publish a successful partial feed.
  for (let page = 0; page < 5; page++) {
    const data = await printfulRequest(`/sync/products?store_id=${STORE_ID}&limit=100&offset=${offset}`,
      { ...options, envelope: true });
    if (!Array.isArray(data?.result) || !Number.isSafeInteger(data?.paging?.total) ||
        data.paging.total < 0 || data.paging.offset !== offset) {
      throw new CommerceError("Invalid catalog pagination", 503);
    }
    for (const product of data.result) {
      const id = positiveInteger(product.id, "catalog product ID");
      if (ids.has(id)) throw new CommerceError("Repeated catalog page", 503);
      ids.add(id);
    }
    offset += data.result.length;
    if (offset === data.paging.total) break;
    if (!data.result.length || offset > data.paging.total || page === 4) {
      throw new CommerceError("Incomplete catalog response", 503);
    }
  }
  const pending = [...ids].filter(id => !HIDDEN_PRODUCT_IDS.has(id) && APPROVED_PRODUCT_IDS.has(id));
  if (pending.length > 24) throw new CommerceError("Catalog requires a staged snapshot refresh", 503);
  const products = [];
  // Bound upstream concurrency; a failed detail aborts this entire snapshot.
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (pending.length) {
      const id = pending.shift();
      const product = await loadProduct(id, options);
      if (product) products.push(product);
    }
  }));
  return products.sort((a, b) => b.id - a.id);
}

let snapshot;
let expires = 0;
let pendingSnapshot;
async function getCatalog() {
  if (snapshot && Date.now() < expires) return snapshot;
  if (!pendingSnapshot) {
    pendingSnapshot = loadCatalog({ apiKey: process.env.PRINTFUL_API_KEY }).then(products => {
      snapshot = products; expires = Date.now() + 60000; return products;
    }).finally(() => { pendingSnapshot = null; });
  }
  return pendingSnapshot;
}

function metaRows(products, origin) {
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid catalog origin");
  const seen = new Set();
  return products.flatMap(p => p.variants.map(v => {
    const id = `lj_${p.id}_${v.id}`;
    if (seen.has(id)) throw new Error("Duplicate feed ID");
    seen.add(id);
    return { id, item_group_id: `lj_${p.id}`, title: `${p.name} - ${v.name}`,
      description: p.description, availability: v.availability, condition: "new",
      price: `${v.price} USD`, link: `${url.origin}/product/${p.id}?variant=${v.id}`,
      image_link: new URL(p.images[0], url.origin).href,
      additional_image_link: p.images.slice(1).map(image => new URL(image, url.origin).href).join(","),
      brand: "Local Jagoff", size: v.size, color: v.color };
  }));
}

function feedCsv(rows) {
  const headers = ["id", "item_group_id", "title", "description", "availability", "condition", "price",
    "link", "image_link", "additional_image_link", "brand", "size", "color"];
  const field = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers, ...rows.map(row => headers.map(key => row[key]))]
    .map(row => row.map(field).join(",")).join("\r\n") + "\r\n";
}

module.exports = { curateProduct, loadProduct, loadCatalog, getCatalog, metaRows, feedCsv };
