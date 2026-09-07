const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { curateProduct, loadCatalog, loadProduct, metaRows, feedCsv } = require("../lib/catalog.cjs");
const { resolveCart } = require("../lib/commerce.cjs");
const id = 430964873;
const variantId = 5292830954;
const fixture = (productId = id) => ({ sync_product: { id: productId, name: "Raw name", is_ignored: false },
  sync_variants: [{ id: variantId, sync_product_id: productId, name: "Raw name / Black / S",
    synced: true, is_ignored: false, availability_status: "active", retail_price: "30.00", currency: "USD",
    size: "S", color: "Black" }] });
const response = data => ({ status: 200, ok: true, json: async () => ({ code: 200, ...data }) });

test("one sellability policy gates listing, feed and checkout", async () => {
  for (const [field, values] of Object.entries({ synced: [false, undefined], is_ignored: [true, undefined],
    availability_status: ["out_of_stock", "discontinued", undefined], currency: ["EUR", undefined, ""],
    retail_price: ["0.00", "1e2", "", null], sync_product_id: [999] })) {
    for (const value of values) {
      const data = fixture(); data.sync_variants[0][field] = value;
      assert.equal(curateProduct(data, id), null, `${field}: ${value}`);
      await assert.rejects(resolveCart([{ id, variant_id: variantId, quantity: 1 }],
        { apiKey: "fixture", fetchImpl: async () => response({ result: data }) }));
    }
  }
});

test("curation, positive USD prices and exact variant handoff survive feed serialization", () => {
  const p = curateProduct(fixture(), id);
  assert.equal(p.name, "Local Jagoff Keystone 724 Tee");
  assert.equal(p.variants[0].name, "Black / S");
  assert.equal(p.retail_price, "30.00");
  assert.equal(p.images[0], "/images/products/local-jagoff-keystone-724-1.jpg");
  const [row] = metaRows([p], "https://www.localjagoff.com");
  assert.equal(row.id, `lj_${id}_${variantId}`);
  assert.equal(row.link, `https://www.localjagoff.com/product/${id}?variant=${variantId}`);
  assert.equal(row.price, "30.00 USD");
  assert.equal(row.availability, "in stock");
  assert.equal(row.size, "S");
  assert.match(feedCsv([row]), /"id","item_group_id"/);
  assert.throws(() => metaRows([p, p], "https://www.localjagoff.com"), /Duplicate/);
  for (const image of p.images) assert.ok(fs.existsSync(path.join(__dirname, "../public", image)));
});

test("pagination is complete and hidden products never need a detail fetch", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url.includes("offset=0")) return response({ result: [{ id: 430925200 }], paging: { offset: 0, total: 2 } });
    if (url.includes("offset=1")) return response({ result: [{ id }], paging: { offset: 1, total: 2 } });
    return response({ result: fixture() });
  };
  const products = await loadCatalog({ apiKey: "fixture", fetchImpl });
  assert.equal(products.length, 1);
  assert.equal(calls.length, 3);
  assert.equal(calls.some(url => url.includes("products/430925200")), false);
  assert.equal(await loadProduct(430925200, { fetchImpl: () => { throw Error("must not run"); } }), null);
});

test("provider errors, missing pagination and malformed detail fail the whole snapshot", async () => {
  for (const bad of [{ result: [], paging: { total: 1, offset: 0 } },
    { result: [{ id }] }, { result: [{ id }], paging: { total: 1, offset: 99 } }]) {
    await assert.rejects(loadCatalog({ apiKey: "fixture", fetchImpl: async () => response(bad) }));
  }
  await assert.rejects(loadCatalog({ apiKey: "fixture", fetchImpl: async () => ({ status: 429, ok: false }) }));
  assert.throws(() => curateProduct({ sync_product: { id, is_ignored: false } }, id));
  assert.throws(() => curateProduct(fixture(999), id));
});

test("catalog excludes ignored products and duplicate variant IDs fail closed", () => {
  const ignored = fixture(); ignored.sync_product.is_ignored = true;
  assert.equal(curateProduct(ignored, id), null);
  const duplicate = fixture(); duplicate.sync_variants.push({ ...duplicate.sync_variants[0] });
  assert.throws(() => curateProduct(duplicate, id), /Duplicate/);
});

test('unapproved Printful products stay absent from storefront, checkout and feeds', async()=>{
  const unknown=fixture(987654321);
  assert.equal(curateProduct(unknown,987654321),null);
  assert.equal(await loadProduct(987654321,{fetchImpl:()=>assert.fail('Unapproved provider read')}),null);
  await assert.rejects(resolveCart([{id:987654321,variant_id:variantId,quantity:1}],
    {apiKey:'fixture',fetchImpl:async()=>response({result:unknown})}));
});

test("temporary verification surface is absent and curated asset map contains no broken paths", () => {
  assert.equal(fs.existsSync(path.join(__dirname, "../api/review-verification.js")), false);
  const images = require("../lib/product-images.cjs");
  for (const image of Object.values(images).flat()) {
    assert.ok(fs.existsSync(path.join(__dirname, "../public", image)), image);
  }
});
