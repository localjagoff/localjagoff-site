const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { PRODUCTS } = require('../lib/product-merchandising.cjs');
const { GOOGLE_APPROVED_PRODUCT_IDS, GOOGLE_STAGED_PRODUCT_IDS } = require('../lib/google-listing-policy.cjs');
const { metaRows, feedCsv } = require('../lib/catalog.cjs');
const origin = 'https://www.localjagoff.com';

async function get(path, method = 'GET') {
  const response = await fetch(new URL(path, origin), { method, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  return response;
}

async function verify() {
  const products = await (await get('/api/get-products')).json();
  const tsv = await (await get('/feeds/products.tsv')).text();
  const [head, ...lines] = tsv.trim().split('\n');
  const keys = head.split('\t');
  const rows = lines.map(line => Object.fromEntries(line.split('\t').map((value, i) => [keys[i], value])));
  assert.equal(products.length, 17);
  assert.equal(rows.length, 72);
  const meta = await (await get('/api/meta-catalog')).text();
  assert.equal(meta, feedCsv(metaRows(products, origin)));
  const openai = (await (await get('/feeds/openai-products.jsonl')).text()).trim().split('\n').map(JSON.parse);
  const sitemap = await (await get('/sitemap.xml')).text();
  assert.equal(openai.length, 96);
  assert.equal(new Set(rows.map(row=>row.item_group_id)).size,13);
  for(const id of GOOGLE_STAGED_PRODUCT_IDS) assert.ok(!tsv.includes(String(id)));
  for(const body of [JSON.stringify(products),tsv,meta,JSON.stringify(openai)]) assert.doesNotMatch(body,/printful/i);
  for (const retired of [430697388, 430925200]) {
    for (const body of [tsv, meta, JSON.stringify(openai), sitemap]) assert.ok(!body.includes(String(retired)));
    assert.equal((await fetch(`${origin}/product/${retired}`)).status, 404);
  }
  let checked = 0;
  for (const product of products) {
    assert.equal(product.name, PRODUCTS[product.id].name);
    assert.ok(sitemap.includes(`/product/${product.id}`));
    for (const variant of product.variants) {
      const row = rows.find(row => row.id === `lj_${product.id}_${variant.id}`);
      if(GOOGLE_APPROVED_PRODUCT_IDS.has(product.id)){
        assert.ok(row);
        assert.equal(row.price, `${variant.price} ${variant.currency}`);
        assert.equal(row.availability, 'in_stock');
        assert.equal(row.link, `${origin}/product/${product.id}?variant=${variant.id}`);
        assert.equal(row.additional_image_link, '');
        assert.ok(row.title.startsWith(product.name + ' - '));
      }else assert.equal(row,undefined);
      const discovery = openai.find(item => item.item_id === `lj_${product.id}_${variant.id}`);
      assert.ok(discovery.title.startsWith(product.name + ' - '));
      assert.equal(discovery.price, `${variant.price} ${variant.currency}`);
      assert.equal(discovery.availability, 'in_stock');
      checked++;
    }
    const html = await (await get(`/product/${product.id}?variant=${product.variants[0].id}`)).text();
    assert.ok(html.includes('2-5 business days'));
    assert.ok(html.includes('3-4 business days'));
    assert.ok(html.includes('within 2 business days'));
    assert.ok(html.includes('2-7 business days'));
    assert.doesNotMatch(html,/printful/i);
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.ok(script);
    const group = JSON.parse(script[1]);
    assert.equal(group.name, product.name);
    for (const variant of product.variants) {
      const { offers } = group.hasVariant.find(v => v.sku === `lj_${product.id}_${variant.id}`);
      assert.equal(offers.price, variant.price);
      assert.equal(offers.availability, 'https://schema.org/InStock');
    }
    const image = await get(`/images/google/${product.id}.jpg`, 'HEAD');
    assert.match(image.headers.get('content-type'), /image\/jpeg/);
  }
  const hash = body => createHash('sha256').update(body).digest('hex');
  console.log(JSON.stringify({ checkedVariants: checked, landingPages: products.length,
    googleImages: products.length, googleFeedSha256: hash(tsv),
    metaFeedSha256: hash(meta), openaiVariants: openai.length,
    retiredProductsNotOffered: true, displayNamesConsistent: true }));
}
verify().catch(error => { console.error(error.message); process.exitCode = 1; });
