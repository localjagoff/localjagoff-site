const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createStore,hash}=require('../lib/communications-store.cjs');
const {createReviewsHandler}=require('../lib/reviews-handler.cjs');

async function main(){
  if(process.env.COMMUNICATIONS_TEST_DATABASE!=='true'||process.env.VERCEL_ENV!=='preview')throw new Error('test_database_guard');
  const store=createStore(),run=crypto.randomUUID(),reference='DBTEST-'+run,requests=[],rateKeys=[];
  const payload={to:['fixture@example.com'],subject:'Synthetic database test',nested:{z:1,a:2}};
  try{
    const paid={reference,session:{id:'cs_test_db_'+run},customer:{email:'fixture@example.com'},items:[{productId:430697388,name:'Synthetic gear'}],payload};
    await Promise.all([store.recordPaid(paid),store.recordPaid(paid)]);
    assert.equal(Number((await store.query('SELECT count(*) AS n FROM comm_outbox WHERE order_ref=$1',[reference]))[0].n),1);
    const claims=await Promise.all([store.claim('receipt/'+reference),store.claim('receipt/'+reference)]);
    assert.equal(claims.filter(Boolean).length,1);
    const job=claims.find(Boolean);assert.equal(hash(job.payload),job.payload_hash);
    await store.markAttempt(job);await store.finish(job,'sent',{providerId:'synthetic'});
    assert.equal(await store.claim(job.key),undefined);
    await store.link(reference,1);
    const ipHash=hash(run+'ip'),emailHash=hash(run+'email');rateKeys.push('contact-ip:'+ipHash,'contact-email:'+emailHash);
    const fields={requestId:crypto.randomUUID(),message:'Synthetic only'};requests.push(fields.requestId);
    const outcomes=await Promise.all([store.contact(fields,run+'challenge',ipHash,emailHash,payload),store.contact(fields,run+'challenge',ipHash,emailHash,payload)]);
    assert.deepEqual(outcomes.sort(),['duplicate','queued']);
    await assert.rejects(store.contact({...fields,message:'Changed'},run+'challenge',ipHash,emailHash,payload),/contact_request_conflict/);
    for(let i=0;i<2;i++){const requestId=crypto.randomUUID();requests.push(requestId);await store.contact({requestId,message:'Synthetic only'},run+i,ipHash,emailHash,payload);}
    await assert.rejects(store.contact({requestId:crypto.randomUUID()},run+'blocked',ipHash,emailHash,payload),/contact_rate_limited/);
    const token=crypto.randomBytes(32).toString('hex');
    await store.query("UPDATE comm_orders SET review_token_hash=$2,review_expires_at=now()+interval '1 day' WHERE reference=$1",[reference,hash(token)]);
    const secret=crypto.randomBytes(32).toString('hex');
    const env={...process.env,COMMUNICATIONS_SECRET:secret,VERCEL:'',VERCEL_URL:'fixture.example.test'};
    const handler=createReviewsHandler({env,storeFactory:()=>store});
    const runRequest=async(body,method='POST')=>{
      const req={method,headers:{origin:'https://fixture.example.test','content-type':'application/json'},socket:{remoteAddress:'192.0.2.99'},body,query:{productId:'430697388'}};
      const res={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;}};await handler(req,res);return res;
    };
    rateKeys.push('reviews:'+require('../lib/contact-security.cjs').rateKey('192.0.2.99',secret));
    const body={token,action:'submit',productId:430697388,rating:1,displayName:'Synthetic fixture',text:'Database verification only.'};
    assert.equal((await runRequest(body)).code,201);assert.equal((await runRequest(body)).code,200);
    assert.equal((await runRequest({},'GET')).body.reviews.some(r=>r.display_name==='Synthetic fixture'),false);
    await store.query("UPDATE comm_reviews SET status='approved' WHERE order_ref=$1",[reference]);
    const visible=(await runRequest({},'GET')).body.reviews.find(r=>r.display_name==='Synthetic fixture');assert.equal(visible.rating,1);assert.equal(visible.order_ref,undefined);
    await store.query('UPDATE comm_orders SET suppress_reviews=true WHERE reference=$1',[reference]);assert.equal((await runRequest({action:'open',token})).code,410);
    console.log('PASS: isolated Review database migration, duplicate receipt/contact, concurrent claim, JSONB integrity, rate limit, purchase-bound review, moderation, suppression. No provider/email calls.');
  }finally{
    await store.sql.transaction([
      store.sql.query('DELETE FROM comm_reviews WHERE order_ref=$1',[reference]),
      store.sql.query('DELETE FROM comm_outbox WHERE order_ref=$1 OR key=ANY($2::text[])',[reference,requests.map(id=>'contact/'+id)]),
      store.sql.query('DELETE FROM comm_contact_requests WHERE id=ANY($1::uuid[])',[requests]),
      store.sql.query('DELETE FROM comm_orders WHERE reference=$1',[reference]),
      store.sql.query('DELETE FROM comm_rate WHERE bucket=ANY($1::text[])',[rateKeys]),
    ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
  }
}
main().catch(()=>{console.error('Database verification failed; sanitized test assertions require investigation.');process.exitCode=1;});
