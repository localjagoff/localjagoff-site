import storage from '../../../lib/communications-store.cjs';
import auth from '../../../lib/communications-auth.cjs';
import contact from '../../../lib/contact-handler.cjs';
import security from '../../../lib/contact-security.cjs';
export const config={api:{bodyParser:{sizeLimit:'2kb'}}};
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
  if(!auth.adminAuthorized(req,process.env)){res.setHeader('WWW-Authenticate','Basic realm="Local Jagoff Admin"');return res.status(401).json({error:'Admin login required.'});}
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  if(req.method==='POST'&&!contact.allowedOrigins(process.env).some(o=>security.sameOrigin(req,o)))return res.status(403).json({error:'Origin not allowed.'});
  try {
    // Authenticated moderation remains available while customer sending is paused.
    const store=storage.createStore({...process.env,COMMUNICATIONS_ENABLED:'true'});
    if(req.method==='GET')return res.status(200).json({reviews:await store.query("SELECT id,product_id,rating,display_name,body,created_at FROM comm_reviews WHERE status='pending' ORDER BY created_at LIMIT 50")});
    if(!/^[a-f0-9-]{36}$/.test(req.body?.id||'')||!['approved','rejected'].includes(req.body?.status))return res.status(400).json({error:'Invalid moderation action.'});
    await store.query("UPDATE comm_reviews SET status=$2,moderated_at=now() WHERE id=$1 AND status='pending'",[req.body.id,req.body.status]);
    return res.status(200).json({ok:true});
  }catch{return res.status(503).json({error:'Moderation is temporarily unavailable.'});}
}
