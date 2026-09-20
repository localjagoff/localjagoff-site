const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {metaRows,feedCsv}=require('../lib/catalog.cjs');
const {googleTsv}=require('../lib/discovery.cjs');
const {FEATURED_PRODUCT_IDS,SPOTLIGHT_PRODUCT_IDS,sortCatalog}=require('../lib/storefront.cjs');
const origin='https://www.localjagoff.com';
async function main() {
  const [dir,stage]=process.argv.slice(2);
  assert.ok(dir && ['before','after'].includes(stage));
  await fs.mkdir(dir,{recursive:true});
  const get=async route=>{
    const r=await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
    assert.equal(r.status,200,route);return r;
  };
  const products=await(await get('/api/get-products')).json();
  const google=await(await get('/feeds/products.tsv')).text();
  const meta=await(await get('/api/meta-catalog')).text();
  if(stage==='after') {
    const before=JSON.parse(await fs.readFile(path.join(dir,'before-products.json'),'utf8'));
    assert.deepEqual(products.filter(p=>!SPOTLIGHT_PRODUCT_IDS.includes(p.id)),before);
    assert.equal(products.length,20);
    assert.equal(products.flatMap(p=>p.variants).length,126);
    assert.equal(google,await fs.readFile(path.join(dir,'before-google.tsv'),'utf8'));
    assert.equal(google,googleTsv(products));
    assert.equal(meta,feedCsv(metaRows(products,origin)));
    for(const id of SPOTLIGHT_PRODUCT_IDS) {
      const p=products.find(p=>p.id===id);
      assert.equal(p.variants.length,12);
      for(const color of ['Black','White']) assert.deepEqual(p.variants.filter(v=>v.color===color).map(v=>[v.size,v.price]),
        [['S','35.00'],['M','35.00'],['L','35.00'],['XL','35.00'],['2XL','37.00'],['3XL','39.00']]);
      for(const image of p.images) {
        const bytes=Buffer.from(await(await get(image)).arrayBuffer());
        assert.deepEqual(bytes,await fs.readFile(path.join(__dirname,'../public',image)));
      }
      const html=await(await get('/product/'+id)).text();
      assert.ok(html.includes(p.name));
      assert.ok(!google.includes(String(id)));
    }
    assert.deepEqual(sortCatalog(products,'curated').slice(0,5).map(p=>p.id),[...FEATURED_PRODUCT_IDS,473689891]);
  }
  for(const [file,content] of [['products.json',JSON.stringify(products,null,2)],['google.tsv',google],['meta.csv',meta]]) {
    await fs.writeFile(path.join(dir,stage+'-'+file),content);
  }
  const summary={stage,checkedAt:new Date().toISOString(),products:products.length,variants:products.flatMap(p=>p.variants).length,
    googleOffers:google.trim().split('\n').length-1,spotlight:products.filter(p=>SPOTLIGHT_PRODUCT_IDS.includes(p.id)).map(p=>({id:p.id,name:p.name,variants:p.variants.length}))};
  await fs.writeFile(path.join(dir,stage+'-summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
