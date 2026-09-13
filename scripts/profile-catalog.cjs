const path=require('node:path');
const fs=require('node:fs/promises');
const os=require('node:os');
const {once}=require('node:events');
const {build}=require('esbuild');
const {Miniflare,Log,LogLevel}=require('miniflare');
const {APPROVED_PRODUCT_IDS,STORE_ID}=require('../lib/commerce-policy.cjs');

const ORIGIN='https://catalog-profile.invalid';
const KEY='fixture-catalog-only';
const PHASES=Object.freeze({first_native:1,parse:2000,curate:2000,serialize:2000,
  loader_parsed:500,loader_raw:500,cold_native:60,warm_native:500});

function fixture(){
  const ids=[...APPROVED_PRODUCT_IDS];
  if(ids.length>24)throw Error('Review fixture exceeds bounded catalog loader');
  const records=[{url:`https://api.printful.com/sync/products?store_id=${STORE_ID}&limit=100&offset=0`,
    raw:JSON.stringify({code:200,result:ids.map(id=>({id})),paging:{offset:0,total:ids.length}})}];
  ids.forEach((id,index)=>{
    const name='Fixture tee '+index;
    records.push({url:`https://api.printful.com/sync/products/${id}?store_id=${STORE_ID}`,
      raw:JSON.stringify({code:200,result:{sync_product:{id,name,is_ignored:false},
        sync_variants:['XS','S','M','L','XL','2XL'].map((size,i)=>({id:5292830954+index*6+i,
          sync_product_id:id,name:name+' / Black / '+size,synced:true,is_ignored:false,
          availability_status:'active',retail_price:'30.00',currency:'USD',size,color:'Black',sku:`fixture-${index}-${size}`}))}})});
  });
  return records;
}

function fixtureTransport(records,counters){
  const bodies=new Map(records.map(record=>[record.url,record.raw]));
  return request=>{
    if(request.method!=='GET'||request.headers.get('authorization')!=='Bearer '+KEY||
      request.headers.get('x-pf-store-id')!==STORE_ID||!bodies.has(request.url)){
      counters.rejected++;throw Error('Unrecognized benchmark outbound request');
    }
    counters.fixtureRequests++;
    // No fallback transport exists: provider-shaped URLs terminate in this local function.
    return new Response(bodies.get(request.url),{headers:{'content-type':'application/json'}});
  };
}

// Serialized into workerd by esbuild, with production imports left unchanged.
function workerHarness(catalog,api,budget,records){
  const parsed=records.map(record=>JSON.parse(record.raw));
  const byURL=new Map(records.map((record,index)=>[record.url,{raw:record.raw,parsed:parsed[index]}]));
  const curated=parsed.slice(1).map(record=>catalog.curateProduct(record.result,record.result.sync_product.id)).sort((a,b)=>b.id-a.id);
  const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',SITE_URL:'https://catalog-profile.invalid',
    PRINTFUL_API_KEY:'fixture-catalog-only',CHECKOUT_PAUSED:'true',CUSTOMER_EMAIL_ENABLED:'false',COMMUNICATIONS_ENABLED:'false'};
  let nativeCalls=0,localCalls=0,sink=0;
  const transport=globalThis.fetch;
  globalThis.fetch=budget.installBudget((...args)=>{nativeCalls++;return transport(...args);});
  console.info=()=>{};
  const adapter=api.createApiAdapter();
  const warmAdapter=api.createApiAdapter({loadCatalog:async()=>curated});
  const encoder=new TextEncoder();
  async function localParsed(url){localCalls++;const item=byURL.get(url);if(!item)throw Error('Unknown local URL');
    return {status:200,ok:true,json:async()=>item.parsed};}
  async function localRaw(url){localCalls++;const item=byURL.get(url);if(!item)throw Error('Unknown local URL');
    return new Response(item.raw,{headers:{'content-type':'application/json'}});}
  function parsePhase(){for(const record of records){const data=JSON.parse(record.raw);sink+=data.result.sync_variants?.length||data.result.length;}}
  function curatePhase(){for(const data of parsed.slice(1))sink+=catalog.curateProduct(data.result,data.result.sync_product.id).variants.length;}
  function serializePhase(){sink+=encoder.encode(JSON.stringify(curated)).byteLength;}
  async function loaderParsedPhase(){sink+=(await catalog.loadCatalog({apiKey:env.PRINTFUL_API_KEY,fetchImpl:localParsed})).length;}
  async function loaderRawPhase(){sink+=(await catalog.loadCatalog({apiKey:env.PRINTFUL_API_KEY,fetchImpl:localRaw})).length;}
  async function nativePhase(warm){
    const response=await (warm?warmAdapter:adapter)(new Request('https://catalog-profile.invalid/api/get-products'),warm?env:{...env});
    if(response.status!==200)throw Error('Native catalog did not succeed');
    sink+=(await response.arrayBuffer()).byteLength;
  }
  const phases={parse:parsePhase,curate:curatePhase,serialize:serializePhase,
    loader_parsed:loaderParsedPhase,loader_raw:loaderRawPhase,first_native:()=>nativePhase(false),
    cold_native:()=>nativePhase(false),warm_native:()=>nativePhase(true)};
  return {async fetch(request){
    const url=new URL(request.url),phase=url.pathname.slice(1),iterations=Number(url.searchParams.get('n'));
    if(request.method!=='GET'||url.origin!=='https://catalog-profile.invalid'||!Object.hasOwn(phases,phase)||
      !Number.isInteger(iterations)||iterations<1||iterations>4000)return new Response(null,{status:400});
    const before={nativeCalls,localCalls};
    if(phase==='warm_native')await nativePhase(true);
    for(let i=0;i<iterations;i++)await phases[phase]();
    return Response.json({phase,iterations,nativeCalls:nativeCalls-before.nativeCalls,localCalls:localCalls-before.localCalls,
      products:curated.length,variants:curated.reduce((sum,p)=>sum+p.variants.length,0),sink});
  }};
}

