const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { curateProduct, loadCatalog } = require("../lib/catalog.cjs");
const d = require("../lib/discovery.cjs");
const root = path.join(__dirname, "..");
const productId = 430964873;
const variantId = 5292830954;
function fixture() {
  return { sync_product: { id: productId, name: "Raw tee", is_ignored: false },
    sync_variants: ["S", "L"].map((size, i) => ({ id: variantId + i,
      sync_product_id: productId, name: `Raw tee / Black / ${size}`, size, color: "Black",
      synced: true, is_ignored: false, availability_status: "active", currency: "USD",
      retail_price: i ? "32.00" : "30.00" })) };
}
const product = () => curateProduct(fixture(), productId);
const response = data => ({ status: 200, ok: true, json: async () => ({ code: 200, ...data }) });
function httpContext(method = "GET") {
  const headers = {};
  return { req: { method }, res: { headers,
    setHeader(key, value) { headers[key.toLowerCase()] = value; },
    end(body) { this.body = body; } } };
}

test("ProductGroup publishes every exact catalog offer with stable variant identities", () => {
  const p = product(), schema = d.productJsonLd(p);
  assert.equal(schema["@type"], "ProductGroup");
  assert.equal(schema.productGroupID, `lj_${productId}`);
  assert.equal(schema.url, `${d.ORIGIN}/product/${productId}`);
  assert.deepEqual(schema.variesBy, ["https://schema.org/size"]);
  assert.equal(schema.description, p.description);
  assert.equal(schema.hasVariant.length, 2);
  schema.hasVariant.forEach((v, i) => {
    assert.equal(v.sku, `lj_${productId}_${variantId + i}`);
    assert.equal(v.offers.price, p.variants[i].price);
    assert.equal(v.offers.priceCurrency, "USD");
    assert.equal(v.offers.url, `${schema.url}?variant=${variantId + i}`);
    assert.equal(v.offers.availability, "https://schema.org/InStock");
    assert.equal(v.size, p.variants[i].size);
    assert.equal(v.color, "Black");
  });
  assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|review|gtin|mpn|shippingDetails|hasMerchantReturnPolicy/);
  assert.equal(d.productJsonLd(null), null);
});

test("sitemap uses current canonical catalog IDs and meaningful existing categories only", () => {
  const p = product();
  const urls = d.sitemapUrls([p]);
  assert.ok(urls.includes(`${d.ORIGIN}/tees`));
  assert.ok(!urls.includes(`${d.ORIGIN}/hoodies`));
  assert.ok(!urls.includes(`${d.ORIGIN}/724`));
  assert.ok(urls.includes(`${d.ORIGIN}/product/${p.id}`));
  assert.equal(urls.length, new Set(urls).size);
  const xml = d.sitemapXml([p]);
  assert.doesNotMatch(xml, /lastmod|changefreq|priority|variant=|\/api|\/admin|\/checkout|\/review|\/success/);
  assert.doesNotMatch(d.sitemapXml([]), /\/product\/|\/tees/);
  assert.equal(fs.existsSync(path.join(root, "public/sitemap.xml")), false);
  for (const url of d.sitemapUrls([])) {
    const name = new URL(url).pathname === "/" ? "index" : new URL(url).pathname.slice(1);
    assert.ok(fs.existsSync(path.join(root, "pages", `${name}.js`)), url);
  }
});

test("hidden, ignored and inactive catalog records cannot enter discovery", async () => {
  const data = fixture();
  data.sync_variants[1].availability_status = "out_of_stock";
  const p = curateProduct(data, productId);
  assert.equal(d.googleRows([p]).length, 1);
  assert.equal(d.productJsonLd(p).hasVariant.length, 1);
  data.sync_product.is_ignored = true;
  assert.equal(curateProduct(data, productId), null);
  const products = await loadCatalog({ apiKey: "fixture", fetchImpl: async url => {
    if (url.includes("offset=")) return response({ result: [{ id: 430925200 }, { id: productId }],
      paging: { offset: 0, total: 2 } });
    assert.ok(!url.includes("430925200"));
    return response({ result: fixture() });
  } });
  assert.doesNotMatch(d.sitemapXml(products), /430925200/);
  assert.equal(d.openaiRows(products).length, 2);
});

