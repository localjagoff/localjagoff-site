const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {metaRows,feedCsv}=require('../lib/catalog.cjs');
const {PRODUCTS}=require('../lib/product-merchandising.cjs');
const {inCategory}=require('../lib/storefront.cjs');
const origin='https://www.localjagoff.com';
const added=[473981186,473991005,473985115,473987159,473987719,473990688];
async function main(){
  const [baseline,googleBaseline,output]=process.argv.slice(2);
  assert.ok(baseline&&googleBaseline&&output);
  const previous=JSON.parse(await fs.readFile(baseline,'utf8'));
  const get=async route=>{
    const response=await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,route);return response;
  };
  const products=await(await get('/api/get-products')).json();
  assert.equal(products.length,26);
  assert.equal(products.flatMap(p=>p.variants).length,156);
  assert.deepEqual(products.filter(p=>!added.includes(p.id)),previous);
  for(const id of added){
    const p=products.find(p=>p.id===id);
    assert.equal(p.name,PRODUCTS[id].name);
    assert.equal(p.variants.length,6);
    assert.deepEqual(p.variants.map(v=>v.size),['S','M','L','XL','2XL','3XL']);
    assert.deepEqual(p.variants.map(v=>v.unit_amount),id===473985115?[3000,3000,3000,3000,3200,3400]:[5000,5000,5000,5000,5200,5400]);
    assert.ok(p.variants.every(v=>v.color==='Black'&&v.availability==='in stock'));
    const html=await(await get('/product/'+id)).text();
    assert.ok(html.includes(p.name));
    for(const image of p.images){
      const bytes=Buffer.from(await(await get(image)).arrayBuffer());
      assert.deepEqual(bytes,await fs.readFile(path.join(__dirname,'../public',image)));
    }
  }
  assert.equal(products.filter(p=>inCategory(p,'724')).length,4);
  assert.equal(products.filter(p=>inCategory(p,'hoodies')).length,8);
  assert.equal(products.filter(p=>inCategory(p,'tees')).length,16);
  const meta=await(await get('/api/meta-catalog')).text();
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  const google=await(await get('/feeds/products.tsv')).text();
  assert.equal(google,await fs.readFile(googleBaseline,'utf8'));
  const summary={checkedAt:new Date().toISOString(),products:26,variants:156,metaOffers:156,
    collection724:4,hoodies:8,tees:16,other20ProductsUnchanged:true,googleByteIdentical:true,
    originalImagesVerified:true,pricesVerified:true,added:added.map(id=>({id,name:PRODUCTS[id].name}))};
  await fs.mkdir(output,{recursive:true});
  for(const [name,content] of [['products.json',JSON.stringify(products,null,2)],['meta.csv',meta],
    ['google.tsv',google],['summary.json',JSON.stringify(summary,null,2)]])await fs.writeFile(path.join(output,name),content);
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