async function workerBundle(records){
  const root=path.resolve(__dirname,'..');
  const {outputFiles}=await build({stdin:{resolveDir:root,sourcefile:'catalog-profile-worker.js',contents:`
    import catalog from './lib/catalog.cjs';
    import api from './lib/cloudflare-api-adapter.cjs';
    import budget from './lib/invocation-budget.cjs';
    const harness=${workerHarness.toString()};
    export default harness(catalog,api,budget,${JSON.stringify(records)});
  `},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',
    external:['node:*','cloudflare:*'],banner:{js:"import {createRequire} from 'node:module';const require=createRequire('file:///worker.js');"}});
  return outputFiles[0].text;
}

async function runtime(contents,records,transportMode='loopback'){
  if(!['loopback','service'].includes(transportMode))throw Error('Invalid fixture transport');
  const counters={fixtureRequests:0,rejected:0};
  const provider=`const bodies=new Map(${JSON.stringify(records.map(record=>[record.url,record.raw]))});
    export default {fetch(request){
      if(request.method!=='GET'||request.headers.get('authorization')!=='Bearer fixture-catalog-only'||
        request.headers.get('x-pf-store-id')!=='${STORE_ID}'||!bodies.has(request.url))return new Response(null,{status:400});
      return new Response(bodies.get(request.url),{headers:{'content-type':'application/json'}});
    }};`;
  const mf=new Miniflare({host:'127.0.0.1',port:0,inspectorHost:'127.0.0.1',inspectorPort:0,
    cf:false,telemetry:{enabled:false},log:new Log(LogLevel.ERROR),workers:[{
      config:{name:'catalog-profile',type:'worker',compatibilityDate:'2026-09-07',compatibilityFlags:['nodejs_compat'],
        manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents}}}},
      dev:{outboundService:transportMode==='service'?{type:'worker',worker:'catalog-fixture'}:
        {type:'fetcher',handler:fixtureTransport(records,counters)}}},
      ...(transportMode==='service'?[{config:{name:'catalog-fixture',type:'worker',compatibilityDate:'2026-09-07',
        manifest:{mainModule:'provider.js',modules:{'provider.js':{type:'esm',contents:provider}}}},
        dev:{outboundService:{type:'fetcher',handler:()=>{counters.rejected++;throw Error('Fixture service cannot fetch');}}}}]:[])]});
  try{await mf.ready;return {mf,counters};}catch(error){await mf.dispose();throw error;}
}

async function connectInspector(mf){
  const {WebSocket}=require('ws');
  const url=new URL('/core:user:catalog-profile',(await mf.getInspectorURL()).href);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Inspector must be loopback');
  const socket=new WebSocket(url);
  await once(socket,'open');
  let id=0;const pending=new Map();
  socket.on('message',raw=>{
    const message=JSON.parse(raw.toString()),entry=pending.get(message.id);
    if(!entry)return;pending.delete(message.id);clearTimeout(entry.timer);
    if(message.error)entry.reject(Error(message.error.message));else entry.resolve(message.result);
  });
  socket.on('error',()=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('Inspector disconnected'));}pending.clear();});
  return {send(method,params={}){return new Promise((resolve,reject)=>{
    const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(Error('Inspector timeout: '+method));},30000);
    pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params}));
  });},close(){socket.terminate();}};
}

