const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {metaRows,feedCsv}=require('../lib/catalog.cjs');
const origin='https://www.localjagoff.com';

async function main() {
  const [baseline,output]=process.argv.slice(2);
  assert.ok(baseline&&output);
  const previous=JSON.parse(await fs.readFile(path.join(baseline,'after-products.json'),'utf8'));
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
  assert.deepEqual(products.filter(p=>p.id!==473808622),previous.filter(p=>p.id!==473808622));
  const tee=products.find(p=>p.id===473808622);
  const before=previous.find(p=>p.id===473808622);
  assert.deepEqual(tee.variants,before.variants.filter(v=>v.color==='White'));
  assert.deepEqual(tee.images,before.images.filter(image=>image.includes('/white-')));
  assert.equal(tee.thumbnail_url,tee.images[0]);
  assert.ok(!tee.description.includes('Black'));
  assert.equal(meta,feedCsv(metaRows(products,origin)));
  assert.equal(google,await fs.readFile(path.join(baseline,'after-google.tsv'),'utf8'));
  for(const removed of before.variants.filter(v=>v.color==='Black')) {
    assert.ok(!meta.includes('lj_473808622_'+removed.id));
  }
  const page=await(await get('/product/473808622')).text();
  assert.ok(!page.includes('/473808622/black-'));
  for(const image of tee.images) {
    const bytes=Buffer.from(await(await get(image)).arrayBuffer());
    assert.deepEqual(bytes,await fs.readFile(path.join(__dirname,'../public',image)));
  }
  const summary={
    checkedAt:new Date().toISOString(),products:20,variants:120,whiteVariantIds:tee.variants.map(v=>v.id),
    removedBlackVariantIds:before.variants.filter(v=>v.color==='Black').map(v=>v.id),
    other19ProductsUnchanged:true,whiteVariantsAndPricesUnchanged:true,googleByteIdentical:true,
    metaOffers:120,whiteImages:tee.images
  };
  await fs.mkdir(output,{recursive:true});
  for(const [name,content] of [['products.json',JSON.stringify(products,null,2)],
    ['meta.csv',meta],['google.tsv',google],['summary.json',JSON.stringify(summary,null,2)]]) {
    await fs.writeFile(path.join(output,name),content);
  }
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
