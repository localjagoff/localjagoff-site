const STORE_ID = "18032822";
const HIDDEN_PRODUCT_IDS = new Set();
const { PRODUCTS } = require('./product-merchandising.cjs');
// Existing owner-curated products only. New Printful syncs require explicit approval.
const APPROVED_PRODUCT_IDS = new Set([
  430964873,429821634,429728777,429536493,429208592,428983169,
  428982889,428980566,428851907,428851698,428851608,428851513,428821578,
]);
function getDisplayProductName(product) {
  return PRODUCTS[Number(product?.id)]?.name ||
    String(product?.name || "Local Jagoff Product").trim() || "Local Jagoff Product";
}
function productVisible(product) {
  return Number.isSafeInteger(Number(product?.id)) && Number(product.id) > 0 &&
    APPROVED_PRODUCT_IDS.has(Number(product.id)) &&
    !HIDDEN_PRODUCT_IDS.has(Number(product.id)) && product.is_ignored === false;
}

function variantUnavailableReason(product, variant) {
  if (!productVisible(product) || !variant || !Number.isSafeInteger(Number(variant.id)) ||
      Number(variant.id) < 1 || Number(variant.sync_product_id) !== Number(product.id) ||
      variant.synced !== true || variant.is_ignored !== false ||
      variant.availability_status !== "active") return "availability";
  if (variant.currency !== "USD") return "currency";
  if (amountCents(variant.retail_price) === null) return "price";
  return null;
}

function amountCents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return null;
  const [whole, fraction = ""] = String(value).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 99999999 ? cents : null;
}

function detectCategory(name) {
  const words = String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ");
  if (words.includes("724")) return "724";
  if (words.some(w => /^(hoodies?|pullovers?|sweatshirts?|crewnecks?|fleece)$/.test(w))) return "hoodies";
  if (words.some(w => /^(hats?|caps?|trucker|beanies?)$/.test(w))) return "hats";
  if (words.some(w => /^(tees?|tshirts?|shirts?|tanks?)$/.test(w))) return "tees";
  return "other";
}

function variantLabel(product, variant) {
  const name = String(variant.name || "Default");
  if (name === product.name) return [variant.color, variant.size].filter(Boolean).join(' / ') || 'Default';
  return name.startsWith(product.name + " / ") ? name.slice(product.name.length + 3) : name;
}

module.exports = { STORE_ID, HIDDEN_PRODUCT_IDS, APPROVED_PRODUCT_IDS, getDisplayProductName,
  productVisible, variantUnavailableReason, amountCents, detectCategory, variantLabel };
