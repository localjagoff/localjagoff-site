const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Cloudflare builds default to Preview and require an explicit valid Production environment',()=>{
  const file=path.resolve(__dirname,'../scripts/cloudflare-build.cjs'),source=fs.readFileSync(file,'utf8');
  for(const supplied of [undefined,'preview','production','invalid']){
    const calls=[];
    const sandbox={__dirname:path.dirname(file),process:{env:supplied?{COMMERCE_ENV:supplied}:{},execPath:'node',exit:()=>assert.fail('unexpected exit')},
      require:name=>name==='node:child_process'?{spawnSync:(_,args,options)=>{calls.push(options.env);return {status:0};}}:require(name)};
    if(supplied==='invalid'){assert.throws(()=>vm.runInNewContext(source,sandbox),/Invalid Cloudflare build environment/);assert.equal(calls.length,0);}
    else{vm.runInNewContext(source,sandbox);assert.equal(calls.length,5);assert.ok(calls.every(e=>e.COMMERCE_ENV===(supplied||'preview')&&e.NEXT_PUBLIC_HOST_PLATFORM==='cloudflare'));}
  }
});
test('Production activation retains isolation, canonical routes and exclusive schedules',()=>{
  const production=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../wrangler.production.jsonc'),'utf8'));
  const review=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../wrangler.jsonc'),'utf8'));
  assert.equal(production.workers_dev,false);assert.equal(production.preview_urls,false);
  assert.deepEqual(production.triggers.crons,['*/5 * * * *','2 * * * *','17 4 * * *','1-56/5 * * * *']);
  assert.deepEqual(review.triggers.crons,[]);
  assert.deepEqual(production.routes,[{pattern:'www.localjagoff.com/*',zone_name:'localjagoff.com'},
    {pattern:'localjagoff.com/*',zone_name:'localjagoff.com'}]);
  assert.equal(production.vars.CHECKOUT_PAUSED,'false');
  assert.equal(production.vars.COMMUNICATIONS_ENABLED,'true');assert.equal(production.vars.CUSTOMER_EMAIL_ENABLED,'true');
  assert.equal(review.vars.CHECKOUT_PAUSED,'true');assert.equal(review.vars.CUSTOMER_EMAIL_ENABLED,'false');
  assert.equal(production.name,production.vars.COMMERCE_PRODUCTION_WORKER);
  assert.notEqual(production.d1_databases[0].database_id,review.d1_databases[0].database_id);
  assert.equal(production.vars.STRIPE_SECRET_KEY,undefined);assert.equal(production.vars.DATABASE_URL,undefined);
});
