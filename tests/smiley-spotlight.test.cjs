const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {curateProduct,metaRows}=require('../lib/catalog.cjs');
const {googleTsv,googleRows,productJsonLd}=require('../lib/discovery.cjs');
const {imagesForVariant}=require('../lib/variant-images.cjs');
const {shippingQuote}=require('../lib/shipping-policy.cjs');
const {FEATURED_PRODUCT_IDS,SPOTLIGHT_PRODUCT_IDS,sortCatalog}=require('../lib/storefront.cjs');

function product(id) {
  return curateProduct({sync_product:{id,name:'Provider tee',is_ignored:false},
    sync_variants:['Black','White'].flatMap((color,c)=>['S','M','L','XL','2XL','3XL'].map((size,i)=>({
      id:id+100+c*10+i,sync_product_id:id,name:'Provider tee / '+color+' / '+size,
      size,color,synced:true,is_ignored:false,availability_status:'active',currency:'USD',
      retail_price:i<4?'35.00':i===4?'37.00':'39.00'
    })))},id);
}

test('spotlight tees expose only owner-approved color galleries and offers',()=>{
  for(const id of SPOTLIGHT_PRODUCT_IDS) {
    const p=product(id);
    assert.equal(p.category,'tees');
    assert.equal(p.variants.length,id===473808622?6:12);
    assert.equal(p.images.length,id===473808622?2:4);
    if(id===473808622) {
      assert.ok(p.variants.every(v=>v.color==='White'));
      assert.ok(p.images.every(image=>image.includes('/white-')));
      assert.ok(!p.description.includes('Black'));
    }
    assert.match(p.description,/left-chest.*back/s);
    for(const image of p.images) assert.ok(fs.existsSync(path.join(__dirname,'../public',image)));
    for(const v of p.variants) {
      const images=imagesForVariant(p,v);
      assert.equal(images.length,2);
      assert.ok(images.every(image=>image.includes('/'+v.color.toLowerCase()+'-')));
      assert.equal(metaRows([p],'https://www.localjagoff.com').find(row=>row.id.endsWith('_'+v.id)).image_link,
        'https://www.localjagoff.com'+images[0]);
      assert.equal(googleRows([p]).find(row=>row.id.endsWith('_'+v.id)).image_link,'https://www.localjagoff.com'+images[0]);
      assert.deepEqual(productJsonLd(p).hasVariant.find(row=>row.sku.endsWith('_'+v.id)).image,images.map(image=>'https://www.localjagoff.com'+image));
    }
    assert.equal(googleTsv([p]).trim().split('\n').length,1,'not released to Google');
    assert.equal(shippingQuote([{id,quantity:1}],3500).amount,495);
    assert.equal(shippingQuote([{id,quantity:2}],7000).amount,0);
  }
});

test('spotlight is independent of the previous featured four and Script Tee top five',()=>{
  assert.deepEqual(SPOTLIGHT_PRODUCT_IDS,[473808622,473834484]);
  const ids=[...SPOTLIGHT_PRODUCT_IDS,428982889,473689891,...FEATURED_PRODUCT_IDS];
  assert.deepEqual(sortCatalog(ids.map(id=>({id})),'curated').map(p=>p.id),
    [...FEATURED_PRODUCT_IDS,473689891,...SPOTLIGHT_PRODUCT_IDS,428982889]);
  const old={id:428982889,images:['/old-front.jpg','/old-back.jpg']};
  assert.deepEqual(imagesForVariant(old,{color:'White'}),old.images);
});
