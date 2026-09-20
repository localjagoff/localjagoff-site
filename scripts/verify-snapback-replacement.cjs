const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {metaRows,feedCsv}=require('../lib/catalog.cjs');
const origin='https://www.localjagoff.com';

async function main() {
  const [baseline,output]=process.argv.slice(2);
  assert.ok(baseline&&output);
  const previous=JSON.parse(await fs.readFile(path.join(baseline,'products.json'),'utf8'));
  const get=async route=>{
    const response=await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,route);
    return response;
  };
  const products=await(await get('/api/get-products')).json();
  const meta=await(await get('/api/meta-catalog')).text();
  const google=await(await get('/feeds/products.tsv')).text();
  assert.equal(products.length,20);
  assert.equal(products.flatMap(p=>p.variants).length,120);
  assert.deepEqual(products.filter(p=>p.id!==473834484),previous.filter(p=>p.id!==473808088));
  assert.ok(!products.some(p=>p.id===473808088));
  const tee=products.find(p=>p.id===473834484);
  assert.equal(tee.name,'412 Snapback Smiley Backprint Tee');
  assert.equal(tee.variants.length,12);
  for(const color of ['Black','White']) {
    const variants=tee.variants.filter(v=>v.color===color);
    assert.deepEqual(variants.map(v=>v.size),['S','M','L','XL','2XL','3XL']);
    assert.deepEqual(variants.map(v=>v.unit_amount),[3500,3500,3500,3500,3700,3900]);
    assert.ok(variants.every(v=>v.availability==='in stock'));
  }
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  assert.ok(!meta.includes('lj_473808088_'));
  assert.equal(google,await fs.readFile(path.join(baseline,'google.tsv'),'utf8'));
  const page=await(await get('/product/473834484')).text();
  assert.ok(!page.includes('/473808088/'));
  for(const image of tee.images) {
    const bytes=Buffer.from(await(await get(image)).arrayBuffer());
    assert.deepEqual(bytes,await fs.readFile(path.join(__dirname,'../public',image)));
  }
  const retired=await fetch(origin+'/api/create-checkout-session',{
    method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
    body:JSON.stringify({items:[{id:473808088,variant_id:previous.find(p=>p.id===473808088).variants[0].id,quantity:1}]})
  });
  assert.equal(retired.status,400);
  const rejection=await retired.json();
  assert.ok(!rejection.url);
  const summary={
    checkedAt:new Date().toISOString(),products:20,variants:120,retiredProduct:473808088,
    replacementProduct:473834484,newVariantIds:tee.variants.map(v=>v.id),
    other19ProductsUnchanged:true,pricesVerified:true,googleByteIdentical:true,
    metaOffers:120,images:tee.images,retiredCheckoutStatus:retired.status,retiredCheckout:rejection
  };
  await fs.mkdir(output,{recursive:true});
  for(const [name,content] of [['products.json',JSON.stringify(products,null,2)],
    ['meta.csv',meta],['google.tsv',google],['summary.json',JSON.stringify(summary,null,2)]]) {
    await fs.writeFile(path.join(output,name),content);
  }
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
