const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, SMALL_GOODS, inCategory, inSmallCategory, sortCatalog, displayName, money } = require('../lib/storefront.cjs');

test('merchandise navigation includes permanent small-goods architecture', () => {
  assert.deepEqual(CATEGORIES.map(category => category.href), ['/tees','/hoodies','/hats','/stuff-nat']);
  assert.ok(SMALL_GOODS.includes('Keychains'));
  assert.ok(SMALL_GOODS.includes('Bumper stickers'));
});
test('tees include the approved 724 products without inventing small-goods inventory', () => {
  assert.equal(inCategory({category:'724'},'tees'),true);
  for(const category of ['tees','724','hoodies','hats']) assert.equal(inCategory({category},'stuff'),false);
  assert.equal(inCategory({category:'keychains'},'stuff'),true);
  assert.equal(inSmallCategory({category:'other',name:'Local Jagoff keychain'},'Keychains'),true);
  assert.equal(inSmallCategory({category:'other',name:'Local Jagoff keychain'},'Magnets'),false);
});
test('display sorting preserves authoritative objects and prices', () => {
  const products=[{name:'B',retail_price:'35.00'},{name:'A',retail_price:'30.00'}];
  const original=JSON.stringify(products);
  assert.equal(sortCatalog(products,'price-low')[0],products[1]);
  assert.equal(sortCatalog(products,'price-high')[0],products[0]);
  assert.equal(sortCatalog(products,'name')[0],products[1]);
  assert.equal(JSON.stringify(products),original);
  assert.equal(displayName('Local Jagoff Keystone Tee'),'Keystone Tee');
  assert.equal(money('30.00'),'$30');
  assert.equal(money('35.99'),'$35.99');
});
