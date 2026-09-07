const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseMetaCart, resolveMetaCart } = require("../lib/meta-checkout.cjs");

const id = "lj_430964873_5292830954";

test("Meta products query decodes once, combines duplicates and ignores supplied prices", () => {
  const query = Object.fromEntries(new URLSearchParams(`products=${id}%3A2%2C${id}%3A1&price=0.01&coupon=SAVE10`));
  assert.deepEqual(parseMetaCart(query), {
    items: [{ id: 430964873, variant_id: 5292830954, quantity: 3 }], coupon: "SAVE10",
  });
  assert.equal(parseMetaCart({ products: `${id}:1` }).coupon, null);
});

test("Meta rejects invalid/ambiguous IDs, quantities, repeated parameters, coupons and hidden products", () => {
  for (const products of [undefined, [], [id + ":1"], "", "123:1", `${id}:0`, `${id}:-1`, `${id}:1.5`,
    `${id}:100`, `${id}:99,${id}:1`, `${id}:1,`, `${id}%3A1`, "lj_430925200_123:1",
    "lj_9007199254740992_1:1", `${id}:1&price=0`, "x".repeat(4097)]) {
    assert.throws(() => parseMetaCart({ products }));
  }
  for (const coupon of [[], {}, "x".repeat(101), "<script>", "CODE\n"]) {
    assert.throws(() => parseMetaCart({ products: `${id}:1`, coupon }));
  }
});

test("Meta handoff resolves current server price, product identity and eligibility with no mutation", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    return { status: 200, ok: true, json: async () => ({ result: {
      sync_product: { id: 430964873, name: "Raw name", is_ignored: false },
      sync_variants: [{ id: 5292830954, sync_product_id: 430964873, synced: true,
        is_ignored: false, availability_status: "active", currency: "USD", retail_price: "30.00", name: "S" }],
    } }) };
  };
  const result = await resolveMetaCart({ products: `${id}:2`, price: "0.01" }, { apiKey: "fixture", fetchImpl });
  assert.equal(result.items[0].price, "30.00");
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].name, "Local Jagoff Keystone 724 Tee");
  assert.ok(result.items[0].image.startsWith("/images/"));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  await assert.rejects(resolveMetaCart({ products: "lj_430964873_999:1" }, { apiKey: "fixture", fetchImpl }));
});

test("Meta invalid cart fails before provider access and provider outages fail closed", async () => {
  let calls = 0;
  const options = { apiKey: "fixture", fetchImpl: async () => { calls++; throw new Error("PRIVATE_PROVIDER_ERROR"); } };
  await assert.rejects(resolveMetaCart({ products: "invalid" }, options));
  assert.equal(calls, 0);
  await assert.rejects(resolveMetaCart({ products: `${id}:1` }, options), /Printful request unavailable/);
  assert.equal(calls, 1);
});
