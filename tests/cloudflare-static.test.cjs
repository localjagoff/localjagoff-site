const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {copyStaticAssets,planStaticAssets}=require('../scripts/cloudflare-static.cjs');

function fixture(t,pages,routes={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'localjagoff-static-test-'));
  t.after(()=>{
    assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('localjagoff-static-test-'));fs.rmSync(root,{recursive:true,force:true});
  });
  function write(relative,value){const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);}
  write('.next/server/pages-manifest.json',JSON.stringify(pages));write('.next/prerender-manifest.json',JSON.stringify({routes}));
  for(const file of Object.values(pages))if(file.endsWith('.html')&&!file.includes('..'))write('.next/server/'+file,'<!doctype html><title>Fixture</title>');
  return {root,write,read:file=>fs.readFileSync(path.join(root,'.open-next/assets',file),'utf8'),
    exists:file=>fs.existsSync(path.join(root,'.open-next/assets',file))};
}

test('empty prerender manifest still copies only explicitly known public auto-static pages',t=>{
  const f=fixture(t,{'/':'pages/index.html','/tees':'pages/tees.html','/contact':'pages/contact.html',
    '/admin/reviews':'pages/admin/reviews.html','/success':'pages/success.html','/review':'pages/review.html',
    '/checkout':'pages/checkout.html','/product/123':'pages/product/123.html','/api/private':'pages/api/private.html','/unknown':'pages/unknown.html'});
  assert.deepEqual(copyStaticAssets({root:f.root,env:{COMMERCE_ENV:'preview'}}),['/','/contact','/tees']);
  assert.ok(f.exists('index.html'));assert.ok(f.exists('tees.html'));
  for(const file of ['admin/reviews.html','success.html','review.html','checkout.html','product/123.html','api/private.html','unknown.html'])assert.equal(f.exists(file),false);
  assert.match(f.read('_headers'),/X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.match(f.read('_headers'),/Cache-Control: public, max-age=31536000, immutable/);
});

test('SSR, ISR, missing and mismapped files are not copied and prior allowlisted HTML cannot linger',t=>{
  const f=fixture(t,{'/':'pages/index.js','/tees':'pages/tees.html','/contact':'pages/contact.html','/privacy':'pages/admin/private.html'},
    {'/tees':{initialRevalidateSeconds:60}});
  f.write('.open-next/assets/index.html','stale');f.write('.open-next/assets/tees.html','stale');
  fs.unlinkSync(path.join(f.root,'.next/server/pages/contact.html'));
  assert.deepEqual(copyStaticAssets({root:f.root,env:{COMMERCE_ENV:'production'}}),[]);
  for(const name of ['index.html','tees.html','contact.html','privacy.html'])assert.equal(f.exists(name),false);
  assert.doesNotMatch(f.read('_headers'),/X-Robots-Tag/);
});

test('planning is read-only and explicit fully-static prerenders remain supported',t=>{
  const f=fixture(t,{'/':'pages/index.html'},{'/':{initialRevalidateSeconds:false}});
  assert.deepEqual(planStaticAssets(f.root).filter(x=>x.copy).map(x=>x.route),['/']);
  assert.equal(f.exists('index.html'),false);assert.equal(f.exists('_headers'),false);
});
