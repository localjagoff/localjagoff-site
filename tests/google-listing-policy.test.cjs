const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { googleAttributes, products } = require("../lib/google-listing-policy.cjs");
const { googleRows, googleTsv, openaiRows } = require("../lib/discovery.cjs");
const { curateProduct } = require("../lib/catalog.cjs");

test("all 14 Google presentations use complete original mockups and reviewed apparel attributes", () => {
  assert.equal(Object.keys(products).length, 14);
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
  assert.throws(() => googleAttributes("unreviewed"), /not reviewed/);
});

test("Google presentation leaves authoritative identities, offers, Meta and other discovery imagery alone", () => {
  const p = curateProduct({
    sync_product: { id: 430964873, name: "Tee", is_ignored: false },
    sync_variants: [{ id: 5292830954, sync_product_id: 430964873, name: "Black / S",
      size: "S", color: "Black", synced: true, is_ignored: false,
      availability_status: "active", currency: "USD", retail_price: "30.00" }],
  }, 430964873);
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
