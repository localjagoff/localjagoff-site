const STORE_ID = "18032822";
const HIDDEN_PRODUCT_IDS = new Set([430925200]);
const PRODUCT_NAME_OVERRIDES = {
  428550417: "Certified Jagoff T-Shirt",
  428821578: "Pittsburgh Local Jagoff Keystone Hoodie",
  428851513: "Local Jagoff 412 Sideways Tee",
  428851608: "Local Jagoff Steel City Front and Back Tee",
  428851698: "Local Jagoff Keystone 412 Tee",
  428851907: "Local Jagoff Trucker Cap",
  428980566: "Local Jagoff Trucker Hat",
  428982889: "Local Jagoff Keystone Tee",
  428983169: "Local Jagoff Keystone 412 Hoodie",
  429208592: "Local Jagoff Keystone Hoodie",
  429536493: "Local Jagoff 412 Tee",
  429728777: "Local Jagoff Stamp Tee",
  429821634: "Local Jagoff Tee",
  430697388: "Local Jagoff PGH OG Tee",
  430964873: "Local Jagoff Keystone 724 Tee",
};
function getDisplayProductName(product) {
  return PRODUCT_NAME_OVERRIDES[Number(product?.id)] ||
    String(product?.name || "Local Jagoff Product").trim() || "Local Jagoff Product";
}
function productVisible(product) {
  return Number.isSafeInteger(Number(product?.id)) && Number(product.id) > 0 &&
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
  return name.startsWith(product.name + " / ") ? name.slice(product.name.length + 3) : name;
}

module.exports = { STORE_ID, HIDDEN_PRODUCT_IDS, getDisplayProductName,
  productVisible, variantUnavailableReason, amountCents, detectCategory, variantLabel };
