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
module.exports = { STORE_ID, HIDDEN_PRODUCT_IDS, getDisplayProductName };
