const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApiAdapter}=require('../lib/cloudflare-api-adapter.cjs');
const {createCheckoutHandler}=require('../api/create-checkout-session.js');
const {createExecutor}=require('../lib/commerce-executor.cjs');
const env={CLOUDFLARE_WORKER_NAME:'localjagoff-review',COMMERCE_ENV:'preview',COMMERCE_EXECUTOR_ENABLED:'true',
  SITE_URL:'https://localjagoff-review.localjagoff-site.workers.dev',STRIPE_SECRET_KEY:'sk_test_fixture',PRINTFUL_API_KEY:'fixture',
  CHECKOUT_PAUSED:'false',COMMUNICATIONS_ENABLED:'false',CUSTOMER_EMAIL_ENABLED:'false'};
const request=(body,method='POST')=>new Request(env.SITE_URL+'/api/create-checkout-session',{
  method,...(method==='POST'?{headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}:{})});
test('executor checkout uses original authoritative handler and runtime-only environment without queue signal',async()=>{
  let sessions=[],reads=0;
  const api=createApiAdapter({checkoutFactory:({env})=>createCheckoutHandler({env,
    stripeFactory:()=>({checkout:{sessions:{create:async options=>{sessions.push(options);return {url:'https://checkout.stripe.com/c/pay/cs_test_fixture'};}}}}),
    fetchImpl:async(url,options)=>{
      reads++;assert.equal(options.method,'GET');assert.match(url,/sync\/products\/430964873\?store_id=18032822$/);
      return Response.json({result:{sync_product:{id:430964873,name:'Raw',is_ignored:false},sync_variants:[{
        id:123456,sync_product_id:430964873,synced:true,is_ignored:false,availability_status:'active',currency:'USD',retail_price:'30.00',name:'M'}]}});
    }})});
  const object=createExecutor(env,{apiRequest:api,signal:()=>assert.fail('Checkout must not signal mail')});
  const r=await object.fetch(request({items:[{id:430964873,variant_id:123456,quantity:1,price:.01,name:'Injected'}]}));
  assert.equal(r.status,200);assert.equal(reads,1);assert.equal(sessions.length,1);
  assert.equal(sessions[0].line_items[0].price_data.unit_amount,3000);
  assert.equal(sessions[0].success_url,env.SITE_URL+'/success');assert.equal(sessions[0].cancel_url,env.SITE_URL+'/cart');
  assert.equal(sessions[0].metadata.commerce_version,'2');
  assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
});
test('paused, invalid and over-limit native checkout reject before provider access',async()=>{
  const blocked=()=>assert.fail('No provider allowed');
  const api=createApiAdapter({checkoutFactory:({env})=>createCheckoutHandler({env,stripeFactory:blocked,fetchImpl:blocked})});
  assert.equal((await api(request({items:[]}),{...env,CHECKOUT_PAUSED:'true'})).status,503);
  assert.equal((await api(request({},'GET'),env)).status,405);
  assert.equal((await api(request('{bad'),env)).status,400);
  assert.equal((await api(request('x'.repeat(1048577)),env)).status,413);
  assert.equal((await api(request({items:[]}),{...env,STRIPE_SECRET_KEY:'sk_live_fixture'})).status,503);
});

test('provider outage is sanitized in the customer checkout response',async()=>{
  const api=createApiAdapter({checkoutFactory:({env})=>createCheckoutHandler({env,
    stripeFactory:()=>({checkout:{sessions:{create:()=>assert.fail('no session on provider outage')}}}),
    fetchImpl:async()=>new Response(null,{status:503})})});
  const response=await api(request({items:[{id:430964873,variant_id:123456,quantity:1}]}),env);
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'Checkout unavailable; please try again');
});
