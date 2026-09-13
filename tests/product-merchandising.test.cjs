const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PRODUCTS,merchandising,merchandiseProduct}=require('../lib/product-merchandising.cjs');
const {APPROVED_PRODUCT_IDS,getDisplayProductName}=require('../lib/commerce-policy.cjs');
const {loadProduct,curateProduct,metaRows}=require('../lib/catalog.cjs');
const {resolveCart}=require('../lib/commerce.cjs');
const {googleRows,openaiRows,productJsonLd}=require('../lib/discovery.cjs');
test('one-size hats do not repeat the product name as their variant label',()=>{
  const {variantLabel}=require('../lib/commerce-policy.cjs');
  for(const id of [428851907,428980566]){
    const name=PRODUCTS[id].name, variant={id:42,name,size:'One size',color:'Black',price:'30.00'};
    const p=merchandiseProduct({id,name,variants:[variant]});
    assert.equal(p.variants[0].name,'Black / One size');
    assert.equal(variantLabel({name},variant),'Black / One size');
    assert.equal(p.variants[0].id,42);
    assert.equal(p.variants[0].price,'30.00');
    assert.equal(variant.name,name);
  }
});
test('exactly 13 current designs, eight verified tees and three verified hoodies',()=>{
  assert.deepEqual(Object.keys(PRODUCTS).map(Number).sort(),[...APPROVED_PRODUCT_IDS].sort());
  assert.equal(Object.values(PRODUCTS).filter(p=>p.garment==='MC1082').length,8);
  assert.equal(merchandising(428983169).quality.model,'Cotton Heritage M2580');
  for(const id of [428821578,429208592]) assert.equal(merchandising(id).quality.model,'Gildan 18600 Heavy Blend');
  for(const p of Object.values(PRODUCTS).filter(p=>p.garment==='MC1082')) {
    assert.doesNotMatch(p.name,/Hoodie/);
  }
  assert.doesNotMatch(merchandising(429821634).quality.copy,/heavyweight|shrink|durab/i);
});
test('presentation keeps all variant IDs and authoritative offers and titles agree across channels',()=>{
  for(const id of APPROVED_PRODUCT_IDS){
    const p=curateProduct({sync_product:{id,name:'Provider name',is_ignored:false},sync_variants:[{
      id:id+100,sync_product_id:id,name:'Provider name / Black / S',size:'S',color:'Black',synced:true,
      is_ignored:false,availability_status:'active',currency:'USD',retail_price:'30.00'}]},id);
    const before=JSON.stringify(p.variants),name=getDisplayProductName({id});
    assert.equal(p.name,name);
    const title=name+' - Black / S';
    assert.equal(metaRows([p],'https://www.localjagoff.com')[0].title,title);
    assert.equal(googleRows([p])[0].title,title);
    assert.equal(openaiRows([p])[0].title,title);
    assert.equal(productJsonLd(p).hasVariant[0].name,title);
    assert.equal(JSON.stringify(merchandiseProduct(p).variants),before);
  }
});
test('both deleted products fail before any provider request for new offers or checkout',async()=>{
  for(const id of [430697388,430925200]){
    assert.equal(merchandising(id),null);
    assert.equal(await loadProduct(id,{fetchImpl:()=>assert.fail('no provider')}),null);
    await assert.rejects(resolveCart([{id,variant_id:123,quantity:1}],{
      apiKey:'fixture',fetchImpl:()=>assert.fail('no provider')}),/unavailable/);
  }
});
