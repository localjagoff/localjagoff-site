const crypto=require('node:crypto');
const {createStore,hash}=require('./communications-store.cjs');
const {sameOrigin,rateKey}=require('./contact-security.cjs');
const {allowedOrigins,trustedIP}=require('./contact-handler.cjs');
const {HIDDEN_PRODUCT_IDS}=require('./commerce-policy.cjs');

function reviewInput(body) {
  const productId=body?.productId;
  if (!Number.isSafeInteger(productId) || productId<1 || HIDDEN_PRODUCT_IDS.has(productId) ||
    !Number.isInteger(body.rating) || body.rating<1 || body.rating>5 ||
    typeof body.displayName!=='string' || !body.displayName.trim() || body.displayName.length>40 ||
    typeof body.text!=='string' || body.text.length>2000 || /[\x00-\x1f\x7f<>]/.test(body.displayName) ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body.text)) throw new Error('invalid_review');
  return {productId,rating:body.rating,displayName:body.displayName.trim(),text:body.text.trim()};
}
function createReviewsHandler({env=process.env,storeFactory=createStore}={}) {
  return async (req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    try {
      if(!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'});}
      if(req.method==='POST' && !allowedOrigins(env).some(origin=>sameOrigin(req,origin))) return res.status(403).json({error:'Use the review page.'});
      if(req.method==='POST' && (req.headers['content-type']||'').split(';')[0].trim()!=='application/json') return res.status(415).json({error:'Use the review page.'});
      const ip=trustedIP(req,env);
      if(!ip) throw new Error('client_address_unavailable');
      const store=storeFactory(env);
      const rates=await store.query(`SELECT comm_take_rate($1,600,60) AND comm_take_rate('reviews-global',86400,2000) AS allowed`,['reviews:'+rateKey(ip,env.COMMUNICATIONS_SECRET)]);
      if(!rates[0].allowed) {res.setHeader('Retry-After','600');return res.status(429).json({error:'Please wait before trying again.'});}
      if(req.method==='GET') {
        if(!/^\d{1,12}$/.test(req.query?.productId||'')) return res.status(400).json({error:'Invalid product.'});
        const id=Number(req.query.productId);
        if(HIDDEN_PRODUCT_IDS.has(id)) return res.status(404).json({error:'Unavailable.'});
        const reviews=await store.query(`SELECT rating,display_name,body,created_at FROM comm_reviews
          WHERE product_id=$1 AND status='approved' ORDER BY created_at DESC LIMIT 20`,[id]);
        res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({reviews});
      }
      if(!/^[a-f0-9]{64}$/.test(req.body?.token||'') || !['open','submit','optout'].includes(req.body.action)) return res.status(400).json({error:'This review link is invalid or expired.'});
      const orders=await store.query(`SELECT reference,items FROM comm_orders WHERE review_token_hash=$1
        AND review_expires_at>now() AND unresolved=false AND suppress_reviews=false`,[hash(req.body.token)]);
      const order=orders[0];
      if(!order) return res.status(410).json({error:'This review link is invalid or expired.'});
      if(req.body.action==='optout') {
        await store.sql.transaction([
          store.sql.query('UPDATE comm_orders SET review_expires_at=now() WHERE reference=$1',[order.reference]),
          store.sql.query("UPDATE comm_outbox SET status='suppressed' WHERE order_ref=$1 AND kind='review' AND status='pending'",[order.reference]),
        ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
        return res.status(200).json({ok:true});
      }
      const products=order.items.filter(i=>Number.isSafeInteger(i.productId)&&!HIDDEN_PRODUCT_IDS.has(i.productId));
      const submitted=await store.query('SELECT product_id FROM comm_reviews WHERE order_ref=$1',[order.reference]);
      if(req.body.action==='open') return res.status(200).json({products:products.map(p=>({id:p.productId,name:p.name,submitted:submitted.some(r=>Number(r.product_id)===p.productId)}))});
      let review;
      try {review=reviewInput(req.body);} catch{return res.status(400).json({error:'Choose a rating, a short public name, and a review of at most 2,000 characters.'});}
      if(!products.some(p=>p.productId===review.productId)) return res.status(403).json({error:'This product is not part of your review invitation.'});
      const rows=await store.query(`INSERT INTO comm_reviews(id,order_ref,product_id,rating,display_name,body)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(order_ref,product_id) DO NOTHING RETURNING id`,
        [crypto.randomUUID(),order.reference,review.productId,review.rating,review.displayName,review.text]);
      return res.status(rows.length?201:200).json({ok:true,status:'pending_moderation'});
    }catch {return res.status(503).json({error:'Reviews are temporarily unavailable. Email hello@localjagoff.com for help.'});}
  };
}
module.exports={createReviewsHandler,reviewInput};