test("Google and OpenAI exports share identities, prices and exact variant URLs", () => {
  const p = product();
  const google = d.googleRows([p]), openai = d.openaiRows([p]);
  google.forEach((row, i) => {
    const ai = openai[i];
    assert.equal(ai.item_id, row.id);
    assert.equal(ai.group_id, row.item_group_id);
    assert.equal(ai.url, row.link);
    assert.equal(ai.price, row.price);
    assert.equal(row.availability, "in_stock");
    assert.equal(ai.seller_name, "Local Jagoff");
    assert.equal(ai.is_eligible_search, true);
    assert.equal(ai.is_eligible_checkout, false);
    assert.equal(ai.is_ads_eligible, false);
    assert.deepEqual(ai.variant_dict, { size: p.variants[i].size, color: "Black" });
    assert.equal(ai.return_policy, `${d.ORIGIN}/terms`);
    assert.equal(ai.accepts_returns, undefined);
    assert.equal(ai.return_deadline_in_days, undefined);
    assert.equal(row.identifier_exists, undefined);
  });
  assert.deepEqual(d.openaiJsonl([p]).trim().split("\n").map(JSON.parse), openai);
  assert.equal(d.openaiJsonl([]), "");
  const [header, ...lines] = d.googleTsv([p]).trim().split("\n");
  assert.equal(lines.length, 2);
  for (const line of lines) assert.equal(line.split("\t").length, header.split("\t").length);
});

test("variant projection preserves shared fields, image escaping and stable ordering", () => {
  const p = product();
  p.images = ["/images/hero.jpg", "https://images.example/a,b.jpg"];
  p.variants.reverse();
  const rows = d.googleRows([p]);
  const expected = [...p.variants].sort((a, b) => a.id - b.id).map(v => ({
    id: `lj_${p.id}_${v.id}`, item_group_id: `lj_${p.id}`, item_group_title: p.name.slice(0, 150),
    title: `${p.name} - ${v.name}`.slice(0, 150), description: p.description.slice(0, 5000),
    link: `${d.ORIGIN}/product/${p.id}?variant=${v.id}`,
    image_link: `${d.ORIGIN}/images/hero.jpg`, additional_image_link: "https://images.example/a%2Cb.jpg",
    availability: "in_stock", price: `${v.price} ${v.currency}`, condition: "new", brand: "Local Jagoff",
    size: v.size, color: v.color,
  }));
  assert.deepEqual(rows, expected);
});

test("serializers handle separators and JSON script escapes without adding rows", () => {
  const p = product(); p.description = 'Line\tbreak\n"quote" & </script>';
  assert.equal(d.googleTsv([p]).trim().split("\n").length, 3);
  assert.equal(JSON.parse(d.openaiJsonl([p]).split("\n")[0]).description, p.description);
  const inline = JSON.stringify(d.productJsonLd(p)).replace(/</g, "\\u003c");
  assert.ok(!inline.includes("</script>"));
  assert.equal(JSON.parse(inline).description, p.description);
  p.images.push("https://images.example/a,b.jpg");
  assert.ok(d.googleRows([p])[0].additional_image_link.includes("a%2Cb.jpg"));
  assert.ok(d.openaiRows([p])[0].additional_image_urls.includes("https://images.example/a%2Cb.jpg"));
  p.variants[1].size = p.variants[0].size;
  assert.throws(() => d.openaiRows([p]), /Ambiguous discovery variant options/);
});

test("malformed or duplicate data aborts discovery rather than publishing a partial snapshot", () => {
  for (const mutate of [p => p.variants[0].price = "0.00", p => p.variants[0].currency = "EUR",
    p => p.variants[0].availability = "unknown", p => p.images = ["https://user:password@example.com/a.jpg"],
    p => p.images = ["javascript:alert(1)"], p => p.variants.push({ ...p.variants[0] }),
    p => p.id = "1/../../admin"]) {
    const p = product(); mutate(p);
    for (const fn of [d.sitemapXml, d.googleTsv, d.openaiJsonl]) assert.throws(() => fn([p]));
  }
  assert.throws(() => d.googleTsv([product(), product()]), /Duplicate/);
});

