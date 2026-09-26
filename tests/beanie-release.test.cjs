const {test}=require('node:test');
const assert=require('node:assert/strict');
const {curateProduct,metaRows}=require('../lib/catalog.cjs');
const {APPROVED_PRODUCT_IDS}=require('../lib/commerce-policy.cjs');
const {GOOGLE_APPROVED_PRODUCT_IDS}=require('../lib/google-listing-policy.cjs');
const {googleTsv}=require('../lib/discovery.cjs');
const {shippingQuote}=require('../lib/shipping-policy.cjs');
const {inCategory}=require('../lib/storefront.cjs');
const ids=[475453387,475454664,475457459,475461765];
test('four approved black beanies retain provider offers and stay outside Google release',()=>{
  for(const id of ids){
    assert.ok(APPROVED_PRODUCT_IDS.has(id));
    assert.equal(GOOGLE_APPROVED_PRODUCT_IDS.has(id),false);
    const p=curateProduct({sync_product:{id,name:'Provider REVIEW',is_ignored:false,thumbnail_url:'https://example.com/front.png'},
      sync_variants:[{id:id+100,sync_product_id:id,name:'Provider REVIEW',color:'Black',size:'One size',synced:true,
        is_ignored:false,availability_status:'active',currency:'USD',retail_price:'30.00'}]},id);
    assert.equal(inCategory(p,'hats'),true);
    assert.doesNotMatch(p.name,/REVIEW/);
    assert.equal(p.variants[0].name,'Black / One size');
    assert.equal(p.variants[0].unit_amount,3000);
    assert.equal(p.images[0],'https://example.com/front.png');
    assert.equal(metaRows([p],'https://www.localjagoff.com')[0].price,'30.00 USD');
    assert.equal(googleTsv([p]).trim().split('\n').length,1);
    assert.equal(shippingQuote([{id,quantity:1}],3000).amount,469);
    assert.equal(shippingQuote([{id,quantity:2}],6000).amount,0);
  }
});
