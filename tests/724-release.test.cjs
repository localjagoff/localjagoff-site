const {test}=require('node:test');
const assert=require('node:assert/strict');
const {merchandiseProduct}=require('../lib/product-merchandising.cjs');
const {inCategory}=require('../lib/storefront.cjs');
const {SHIPPING_PRODUCTS,shippingQuote}=require('../lib/shipping-policy.cjs');
const {APPROVED_PRODUCT_IDS}=require('../lib/commerce-policy.cjs');
const {PUBLIC_ROUTES}=require('../scripts/cloudflare-static.cjs');
const {GOOGLE_APPROVED_PRODUCT_IDS}=require('../lib/google-listing-policy.cjs');
const newHoodies=[473981186,473991005,473987159,473987719,473990688];
test('724 is an overlapping regional collection, not a garment type',()=>{
  for(const id of newHoodies){
    const p=merchandiseProduct({id,name:'Provider hoodie',category:'724'});
    assert.equal(inCategory(p,'hoodies'),true);
    assert.equal(inCategory(p,'tees'),false);
    assert.equal(inCategory(p,'724'),[473981186,473991005].includes(id));
    assert.doesNotMatch(p.name,/Tee/);
  }
  const tee=merchandiseProduct({id:473985115});
  assert.equal(inCategory(tee,'tees'),true);
  assert.equal(inCategory(tee,'724'),true);
  assert.equal(inCategory(tee,'hoodies'),false);
  assert.equal(inCategory({id:430964873,category:'724'},'724'),true);
  assert.equal(inCategory({id:999999,category:'724'},'724'),false);
  assert.ok(PUBLIC_ROUTES.includes('/724'));
});
test('all six approved additions have explicit shipping classes and retain free60 policy',()=>{
  for(const id of [...newHoodies,473985115]){
    assert.ok(APPROVED_PRODUCT_IDS.has(id));
    assert.equal(GOOGLE_APPROVED_PRODUCT_IDS.has(id),false);
    assert.equal(SHIPPING_PRODUCTS[id],id===473985115?'tees':'hoodies');
    assert.equal(shippingQuote([{id,quantity:1}],5000).amount,id===473985115?495:879);
    assert.equal(shippingQuote([{id,quantity:2}],6000).amount,0);
  }
});