test("public discovery responses support GET/HEAD, no-store, and sanitized failures", async () => {
  for (const format of ["sitemap", "google", "openai"]) {
    const ctx = httpContext();
    await d.serveDiscovery(ctx, async () => [product()], format);
    assert.equal(ctx.res.statusCode, 200);
    assert.equal(ctx.res.headers["cache-control"], "no-store");
    assert.equal(ctx.res.headers["x-content-type-options"], "nosniff");
    assert.ok(ctx.res.body.length > 0);
    const head = httpContext("HEAD");
    await d.serveDiscovery(head, async () => [product()], format);
    assert.equal(head.res.statusCode, 200);
    assert.equal(head.res.body, undefined);
    const failed = httpContext();
    await d.serveDiscovery(failed, async () => { throw Error("secret provider response"); }, format);
    assert.equal(failed.res.statusCode, 503);
    assert.equal(failed.res.headers["retry-after"], "60");
    assert.doesNotMatch(failed.res.body, /secret|provider|item_id|urlset/);
  }
  const post = httpContext("POST");
  await d.serveDiscovery(post, () => { throw Error("must not load"); }, "sitemap");
  assert.equal(post.res.statusCode, 405);
  assert.equal(post.res.headers.allow, "GET, HEAD");
});

test("IndexNow detects additions, offer changes, removals and affected collections only", () => {
  const p = product(), before = d.discoverySnapshot([p]);
  assert.deepEqual(d.changedDiscoveryUrls(before, d.discoverySnapshot([p])), []);
  p.variants.reverse();
  assert.deepEqual(d.changedDiscoveryUrls(before, d.discoverySnapshot([p])), []);
  p.variants[0].price = "35.00"; p.variants[0].unit_amount = 3500;
  const expected = [`${d.ORIGIN}/`, `${d.ORIGIN}/product/${productId}`, `${d.ORIGIN}/tees`].sort();
  assert.deepEqual(d.changedDiscoveryUrls(before, d.discoverySnapshot([p])), expected);
  assert.deepEqual(d.changedDiscoveryUrls(before, []), expected);
  assert.deepEqual(d.changedDiscoveryUrls([], before), expected);
  assert.throws(() => d.changedDiscoveryUrls(undefined, before), /Complete snapshots/);
});

test("IndexNow permits only canonical public URLs and uses a nonsecret verification key", () => {
  assert.match(d.INDEXNOW_KEY, /^[a-zA-Z0-9-]{8,128}$/);
  const payload = d.indexNowPayload([`${d.ORIGIN}/tees`, `${d.ORIGIN}/tees`]);
  assert.deepEqual(payload.urlList, [`${d.ORIGIN}/tees`]);
  assert.equal(payload.keyLocation, `${d.ORIGIN}/indexnow-key.txt`);
  for (const url of ["https://evil.example/tees", "https://localjagoff.com/tees",
    `${d.ORIGIN}/admin`, `${d.ORIGIN}/api/get-products`, `${d.ORIGIN}/customer`,
    `${d.ORIGIN}/product/1?variant=2`, `${d.ORIGIN}/tees#x`, `${d.ORIGIN}/product/01`,
    "https://user:password@www.localjagoff.com/tees"]) assert.throws(() => d.indexNowPayload([url]));
  assert.throws(() => d.indexNowPayload(Array.from({ length: 10001 }, (_, i) => `${d.ORIGIN}/product/${i + 1}`)));
});

test("IndexNow transport is opt-in, bounded and reports failures without retries", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return { status: 202 }; };
  assert.deepEqual(await d.submitIndexNow([], { fetchImpl }), { submitted: 0, status: null });
  assert.equal(calls.length, 0);
  assert.deepEqual(await d.submitIndexNow([`${d.ORIGIN}/tees`], { fetchImpl }), { submitted: 1, status: 202 });
  assert.equal(calls[0].url, "https://api.indexnow.org/indexnow");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(JSON.parse(calls[0].options.body).key, d.INDEXNOW_KEY);
  await assert.rejects(d.submitIndexNow([`${d.ORIGIN}/tees`], { fetchImpl: async () => ({ status: 429 }) }), /429/);
});

