const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { metaRows, feedCsv } = require('../lib/catalog.cjs');
const { FEATURED_PRODUCT_IDS, sortCatalog } = require('../lib/storefront.cjs');
const { googleTsv } = require('../lib/discovery.cjs');
const origin = 'https://www.localjagoff.com';

async function main() {
  const dir = process.argv[2];
  assert.ok(dir,'Provide the evidence directory containing before-products.json and before-google.tsv');
  const baseline = JSON.parse(fs.readFileSync(path.join(dir,'before-products.json'),'utf8'));
  const get = async route => {
    const response = await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,route);
    return response;
  };
  const products = await (await get('/api/get-products')).json();
  assert.equal(products.length,18);
  assert.equal(products.flatMap(p=>p.variants).length,102);
  assert.deepEqual(products.filter(p=>p.id!==473689891),baseline,'Other 17 products unchanged');
  const product = products.find(p=>p.id===473689891);
  assert.equal(product.name,'Pittsburgh Original Script Tee');
  assert.equal(product.category,'tees');
  assert.match(product.description,/White Local script/);
  assert.deepEqual(product.variants.map(v=>[v.size,v.price,v.color]),[
    ['S','30.00','Black'],['M','30.00','Black'],['L','30.00','Black'],
    ['XL','30.00','Black'],['2XL','32.00','Black'],['3XL','34.00','Black']]);
  assert.deepEqual(sortCatalog(products,'curated').slice(0,4).map(p=>p.id),FEATURED_PRODUCT_IDS);
  const images=[];
  for (const image of product.images) {
    const bytes=Buffer.from(await (await get(image)).arrayBuffer());
    assert.deepEqual(bytes,fs.readFileSync(path.join(__dirname,'../public',image)));
    images.push({path:image,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const parseTsv=text=>{const [header,...lines]=text.trim().split('\n');return lines.map(line=>Object.fromEntries(header.split('\t').map((key,i)=>[key,line.split('\t')[i]])));};
  const oldGoogle=parseTsv(fs.readFileSync(path.join(dir,'before-google.tsv'),'utf8'));
  const google=await (await get('/feeds/products.tsv')).text();
  const rows=parseTsv(google);
  assert.equal(rows.length,72);
  assert.equal(new Set(rows.map(r=>r.item_group_id)).size,13);
  assert.equal(google,googleTsv(products));
  const stable=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!key.startsWith('shipping(')&&!key.startsWith('free_shipping_threshold(')));
  assert.deepEqual(rows.map(stable),oldGoogle.map(stable),'Google only changes shipping, not offers');
  assert.ok(rows.every(r=>r['free_shipping_threshold(country:price_threshold)']==='US:60.00 USD'));
  for(const id of [...FEATURED_PRODUCT_IDS,473689891,471744477,473417526])assert.ok(!google.includes(String(id)));
  const meta=await (await get('/api/meta-catalog')).text();
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  assert.ok(meta.includes('473689891'));
  assert.ok(!meta.includes('471744477'));
  const html=await (await get('/product/473689891')).text();
  assert.ok(html.includes(product.name));
  assert.ok(html.includes('Free US Standard shipping on orders $60+'));
  const sitemap=await (await get('/sitemap.xml')).text();
  assert.ok(sitemap.includes('/product/473689891'));
  const summary={checkedAt:new Date().toISOString(),products:18,variants:102,
    newProduct:product,otherProductsUnchanged:17,featured:FEATURED_PRODUCT_IDS,images,
    google:{groups:13,variants:72,offersUnchanged:true,freeShippingThreshold:'US:60.00 USD'},
    meta:{variants:102,exactProjection:true},sitemap:true};
  for(const [file,content] of [['verification.json',JSON.stringify(summary,null,2)],
    ['after-products.json',JSON.stringify(products,null,2)],['after-google.tsv',google],['after-meta.csv',meta]])fs.writeFileSync(path.join(dir,file),content);
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
