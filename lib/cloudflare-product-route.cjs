const {configured,readProductSnapshot}=require('./catalog-snapshot.cjs');

function createProductRoute({renderProduct,buildId,readProduct=readProductSnapshot}){
  return async(request,env)=>{
    if(env.NATIVE_PRODUCT_ENABLED!=='true'||!configured(env))return null;
    const url=new URL(request.url);
    const page=/^\/product\/([1-9]\d*)$/.exec(url.pathname);
    const data=/^\/_next\/data\/([A-Za-z0-9_-]+)\/product\/([1-9]\d*)\.json$/.exec(url.pathname);
    if(!page&&(!data||data[1]!==buildId))return null;
    const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
    if(env.COMMERCE_ENV==='preview')headers['x-robots-tag']='noindex, nofollow, noarchive';
    const reply=(status,body,type='text/plain; charset=utf-8')=>new Response(request.method==='HEAD'?null:body,
      {status,headers:{...headers,'content-type':type}});
    if(!['GET','HEAD'].includes(request.method)){
      headers.allow='GET, HEAD';return reply(405,'Method not allowed');
    }
    const id=page?.[1]||data[2];
    if(!Number.isSafeInteger(Number(id)))return reply(404,'Product not found');
    const query={};
    for(const [key,value] of url.searchParams){
      if(Object.hasOwn(query,key))query[key]=[].concat(query[key],value);
      else Object.defineProperty(query,key,{value,writable:true,enumerable:true,configurable:true});
    }
    query.id=id;
    let product,status=200;
    try{product=await readProduct(env,id);}
    catch{product=null;status=503;headers['retry-after']='60';}
    if(status===200&&!product)return data?reply(404,JSON.stringify({notFound:true}),'application/json'):reply(404,'Product not found');
    const variant=query.variant===undefined?product?.variants[0]:product?.variants.find(v=>String(v.id)===query.variant);
    const props={initialProductId:id,initialProduct:product,initialVariantId:variant?.id||'',unavailable:status===503};
    if(data)return reply(status,JSON.stringify({pageProps:props,__N_SSP:true}),'application/json; charset=utf-8');
    return reply(status,renderProduct(props,query),'text/html; charset=utf-8');
  };
}
module.exports={createProductRoute};
