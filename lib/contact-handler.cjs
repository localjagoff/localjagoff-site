const security = require('./contact-security.cjs');
const crypto = require('node:crypto');
const {isIP} = require('node:net');
const {contactEmail} = require('./customer-mail.cjs');
const {createStore} = require('./communications-store.cjs');
const {deliver} = require('./communications-queue.cjs');
const {isProduction,isCloudflare} = require('./deployment.cjs');

function allowedOrigins(env) {
  if(isCloudflare(env)){
    try{
      const url=new URL(env.SITE_URL);
      return url.protocol==='https:'&&!url.username&&!url.password&&url.href===url.origin+'/'?[url.origin]:[];
    }catch{return [];}
  }
  if (env.SITE_ID) return env.SITE_URL ? [env.SITE_URL] : [];
  if (env.VERCEL_ENV==='preview') return [env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>`https://${h}`);
  return [env.SITE_URL || 'https://www.localjagoff.com'];
}
function trustedIP(req,env) {
  const ip=isCloudflare(env) ? req.headers['cf-connecting-ip'] :
    env.SITE_ID ? req.headers['x-nf-client-connection-ip'] :
    env.VERCEL ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
  return typeof ip==='string' && isIP(ip) ? ip : null;
}
function createContactHandler({env=process.env,storeFactory=createStore,dispatch=deliver}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex');
    if (!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'});}
    if (env.COMMUNICATIONS_ENABLED!=='true' || (env.COMMUNICATIONS_SECRET||'').length<32 || !env.DATABASE_URL) return res.status(503).json({error:'Email hello@localjagoff.com directly while the form is unavailable.'});
    if (req.method==='GET') return res.status(200).json({challenge:security.challenge(env.COMMUNICATIONS_SECRET),preview:!isProduction(env)});
    if (!allowedOrigins(env).some(origin=>security.sameOrigin(req,origin))) return res.status(403).json({error:'Please send this from our Contact page.'});
    if ((req.headers['content-type']||'').split(';')[0].trim()!=='application/json') return res.status(415).json({error:'Please reload the form.'});
    if (Buffer.byteLength(JSON.stringify(req.body||{}))>20000) return res.status(413).json({error:'Message is too long.'});
    let fields;
    try {
      fields=security.validateContact(req.body);
      if (!security.verifyChallenge(req.body.challenge,env.COMMUNICATIONS_SECRET)) return res.status(400).json({error:'Reload the form and try again.'});
    } catch { return res.status(400).json({error:'Please check your message and try again.'}); }
    if (fields.honeypot) return res.status(202).json({ok:true,preview:!isProduction(env)});
    // Use only the selected host's connection-IP header, never X-Forwarded-For.
    const ip=trustedIP(req,env);
    if (!ip) return res.status(503).json({error:'Please email hello@localjagoff.com directly.'});
    try {
      const store=storeFactory(env);
      const outcome=await store.contact(fields,req.body.challenge,security.rateKey(ip,env.COMMUNICATIONS_SECRET),
        crypto.createHmac('sha256',env.COMMUNICATIONS_SECRET).update(`contact-email:${fields.email.toLowerCase()}`).digest('hex'),contactEmail(fields));
      if (isProduction(env)) {
        try {await dispatch(store,{key:`contact/${fields.requestId}`,env});} catch {}
      }
      return res.status(202).json({ok:true,outcome,preview:!isProduction(env)});
    } catch (error) {
      if (error.message?.includes('contact_rate_limited')) {res.setHeader('Retry-After','600');return res.status(429).json({error:'Too many messages. Please wait or email hello@localjagoff.com.'});}
      if (error.code==='23505' || error.message?.includes('contact_request_conflict')) return res.status(409).json({error:'Reload the form before sending a different message.'});
      return res.status(503).json({error:'We could not confirm receipt. Retry this message or email hello@localjagoff.com.'});
    }
  };
}
module.exports={createContactHandler,allowedOrigins,trustedIP};
