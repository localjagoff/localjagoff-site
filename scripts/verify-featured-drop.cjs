const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { FEATURED_PRODUCT_IDS, sortCatalog } = require('../lib/storefront.cjs');
const images = require('../lib/product-images.cjs');
const { metaRows, feedCsv } = require('../lib/catalog.cjs');
const origin = 'https://www.localjagoff.com';
const olderTees = [428851513,428851608,428851698,428982889,429536493,429728777,429821634,430964873];

async function main() {
  const baseline = process.argv[2];
  assert.ok(baseline, 'Pass the pre-deployment evidence directory');
  const before = JSON.parse(fs.readFileSync(path.join(baseline,'before-products.json'),'utf8'));
  const get = async (url, method = 'GET') => {
    const response = await fetch(new URL(url,origin),{method,signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,url);
    return response;
  };
  const products = await (await get('/api/get-products')).json();
  const offer = ({images,thumbnail_url,...product}) => product;
  assert.deepEqual(products.map(offer),before.map(offer),'Product identities, copy, offers and order stay fixed');
  assert.equal(products.length,17);
  assert.equal(products.reduce((n,p)=>n+p.variants.length,0),96);
  assert.deepEqual(sortCatalog(products,'curated').slice(0,4).map(p=>p.id),FEATURED_PRODUCT_IDS);
  let imageChecks = 0;
  for (const product of products) {
    const old = before.find(p=>p.id===product.id);
    if (olderTees.includes(product.id)) {
      assert.equal(product.images[0],`/images/google/${product.id}.jpg`);
      assert.deepEqual(product.images.slice(1),old.images.slice(1),'Existing secondary views preserved');
    } else assert.deepEqual(product.images,old.images,'Unrequested imagery stays fixed');
    assert.deepEqual(product.images,images[product.id]);
    assert.equal(product.thumbnail_url,product.images[0]);
    for (const image of product.images) { await get(image,'HEAD'); imageChecks++; }
    const html = await (await get(`/product/${product.id}`)).text();
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(ld.name,product.name);
    assert.ok(JSON.stringify(ld.image).includes(product.images[0]));
    for (const variant of product.variants) {
      const item = ld.hasVariant.find(v=>v.sku===`lj_${product.id}_${variant.id}`);
      assert.equal(Number(item.offers.price),Number(variant.price));
    }
  }
  const google = await (await get('/feeds/products.tsv')).text();
  assert.equal(google,fs.readFileSync(path.join(baseline,'before-google.tsv'),'utf8'),'Google reviewed feed byte-identical');
  const rows = google.trim().split('\n');
  assert.equal(rows.length-1,72);
  for (const id of FEATURED_PRODUCT_IDS) assert.ok(!google.includes(String(id)));
  const meta = await (await get('/api/meta-catalog')).text();
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  console.log(JSON.stringify({products:17,variants:96,featured:FEATURED_PRODUCT_IDS,cleanOlderTees:olderTees,
    imageChecks,googleOffers:72,googleUnchanged:true,googleSHA256:createHash('sha256').update(google).digest('hex'),
    metaOffers:96,offersAndCopyUnchanged:true,secondaryViewsPreserved:true},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
