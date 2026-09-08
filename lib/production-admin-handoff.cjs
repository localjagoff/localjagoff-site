const {SUPPORT,ORDER_SENDER,sendViaResend}=require('./customer-mail.cjs');
const budget=require('./invocation-budget.cjs');
const RECEIPT='production-admin-handoff-v1';
const ORIGIN='https://www.localjagoff.com';

async function handoff(env,store,{send=sendViaResend}={}){
  if(!store||!env.WORKER_SELF_REFERENCE||!env.RESEND_API_KEY||
    !/^[a-z0-9_-]{3,64}$/.test(env.PROMO_ADMIN_USERNAME||'')||
    !/^[A-Za-z0-9_-]{43,128}$/.test(env.PROMO_ADMIN_PASSWORD||''))return {outcome:'admin_handoff_configuration_missing'};
  const previous=await store.get(RECEIPT);
  if(previous)return {outcome:previous.status==='sent'?'admin_handoff_already_sent':'admin_handoff_requires_review',
    emailId:previous.emailId,at:previous.at};
  const authorization='Basic '+Buffer.from(env.PROMO_ADMIN_USERNAME+':'+env.PROMO_ADMIN_PASSWORD).toString('base64');
  const checks=[];
  for(const pathname of ['/admin/reviews','/api/reviews/moderation']){
    for(const mode of ['missing','incorrect','correct']){
      const headers=mode==='correct'?{authorization}:mode==='incorrect'?{authorization:'Basic '+Buffer.from('incorrect:incorrect').toString('base64')}:{};
      budget.consume();
      const response=await env.WORKER_SELF_REFERENCE.fetch(ORIGIN+pathname,{method:'GET',headers,redirect:'manual'});
      const body=await response.text();
      const expected=mode==='correct'?200:401;
      const shape=mode!=='correct'||(pathname==='/admin/reviews'?body.includes('REVIEW QUEUE'):
        (()=>{try{return Array.isArray(JSON.parse(body).reviews);}catch{return false;}})());
      checks.push({path:pathname,mode,status:response.status,pass:response.status===expected&&shape});
      if(response.status!==expected||!shape)return {outcome:'admin_authentication_failed',checks};
    }
  }
  // Only delivery metadata is durable. The credential-bearing payload never enters an outbox.
  const claimed=await store.transaction(async tx=>{
    if(await tx.get(RECEIPT))return false;
    await tx.put(RECEIPT,{status:'attempted',at:new Date().toISOString()});return true;
  });
  if(!claimed)return {outcome:'admin_handoff_requires_review',checks};
  try{
    const payload={from:ORDER_SENDER,to:[SUPPORT],reply_to:SUPPORT,
      subject:'Local Jagoff production moderation login - owner only',
      text:['Local Jagoff production moderation access',
        'You authorized this new login. Both the admin page and moderation API accepted it during private production verification.',
        'Login URL (after production cutover): '+ORIGIN+'/admin/reviews',
        'Username: '+env.PROMO_ADMIN_USERNAME,'Password: '+env.PROMO_ADMIN_PASSWORD,
        'The public site has not been cut over yet. This login will work on the public URL only after activation is confirmed.',
        'Save the login in your password manager. Do not forward this message or paste the password into chat.',
        'This system currently has no self-service password reset. Request a secure rotation if access is lost or this mailbox is compromised.',
        'No customer review, order, payment, fulfillment, or publication was changed by this verification.'].join('\n\n')};
    const delivered=await send(payload,RECEIPT,{env:{...env,CUSTOMER_EMAIL_ENABLED:'true'}});
    await store.put(RECEIPT,{status:'sent',emailId:delivered.id,at:new Date().toISOString()});
    return {outcome:'admin_handoff_sent',emailId:delivered.id,checks,recipient:SUPPORT};
  }catch{return {outcome:'admin_handoff_requires_review',checks};}
}
module.exports={handoff,RECEIPT};
