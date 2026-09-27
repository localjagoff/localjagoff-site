const test = require('node:test');
const assert = require('node:assert/strict');
const { LAYERS, BEANIES, availableVariants, fitItems, mergeFit } = require('../lib/matching-fit.cjs');
const { shippingQuote } = require('../lib/shipping-policy.cjs');
const products = [
  [LAYERS[0], [['XS',5000],['S',5000],['M',5000],['L',5000],['XL',5000],['2XL',5200],['3XL',5400],['4XL',5600]]],
  [LAYERS[1], [['S',3999],['M',3999],['L',3999],['XL',3999],['2XL',4199]]],
  ...BEANIES.map(id => [id, [['One size',3000]]]),
].map(([id, sizes]) => ({ id, name: String(id), availability:'in stock', thumbnail_url:'/photo.jpg', variants:sizes.map(([size,unit_amount],i)=>({ id:id*10+i, size, name:`Black / ${size}`, color:'Black',unit_amount,currency:'USD',availability:'in stock' })) }));
test('all 26 matching fit combinations preserve exact variant prices and qualify for shipping', () => {
  let combinations = 0;
  for (const product of products.slice(0,2)) for (const variant of product.variants) for (const hat of BEANIES) {
    const items = fitItems(products, product.id, variant.id, hat);
    assert.equal(items.length,2); assert.equal(items[0].variant_id,variant.id);
    assert.equal(items[0].price,variant.unit_amount/100); assert.equal(items[1].price,30);
    assert.equal(shippingQuote(items,items.reduce((s,p)=>s+Math.round(p.price*100),0)).amount,0);
    combinations++;
  }
  assert.equal(combinations,26);
  assert.equal(fitItems(products,LAYERS[1],products[1].variants[4].id,BEANIES[0])[0].price,41.99);
});
test('rejects missing, wrong-product, stale, unavailable, wrong-color and invalid-priced variants', () => {
  assert.throws(()=>fitItems(products,LAYERS[0],'',BEANIES[0]));
  assert.throws(()=>fitItems(products,LAYERS[0],products[1].variants[0].id,BEANIES[0]));
  assert.throws(()=>fitItems(products,123,products[0].variants[0].id,BEANIES[0]));
  for (const change of [{availability:'out of stock'},{color:'White'},{unit_amount:0},{currency:'EUR'}]) {
    const next=structuredClone(products);Object.assign(next[0].variants[0],change);
    assert.throws(()=>fitItems(next,LAYERS[0],next[0].variants[0].id,BEANIES[0]));
  }
  const next=structuredClone(products);next[2].availability='out of stock';
  assert.throws(()=>fitItems(next,LAYERS[0],next[0].variants[0].id,BEANIES[0]));
  assert.deepEqual(availableVariants(null),[]);
});
test('pair merge keeps unrelated cart items and merges only exact variants', () => {
  const items=fitItems(products,LAYERS[0],products[0].variants[0].id,BEANIES[0]);
  const cart=[{id:7,variant_id:8,quantity:2}, {...items[0],quantity:2}];
  const before=JSON.stringify(cart),next=mergeFit(cart,items);
  assert.equal(JSON.stringify(cart),before);assert.deepEqual(next[0],cart[0]);assert.equal(next[1].quantity,3);assert.equal(next[2].quantity,1);
  assert.equal(mergeFit(null,items).length,2);
});
test('quantity limit rejects entire pair without partial mutation', () => {
  const items=fitItems(products,LAYERS[0],products[0].variants[0].id,BEANIES[0]);
  const cart=[{...items[0],quantity:1},{...items[1],quantity:99}], before=JSON.stringify(cart);
  assert.throws(()=>mergeFit(cart,items),/adjust/);assert.equal(JSON.stringify(cart),before);
});
