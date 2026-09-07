// Next's bundled parser expects the same inert dirname shim as OpenNext's runtime.
globalThis.__dirname??='';
const {Readable}=require('node:stream');
const getRawBody=require('next/dist/compiled/raw-body');
const contentType=require('next/dist/compiled/content-type');
const {decode}=require('node:querystring');
const {createWebhookHandler}=require('../api/webhook.js');
const {createPrintfulNotificationHandler}=require('./printful-notification-handler.cjs');
const {createContactHandler}=require('./contact-handler.cjs');
const {createReviewsHandler}=require('./reviews-handler.cjs');
const catalog=require('./catalog.cjs');
const discovery=require('./discovery.cjs');
const {siteOrigin}=require('./commerce.cjs');
const budget=require('./invocation-budget.cjs');

const ROUTES=Object.freeze({
  '/api/webhook':'stripe','/api/printful-events':'printful','/api/contact':'contact','/api/reviews':'reviews',
  '/api/get-products':'products','/api/meta-catalog':'meta','/feeds/products.tsv':'google',
  '/feeds/openai-products.jsonl':'openai','/sitemap.xml':'sitemap','/indexnow-key.txt':'indexnow',
});

async function parseBody(req,limit){
  // Match Next 15's parse-body contract using its bundled parsers, without loading the server.
  let type;
  try{type=contentType.parse(req.headers['content-type']||'text/plain');}
  catch{type=contentType.parse('text/plain');}
  let body;
  try{body=(await getRawBody(req,{encoding:type.parameters.charset||'utf-8',limit})).toString();}
  catch(error){throw Object.assign(new Error('Invalid body'),{statusCode:error.type==='entity.too.large'?413:400});}
  if(['application/json','application/ld+json'].includes(type.type)){
    try{return body.length===0?{}:JSON.parse(body);}
    catch{throw Object.assign(new Error('Invalid JSON'),{statusCode:400});}
  }
  return type.type==='application/x-www-form-urlencoded'?decode(body):body;
}

function nodeRequest(request){
  const req=request.body?Readable.fromWeb(request.body,{highWaterMark:0}):Readable.from([]);
  const url=new URL(request.url),query=Object.create(null);
  for(const [key,value] of url.searchParams){
    if(Object.hasOwn(query,key))query[key]=[].concat(query[key],value);
    else query[key]=value;
  }
  return Object.assign(req,{method:request.method,url:url.pathname+url.search,
    headers:Object.fromEntries(request.headers),query,socket:{remoteAddress:undefined}});
}

function nodeResponse(method){
  const headers=new Headers({'cache-control':'no-store'});
  let response;
  return {
    statusCode:200,
    get headersSent(){return Boolean(response);},
    setHeader(name,value){headers.delete(name);for(const item of Array.isArray(value)?value:[value])headers.append(name,String(item));},
    getHeader(name){return headers.get(name);},
    status(code){this.statusCode=code;return this;},
    json(body){this.setHeader('Content-Type','application/json; charset=utf-8');return this.end(JSON.stringify(body));},
    send(body){
      if(body!==null&&typeof body==='object'&&!ArrayBuffer.isView(body))return this.json(body);
      return this.end(body);
    },
    end(body){
      if(response)throw new Error('native_response_already_sent');
      const payload=typeof body==='string'?new TextEncoder().encode(body):body;
      response=new Response(method==='HEAD'||[204,205,304].includes(this.statusCode)?null:payload??null,
        {status:this.statusCode,headers});return this;
    },
    result(){if(!response)throw new Error('native_response_missing');return response;},
  };
}

function createApiAdapter({loadCatalog=catalog.loadCatalog,now=Date.now,
  webhookFactory=createWebhookHandler,printfulFactory=createPrintfulNotificationHandler,
  contactFactory=createContactHandler,reviewsFactory=createReviewsHandler}={}){
  const snapshots=new WeakMap();
  async function snapshot(env){
    const key=env.PRINTFUL_API_KEY,cached=snapshots.get(env);
    if(cached&&cached.key===key&&now()<cached.expires)return cached.products;
    // Share completed public data only. In-flight I/O must stay with its owning invocation.
    const products=await loadCatalog({apiKey:key});
    snapshots.set(env,{key,products,expires:now()+60000});return products;
  }
  return async function request(request,env){
    const pathname=new URL(request.url).pathname;
    if(!Object.hasOwn(ROUTES,pathname))return null;
    return budget.withBudget(async()=>{
      const kind=ROUTES[pathname],req=nodeRequest(request),res=nodeResponse(req.method);
      if(env.COMMERCE_ENV==='preview')res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
      try{
        // Next rejects OPTIONS for page routes before their server-side handlers.
        if(req.method==='OPTIONS'&&['google','openai','sitemap','indexnow'].includes(kind))res.status(400).end();
        else if(kind==='stripe')await webhookFactory({env})(req,res);
        else if(kind==='printful')await printfulFactory({env})(req,res);
        else if(kind==='contact'||kind==='reviews'){
          req.body=await parseBody(req,kind==='contact'?'20kb':'10kb');
          await (kind==='contact'?contactFactory:reviewsFactory)({env})(req,res);
        }else if(['google','openai','sitemap'].includes(kind)){
          await discovery.serveDiscovery({req,res},()=>snapshot(env),kind);
        }else if(kind==='indexnow'){
          res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
          res.setHeader('Allow','GET, HEAD');res.statusCode=['GET','HEAD'].includes(req.method)?200:405;
          res.end(req.method==='GET'?discovery.INDEXNOW_KEY:undefined);
        }else if(req.method!=='GET')res.status(405).json({error:'Method not allowed'});
        else{
          try{
            const products=await snapshot(env);
            if(kind==='products')res.json(products);
            else{
              const rows=catalog.metaRows(products,siteOrigin(env));
              res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
              res.send(catalog.feedCsv(rows));
            }
          }catch{res.status(503).json({error:kind==='products'?'Products temporarily unavailable':'Catalog temporarily unavailable'});}
        }
      }catch(error){
        if(!res.headersSent){
          const status=[400,413,415].includes(error.statusCode)?error.statusCode:500;
          res.status(status).json({error:status===500?'Request temporarily unavailable':status===413?'Payload too large':'Invalid request body'});
        }
      }finally{req.destroy();}
      const response=res.result();
      if(env.COMMERCE_ENV==='preview')response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      return response;
    });
  };
}

module.exports={ROUTES,createApiAdapter,request:createApiAdapter()};