function summarize(profile,iterations){
  const nodes=new Map(profile.nodes.map(node=>[node.id,node]));
  const totals={active_us:0,idle_us:0,unattributed_us:0,gc_us:0,long_gap_active_us:0},frames=new Map();
  if(!profile.samples?.length||profile.samples.length!==profile.timeDeltas?.length)throw Error('Missing CPU samples');
  profile.samples.forEach((id,index)=>{
    const frame=nodes.get(id)?.callFrame;if(!frame)throw Error('Invalid CPU profile node');
    const duration=profile.timeDeltas[index];if(!Number.isFinite(duration)||duration<0)throw Error('Invalid CPU sample duration');
    const name=frame.functionName||'(anonymous)';
    if(name==='(idle)')totals.idle_us+=duration;
    else if(['(program)','(root)'].includes(name))totals.unattributed_us+=duration;
    else{
      totals.active_us+=duration;if(name==='(garbage collector)')totals.gc_us+=duration;
      // Preserve raw samples; flag long deltas instead of silently calling scheduler gaps CPU.
      if(duration>5000)totals.long_gap_active_us+=duration;
      const key=name+' '+frame.url+':'+(frame.lineNumber+1);frames.set(key,(frames.get(key)||0)+duration);
    }
  });
  return {sample_count:profile.samples.length,sampled_active_ms_per_iteration:totals.active_us/1000/iterations,
    active_long_gap_ms_per_iteration:totals.long_gap_active_us/1000/iterations,
    idle_ms:totals.idle_us/1000,unattributed_ms:totals.unattributed_us/1000,gc_ms:totals.gc_us/1000,
    max_sample_gap_ms:Math.max(...profile.timeDeltas)/1000,
    top_frames:[...frames].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([frame,us])=>({frame,sampled_ms:us/1000}))};
}

async function run({rounds=3,phases=PHASES,outputDir,transportMode='loopback',onProgress=()=>{}}={}){
  if(!Number.isInteger(rounds)||rounds<1||rounds>5)throw Error('Invalid rounds');
  for(const [phase,n] of Object.entries(phases))if(!Object.hasOwn(PHASES,phase)||!Number.isInteger(n)||n<1||n>4000)throw Error('Invalid phase');
  const records=fixture(),contents=await workerBundle(records),results=[];
  const directory=outputDir||await fs.mkdtemp(path.join(os.tmpdir(),'localjagoff-catalog-profile-'));
  await fs.mkdir(directory,{recursive:true});
  let fixtureRequests=0;
  for(let round=1;round<=rounds;round++){
    const {mf,counters}=await runtime(contents,records,transportMode);let inspector;
    try{
      inspector=await connectInspector(mf);await inspector.send('Profiler.enable');
      await inspector.send('Profiler.setSamplingInterval',{interval:100});
      for(const [phase,iterations] of Object.entries(phases)){
        onProgress({round,phase});
        await inspector.send('Profiler.start');
        const response=await mf.dispatchFetch(`${ORIGIN}/${phase}?n=${iterations}`);
        const data=await response.json();
        const {profile}=await inspector.send('Profiler.stop');
        if(response.status!==200||data.products!==records.length-1||data.variants!==(records.length-1)*6)throw Error('Benchmark result mismatch');
        const expected=['first_native','cold_native'].includes(phase)?records.length*iterations:0;
        if(data.nativeCalls!==expected||counters.rejected)throw Error('Unexpected benchmark I/O');
        if(transportMode==='service')fixtureRequests+=expected;
        const filename=`round-${round}-${phase}.cpuprofile`;
        await fs.writeFile(path.join(directory,filename),JSON.stringify(profile));
        results.push({round,...data,...summarize(profile,iterations),profile:filename});
      }
      fixtureRequests+=counters.fixtureRequests;
    }finally{inspector?.close();await mf.dispose();}
  }
  const report={runtime:'local workerd / DevTools Profiler',transport:transportMode,sampling_interval_us:100,rounds,
    fixture:{products:records.length-1,variants_per_product:6,responses:records.length,raw_bytes:records.reduce((sum,r)=>sum+Buffer.byteLength(r.raw),0)},
    external_provider_requests:0,local_fixture_requests:fixtureRequests,
    caveats:['Sampled active time is an estimate, not hosted billed CPU; idle and program samples are reported separately.',
      'Active sample deltas over 5 ms are flagged, not removed: scheduler or I/O suspension may inflate these estimates.',
      'First-native measures the first request after module initialization; subsequent cold-native runs force cache misses in the same isolate.',
      'Fixture payloads follow repository tests; they do not establish actual provider response sizes.',
      'The local outbound handler never forwards requests. No deployment configuration or runtime credentials are loaded.'],results};
  await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
  return {directory,report};
}

if(require.main===module){
  if(process.argv.length!==2){console.error('Usage: node scripts/profile-catalog.cjs');process.exitCode=1;}
  else run({onProgress:({round,phase})=>console.log(`Profiling round ${round}: ${phase}`)}).then(({directory,report})=>{
    console.log(JSON.stringify({directory,fixture:report.fixture,external_provider_requests:0,
      results:report.results.map(({round,phase,sampled_active_ms_per_iteration,idle_ms,unattributed_ms})=>
        ({round,phase,sampled_active_ms_per_iteration,idle_ms,unattributed_ms}))},null,2));
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={fixture,fixtureTransport,workerBundle,runtime,connectInspector,summarize,run};
