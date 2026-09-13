const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
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
  assert.equal(products.length, 14);
  assert.equal(rows.length, 78);
  let checked = 0;
  for (const product of products) {
    for (const variant of product.variants) {
      const row = rows.find(row => row.id === `lj_${product.id}_${variant.id}`);
      assert.ok(row);
      assert.equal(row.price, `${variant.price} ${variant.currency}`);
      assert.equal(row.availability, 'in_stock');
      assert.equal(row.link, `${origin}/product/${product.id}?variant=${variant.id}`);
      assert.equal(row.additional_image_link, '');
      checked++;
    }
    const html = await (await get(`/product/${product.id}?variant=${product.variants[0].id}`)).text();
    assert.ok(html.includes('2-5 business days'));
    assert.ok(html.includes('3-4 business days'));
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.ok(script);
    const group = JSON.parse(script[1]);
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
    metaFeedSha256: hash(await (await get('/api/meta-catalog')).text()) }));
}
verify().catch(error => { console.error(error.message); process.exitCode = 1; });