test("robots shares exclusions with OAI-SearchBot and llms links only existing public routes", () => {
  const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");
  assert.match(robots, /User-agent: \*\r?\nUser-agent: OAI-SearchBot\r?\nAllow: \//);
  for (const prefix of ["admin", "api", "customer", "account", "private", "cart", "checkout", "success", "review"]) {
    assert.ok(robots.includes(`Disallow: /${prefix}`));
  }
  const llms = fs.readFileSync(path.join(root, "public/llms.txt"), "utf8");
  for (const match of llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)) {
    const url = new URL(match[1]);
    assert.equal(url.origin, d.ORIGIN);
    assert.doesNotMatch(url.pathname, /^\/(api|admin|customer|checkout)/);
    const route = url.pathname === "/" ? "index" : url.pathname.slice(1);
    assert.ok(fs.existsSync(path.join(root, "pages", `${route}.js`)), route);
  }
  assert.match(llms, /not an unconditional 14-day return policy/);
});

async function compilePage(filename, requireImpl) {
  const swc = require("next/dist/build/swc");
  await swc.loadBindings();
  const { code } = swc.transformSync(fs.readFileSync(path.join(root, filename), "utf8"), {
    filename, disableNextSsg: true, styledJsx: {},
    jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2020",
      transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" },
  });
  const sandbox = { exports: {}, require: requireImpl };
  vm.runInNewContext(code, sandbox, { filename });
  return sandbox.exports;
}

test("actual Next feed/sitemap/key routes return complete fixture documents", async () => {
  let calls = 0;
  const requireImpl = name => {
    if (name.endsWith("catalog.cjs")) return { getCatalog: async () => { calls++; return [product()]; } };
    if (name.endsWith("discovery.cjs")) return d;
    throw Error(`Unexpected dependency: ${name}`);
  };
  for (const [filename, contentType, body] of [
    ["pages/sitemap.xml.js", "application/xml", d.sitemapXml([product()])],
    ["pages/feeds/products.tsv.js", "text/tab-separated-values", d.googleTsv([product()])],
    ["pages/feeds/openai-products.jsonl.js", "application/x-ndjson", d.openaiJsonl([product()])],
    ["pages/indexnow-key.txt.js", "text/plain", d.INDEXNOW_KEY],
  ]) {
    const route = await compilePage(filename, requireImpl);
    assert.equal(route.default(), null);
    const ctx = httpContext();
    await route.getServerSideProps(ctx);
    assert.equal(ctx.res.statusCode, 200);
    assert.ok(ctx.res.headers["content-type"].startsWith(contentType));
    assert.equal(ctx.res.body, body);
  }
  assert.equal(calls, 3);
});

test("actual product SSR includes escaped ProductGroup and omits it during an outage", async () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const page = await compilePage("pages/product/[id].js", name => {
    if (name === "next/head") return ({ children }) => React.createElement("head", null, children);
    if (name === "next/link") return ({ children, href, ...props }) => React.createElement("a", {href, ...props}, children);
    if (name === "lucide-react") return require("lucide-react");
    if (name.endsWith("storefront.cjs")) return require("../lib/storefront.cjs");
    if (name === "next/router") return { useRouter: () => ({ query: {} }) };
    if (name.includes("components/")) return () => null;
    if (name.endsWith("getProductImages")) return { getProductImages: p => p.images || [] };
    if (name.endsWith("meta-pixel.cjs")) return require('../lib/meta-pixel.cjs');
    if (name.endsWith("discovery.cjs")) return d;
    if (["react", "react/jsx-runtime", "styled-jsx/style"].includes(name)) return require(name);
    throw Error(`Unexpected dependency: ${name}`);
  });
  const p = product(); p.description = "Public description </script><script>injection</script>";
  const html = renderToStaticMarkup(React.createElement(page.default, {
    initialProductId: String(p.id), initialProduct: p, initialVariantId: p.variants[1].id,
  }));
  const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(script);
  const schema = JSON.parse(script[1]);
  assert.equal(schema["@type"], "ProductGroup");
  assert.equal(schema.hasVariant.length, 2);
  assert.equal(schema.description, p.description);
  assert.doesNotMatch(script[1], /<script>|<\/script>/);
  const outage = renderToStaticMarkup(React.createElement(page.default, {
    initialProductId: String(p.id), initialProduct: null, initialVariantId: "", unavailable: true,
  }));
  assert.doesNotMatch(outage, /application\/ld\+json|schema.org\/InStock/);
});
