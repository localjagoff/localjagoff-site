const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {FEATURED_PRODUCT_IDS,sortCatalog} = require('../lib/storefront.cjs');
const {metaRows,feedCsv} = require('../lib/catalog.cjs');
const origin = 'https://www.localjagoff.com';
async function main() {
  const beforeDir=process.argv[2], outputDir=process.argv[3];
  assert.ok(beforeDir && outputDir,'Provide baseline and evidence directories');
  fs.mkdirSync(outputDir,{recursive:true});
  const before=JSON.parse(fs.readFileSync(path.join(beforeDir,'before-products.json'),'utf8'));
  const get=async route=>{
    const response=await fetch(new URL(route,origin),{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,route);
    return response;
  };
  const products=await (await get('/api/get-products')).json();
  assert.equal(products.length,17);
  assert.equal(products.reduce((n,p)=>n+p.variants.length,0),96);
  assert.ok(!products.some(p=>p.id===471744477));
  assert.deepEqual(products.filter(p=>p.id!==471950476),before.filter(p=>p.id!==471744477),'All other 16 products unchanged');
  assert.deepEqual(sortCatalog(products,'curated').slice(0,4).map(p=>p.id),FEATURED_PRODUCT_IDS);
  const product=products.find(p=>p.id===471950476);
  assert.equal(product.name,'Official Local Jagoff Tee');
  assert.deepEqual(product.variants.map(v=>[v.size,v.price,v.color]),[
    ['S','30.00','Black'],['M','30.00','Black'],['L','30.00','Black'],['XL','30.00','Black'],['2XL','32.00','Black'],['3XL','34.00','Black']]);
  assert.deepEqual(product.images,require('../lib/product-images.cjs')[product.id]);
  const imageHashes=[];
  for (const image of product.images) {
    const bytes=Buffer.from(await (await get(image)).arrayBuffer());
    const local=fs.readFileSync(path.join(__dirname,'..','public',image));
    assert.deepEqual(bytes,local,'Live image must match the reviewed local render');
    imageHashes.push({path:image,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  for(const p of products) {
    const html=await (await get('/product/'+p.id)).text();
    const ld=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(ld.name,p.name);
    for(const v of p.variants) assert.equal(Number(ld.hasVariant.find(item=>item.sku==='lj_'+p.id+'_'+v.id).offers.price),Number(v.price));
  }
  assert.equal((await fetch(origin+'/product/471744477')).status,404);
  const google=await (await get('/feeds/products.tsv')).text();
  assert.equal(google,fs.readFileSync(path.join(beforeDir,'before-google.tsv'),'utf8'));
  for(const id of [...FEATURED_PRODUCT_IDS,471744477]) assert.ok(!google.includes(String(id)));
  const meta=await (await get('/api/meta-catalog')).text();
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  assert.ok(!meta.includes('471744477'));
  const sitemap=await (await get('/sitemap.xml')).text();
  assert.ok(sitemap.includes('/product/471950476'));
  assert.ok(!sitemap.includes('/product/471744477'));
  const ai=await (await get('/feeds/openai-products.jsonl')).text();
  assert.ok(ai.includes('471950476'));
  assert.ok(!ai.includes('471744477'));
  const summary={checkedAt:new Date().toISOString(),products:17,variants:96,featured:FEATURED_PRODUCT_IDS,
    replacement:product,unchangedOtherProducts:16,retiredRoute:404,googleOffers:72,googleByteIdentical:true,
    metaOffers:96,imageHashes,sitemapAndDiscovery:true};
  fs.writeFileSync(path.join(outputDir,'after-products.json'),JSON.stringify(products,null,2));
  fs.writeFileSync(path.join(outputDir,'after-meta.csv'),meta);
  fs.writeFileSync(path.join(outputDir,'verification.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
