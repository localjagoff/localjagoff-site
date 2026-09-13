const {test}=require('node:test');
const assert=require('node:assert/strict');
const profile=require('../scripts/profile-catalog.cjs');
const {curateProduct}=require('../lib/catalog.cjs');

test('benchmark uses 18 fixed synthetic raw responses and 17 complete six-variant products',()=>{
  const records=profile.fixture();assert.equal(records.length,18);
  assert.equal(JSON.parse(records[0].raw).paging.total,17);
  const products=records.slice(1).map(record=>{
    const data=JSON.parse(record.raw).result;
    assert.equal(data.sync_variants.length,6);return curateProduct(data,data.sync_product.id);
  });
  assert.equal(products.length,17);assert.equal(products.flatMap(product=>product.variants).length,102);
  assert.equal(new Set(products.flatMap(product=>product.variants.map(v=>v.id))).size,102);
});

test('provider-shaped requests terminate locally and unknown URLs, IDs, credentials or writes fail closed',async()=>{
  const records=profile.fixture(),counters={fixtureRequests:0,rejected:0},transport=profile.fixtureTransport(records,counters);
  const headers={authorization:'Bearer fixture-catalog-only','x-pf-store-id':'18032822'};
  assert.equal(await transport(new Request(records[0].url,{headers})).text(),records[0].raw);
  for(const request of [new Request('https://evil.invalid',{headers}),new Request(records[1].url+'&extra=1',{headers}),
    new Request(records[0].url,{method:'POST',headers}),new Request(records[0].url)]){
    assert.throws(()=>transport(request),/Unrecognized/);
  }
  assert.equal(counters.fixtureRequests,1);assert.equal(counters.rejected,4);
});

test('CPU attribution excludes idle and unclassified program samples rather than calling wall time CPU',()=>{
  const summary=profile.summarize({nodes:['parsePhase','(idle)','(program)','(garbage collector)'].map((functionName,i)=>
    ({id:i+1,callFrame:{functionName,url:'worker.js',lineNumber:0}})),samples:[1,2,3,4],timeDeltas:[2000,10000,5000,1000]},10);
  assert.equal(summary.sampled_active_ms_per_iteration,0.3);assert.equal(summary.idle_ms,10);
  assert.equal(summary.unattributed_ms,5);assert.equal(summary.gc_ms,1);
  assert.throws(()=>profile.summarize({nodes:[],samples:[],timeDeltas:[]},1),/Missing CPU samples/);
});

test('native workerd benchmark exercises the actual catalog and adapter with DevTools CPU sampling', {timeout:45000},async()=>{
  const {directory,report}=await profile.run({rounds:1,phases:{first_native:1,parse:200,curate:200,loader_parsed:2,loader_raw:2,cold_native:2,warm_native:2}});
  assert.equal(report.external_provider_requests,0);assert.equal(report.local_fixture_requests,54);
  assert.equal(report.results.length,7);assert.ok(directory.includes('localjagoff-catalog-profile-'));
  for(const result of report.results){
    assert.ok(result.sample_count>0);assert.equal(result.products,17);assert.equal(result.variants,102);
    if(result.phase.startsWith('loader_'))assert.equal(result.localCalls,36);
  }
});

test('in-workerd fixture service also supports cold reads and warm hits without external transport', {timeout:45000},async()=>{
  const {report}=await profile.run({rounds:1,phases:{cold_native:2,warm_native:2},transportMode:'service'});
  assert.equal(report.transport,'service');assert.equal(report.external_provider_requests,0);
  assert.equal(report.local_fixture_requests,36);assert.equal(report.results[1].nativeCalls,0);
});
