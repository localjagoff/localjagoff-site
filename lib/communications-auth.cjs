const crypto=require('node:crypto');
function equal(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||!a||!b)return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());
}
function adminAuthorized(req,env) {
  const header=req.headers?.authorization||'';
  if(!header.startsWith('Basic ')||header.length>1024)return false;
  const value=Buffer.from(header.slice(6),'base64').toString('utf8');
  const colon=value.indexOf(':');
  return colon>0&&equal(value.slice(0,colon),env.PROMO_ADMIN_USERNAME)&&equal(value.slice(colon+1),env.PROMO_ADMIN_PASSWORD);
}
module.exports={equal,adminAuthorized};
