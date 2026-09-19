const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { googleAttributes, products, GOOGLE_APPROVED_PRODUCT_IDS, GOOGLE_STAGED_PRODUCT_IDS, GOOGLE_SHIPPING_FIELDS } = require("../lib/google-listing-policy.cjs");
const { googleRows, googleTsv, openaiRows } = require("../lib/discovery.cjs");
const { curateProduct } = require("../lib/catalog.cjs");

test("13 approved and five staged Google presentations use original mockups and reviewed attributes", () => {
  assert.equal(Object.keys(products).length, 18);
  assert.equal(GOOGLE_APPROVED_PRODUCT_IDS.size,13);
  assert.equal(GOOGLE_STAGED_PRODUCT_IDS.size,5);
  for (const id of Object.keys(products)) {
    const attrs = googleAttributes(id);
    assert.ok(["male", "unisex"].includes(attrs.gender));
    assert.equal(attrs.age_group, "adult");
    assert.equal(attrs.identifier_exists, "no");
    assert.equal(attrs.additional_image_link, "");
    const filename = path.join(__dirname, "..", "public", new URL(attrs.image_link).pathname);
    const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
    assert.ok(bytes.length > 10000);
    assert.doesNotMatch(JSON.stringify(attrs), /gtin|mpn/);
  }
  assert.throws(() => googleAttributes("430925200"), /not reviewed/);
  assert.throws(() => googleAttributes("430697388"), /not reviewed/);
  assert.throws(() => googleAttributes("unreviewed"), /not reviewed/);
});

test('Google single-offer shipping matches checkout and preserves business-day delivery and cutoff', () => {
  const { standardShippingCents } = require('../lib/shipping-policy.cjs');
  for (const id of GOOGLE_APPROVED_PRODUCT_IDS) {
    const attrs=googleAttributes(id);
    assert.equal(attrs[GOOGLE_SHIPPING_FIELDS[0]],`US:Standard Shipping:${(standardShippingCents([{id,quantity:1}])/100).toFixed(2)} USD:2:7:3:4`);
    assert.equal(attrs.shipping_handling_business_days,'Mon-Fri');
    assert.equal(attrs.shipping_transit_business_days,'Mon-Fri');
    assert.equal(attrs[GOOGLE_SHIPPING_FIELDS[3]],'US:"14:00":America/New_York');
    assert.equal(attrs[GOOGLE_SHIPPING_FIELDS[4]],'US:60.00 USD');
    assert.match(googleAttributes(id,6000)[GOOGLE_SHIPPING_FIELDS[0]],/Shipping:0.00 USD/);
  }
});

test("storefront approval and staged Google metadata do not add offers to the reviewed Google feed", () => {
  const catalog=Object.keys(products).map(Number).map(id=>curateProduct({
    sync_product:{id,name:"Provider tee",is_ignored:false},sync_variants:[{
      id:id+100,sync_product_id:id,name:"Black / S",size:"S",color:"Black",synced:true,
      is_ignored:false,availability_status:"active",currency:"USD",retail_price:"30.00"}]
  },id));
  const tsv=googleTsv(catalog);
  assert.equal(tsv.trim().split("\n").length,14);
  assert.equal(openaiRows(catalog).length,18);
  for(const id of GOOGLE_STAGED_PRODUCT_IDS){
    assert.ok(!GOOGLE_APPROVED_PRODUCT_IDS.has(id));
    assert.ok(!tsv.includes(String(id)));
    assert.ok(openaiRows(catalog).some(row=>row.item_id.startsWith("lj_"+id+"_")));
  }
  assert.doesNotMatch(tsv,/printful/i);
});

test("Google presentation leaves authoritative identities, offers, Meta and other discovery imagery alone", () => {
  const p = curateProduct({
    sync_product: { id: 430964873, name: "Tee", is_ignored: false },
    sync_variants: [{ id: 5292830954, sync_product_id: 430964873, name: "Black / S",
      size: "S", color: "Black", synced: true, is_ignored: false,
      availability_status: "active", currency: "USD", retail_price: "30.00" }],
  }, 430964873);
  // Channel isolation still holds for a historical snapshot with promotional imagery.
  p.images = ['/images/products/local-jagoff-keystone-724-1.jpg', '/images/products/local-jagoff-keystone-724-2.jpg'];
  const before = JSON.stringify(p);
  const base = googleRows([p])[0];
  const ai = openaiRows([p])[0];
  const [header, line] = googleTsv([p]).trim().split("\n");
  const row = Object.fromEntries(header.split("\t").map((key, i) => [key, line.split("\t")[i]]));
  for (const field of ["id", "item_group_id", "price", "availability", "link", "size", "color", "brand"])
    assert.equal(row[field], base[field]);
  assert.match(row.image_link, /\/images\/google\/430964873\.jpg$/);
  assert.notEqual(row.image_link, base.image_link);
  assert.equal(ai.image_url, base.image_link);
  assert.equal(JSON.stringify(p), before);
});
