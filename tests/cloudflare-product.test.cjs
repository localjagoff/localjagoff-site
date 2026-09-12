const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createProductRoute}=require('../lib/cloudflare-product-route.cjs');
const {curateProduct}=require('../lib/catalog.cjs');
const env={NATIVE_PRODUCT_ENABLED:'true',CATALOG_SNAPSHOT_ENABLED:'true',PUBLIC_CATALOG_DB:{},
  COMMERCE_ENV:'preview',CLOUDFLARE_WORKER_NAME:'localjagoff-review',
  SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev'};
const product=()=>curateProduct({sync_product:{id:430964873,name:'Fixture',is_ignored:false},
  sync_variants:['S','M'].map((size,i)=>({id:5292830954+i,sync_product_id:430964873,name:'Fixture / '+size,
    size,color:'Black',synced:true,is_ignored:false,availability_status:'active',currency:'USD',retail_price:'30.00'}))},430964873);
let renderer;
before(async()=>{
  if(!fs.existsSync(path.resolve(__dirname,'../.open-next/product-render.mjs'))){
    await require('../scripts/cloudflare-product-render.cjs').buildRenderer();
  }
  renderer=await import(pathToFileURL(path.resolve(__dirname,'../.open-next/product-render.mjs')).href);
});
test('native product HTML reuses original layout, styles, schema, build scripts and safe hydration data',async()=>{
  const p=product();p.description='Product </script><script>alert(1)</script>';
  const route=createProductRoute({...renderer,readProduct:async()=>p});
  const response=await route(new Request(env.SITE_URL+'/product/430964873?variant=5292830955'),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('x-robots-tag'),/noindex/);
  const html=await response.text();
  for(const text of ['product-layout','gallery-panel','info-panel','Size / Style','Add to Cart','mailto:hello@localjagoff.com',
    'fonts.googleapis.com','facebook-domain-verification','next-head-count','store-nav','store-footer'])assert.ok(html.includes(text),text);
  assert.match(html,/<link[^>]+href="\/_next\/static\/css\/[^\"]+"[^>]*>/);
  const data=JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)[1]);
  assert.equal(data.buildId,renderer.buildId);assert.equal(data.gssp,true);
  assert.equal(data.props.pageProps.initialVariantId,5292830955);
  assert.equal(data.query.variant,'5292830955');assert.equal(data.props.pageProps.initialProduct.description,p.description);
  assert.doesNotMatch(html,/<script>alert\(1\)/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.hasVariant.length,2);assert.equal(schema.hasVariant[1].offers.price,'30.00');
  for(const match of html.matchAll(/(?:src|href)="\/_next\/([^"?]+)"/g)){
    assert.ok(fs.existsSync(path.resolve(__dirname,'../.next',match[1])),match[1]);
  }
});
test('native data routes and stale/repeated variants preserve exact Next selection semantics',async()=>{
  const route=createProductRoute({...renderer,readProduct:async()=>product()});
  for(const [search,expected] of [['',5292830954],['?variant=5292830955',5292830955],['?variant=1',''],
    ['?variant=5292830955&variant=5292830954','']]){
    const r=await route(new Request(env.SITE_URL+'/_next/data/'+renderer.buildId+'/product/430964873.json'+search),env);
    assert.equal(r.status,200);assert.equal((await r.json()).pageProps.initialVariantId,expected);
  }
  const h=await route(new Request(env.SITE_URL+'/product/430964873',{method:'HEAD'}),env);
  assert.equal(h.status,200);assert.equal(await h.text(),'');
});
test('unavailable, removed, disabled and unrecognized routes fail closed without a live-provider fallback',async()=>{
  let reads=0;
  const route=createProductRoute({...renderer,readProduct:async()=>{reads++;throw Error('private provider details');}});
  for(const routePath of ['/admin/reviews','/api/webhook','/_next/data/old/product/430964873.json','/product/1/extra']){
    assert.equal(await route(new Request(env.SITE_URL+routePath),env),null);
  }
  assert.equal(await route(new Request(env.SITE_URL+'/product/430964873'),{...env,NATIVE_PRODUCT_ENABLED:'false'}),null);
  assert.equal(reads,0);
  const method=await route(new Request(env.SITE_URL+'/product/430964873',{method:'POST'}),env);
  assert.equal(method.status,405);assert.equal(reads,0);
  const outage=await route(new Request(env.SITE_URL+'/product/430964873'),env);
  assert.equal(outage.status,503);const html=await outage.text();
  assert.match(html,/Temporarily unavailable/);assert.doesNotMatch(html,/application\/ld\+json|private provider details/);
  const removed=createProductRoute({...renderer,readProduct:async()=>null});
  assert.equal((await removed(new Request(env.SITE_URL+'/product/430964873'),env)).status,404);
});
