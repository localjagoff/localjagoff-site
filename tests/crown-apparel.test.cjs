const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {curateProduct,metaRows}=require('../lib/catalog.cjs');
const {GOOGLE_APPROVED_PRODUCT_IDS}=require('../lib/google-listing-policy.cjs');
const {shippingQuote}=require('../lib/shipping-policy.cjs');
const images=require('../lib/product-images.cjs');
const expected={475474242:{XS:5000,S:5000,M:5000,L:5000,XL:5000,'2XL':5200,'3XL':5400,'4XL':5600},475474870:{S:3000,M:3000,L:3000,XL:3000,'2XL':3200,'3XL':3400},475475243:{S:3999,M:3999,L:3999,XL:3999,'2XL':4199}};
test('Crown products preserve every provider size and price including owner-corrected 2XL crewneck',()=>{
  for(const [id,prices] of Object.entries(expected)){
    const product=curateProduct({sync_product:{id:Number(id),name:'Provider',is_ignored:false},sync_variants:Object.entries(prices).map(([size,amount],i)=>({id:Number(id)+i,sync_product_id:Number(id),name:'Provider / Black / '+size,size,color:'Black',synced:true,is_ignored:false,availability_status:'active',currency:'USD',retail_price:(amount/100).toFixed(2)}))},Number(id));
    assert.deepEqual(Object.fromEntries(product.variants.map(v=>[v.size,v.unit_amount])),prices);
    assert.equal(metaRows([product],'https://www.localjagoff.com').length,Object.keys(prices).length);
    assert.equal(GOOGLE_APPROVED_PRODUCT_IDS.has(Number(id)),false);
    assert.equal(shippingQuote([{id:Number(id),quantity:1}],6000).amount,0);
    assert.equal(shippingQuote([{id:Number(id),quantity:1}],3000).amount,id==='475474870'?495:879);
  }
});
test('each Crown product has four existing original mockup assets',()=>{
  for(const id of Object.keys(expected)){
    assert.equal(images[id].length,4);
    for(const image of images[id])assert.ok(fs.existsSync(path.join(__dirname,'../public',image)));
  }
});
