const {test}=require('node:test');
const assert=require('node:assert/strict');
const {merchandiseProduct}=require('../lib/product-merchandising.cjs');
const {inCategory,CATEGORIES}=require('../lib/storefront.cjs');
const {detectCategory}=require('../lib/commerce-policy.cjs');
const {SHIPPING_PRODUCTS,shippingQuote}=require('../lib/shipping-policy.cjs');
test('crewnecks have a dedicated collection without changing fulfillment rates or offers',()=>{
  const variants=[{name:'2XL',size:'2XL',price:'41.99',unit_amount:4199}];
  const p=merchandiseProduct({id:475475243,category:'hoodies',variants});
  assert.equal(p.category,'sweatshirts');
  assert.equal(inCategory(p,'sweatshirts'),true);
  assert.equal(inCategory(p,'hoodies'),false);
  assert.deepEqual(p.variants,variants);
  assert.equal(CATEGORIES.find(c=>c.key==='sweatshirts').href,'/sweatshirts');
  assert.equal(SHIPPING_PRODUCTS[p.id],'hoodies');
  assert.equal(shippingQuote([{id:p.id,quantity:1}],4199).amount,879);
  for(const name of ['Crewneck Sweatshirt','NuBlend Sweatshirt','Crewneck'])assert.equal(detectCategory(name),'sweatshirts');
  for(const name of ['Pullover Hoodie','Hooded Sweatshirt','Zip Hoodie'])assert.equal(detectCategory(name),'hoodies');
});
