const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const {createStore}=require('../lib/communications-store.cjs');
const {STORE_ID}=require('../lib/commerce-policy.cjs');

async function main(){
  const env=process.env;
  if(env.COMMUNICATIONS_TEST_DATABASE!=='true'||env.VERCEL_ENV!=='preview'||!env.VERCEL_CLI_PATH)throw new Error('preview_guard');
  const origin=new URL(env.COMMUNICATIONS_PREVIEW_ORIGIN).origin;
  if(!origin.endsWith('.vercel.app'))throw new Error('preview_origin_guard');
  const cli=(args,input)=>execFileSync(process.execPath,[env.VERCEL_CLI_PATH,...args],{input,encoding:'utf8',windowsHide:true,timeout:60000,stdio:['pipe','pipe','pipe'],maxBuffer:2*1024*1024});
  const api=path=>JSON.parse(cli(['api',path]));
  const project=env.COMMUNICATIONS_VERCEL_PROJECT,team=env.COMMUNICATIONS_VERCEL_TEAM;
  const vars=api(`/v10/projects/${project}/env?teamId=${team}`).envs;
  const secret=key=>{
    const entry=vars.find(v=>v.key===key&&v.gitBranch==='fix/customer-communications'&&v.target.length===1&&v.target[0]==='preview');
    if(!entry)throw new Error('preview_scope_guard');
    return api(`/v1/projects/${project}/env/${entry.id}?teamId=${team}`).value;
  };
  const request=(path,{method='GET',body,headers={}}={})=>{
    // Credentials stay in pipe memory, never command arguments, files, or output.
    const lines=[`request = ${JSON.stringify(method)}`,...Object.entries(headers).map(([k,v])=>`header = ${JSON.stringify(k+': '+v)}`)];
    if(body!==undefined)lines.push('header = "Content-Type: application/json"',`data = ${JSON.stringify(JSON.stringify(body))}`);
    const raw=cli(['curl',path,'--deployment',origin,'--','--silent','--show-error','--max-time','30','--config','-','--write-out','\n%{http_code}'],lines.join('\n'));
    const split=raw.lastIndexOf('\n');return {status:Number(raw.slice(split+1)),body:JSON.parse(raw.slice(0,split))};
  };
  const store=createStore(),ids=[];
  try{
    const forms=[];
    for(let i=0;i<4;i++){
      const res=request('/api/contact');assert.equal(res.status,200);assert.equal(res.body.preview,true);
      const id=crypto.randomUUID();ids.push(id);
      forms.push({name:'Preview verification',email:'fixture@example.com',topic:'other',message:'Synthetic preview verification. No customer email should be sent.',website:'',requestId:id,challenge:res.body.challenge});
    }
    await new Promise(r=>setTimeout(r,2200));
    const options=body=>({method:'POST',body,headers:{Origin:origin}});
    assert.equal(request('/api/contact',options(forms[0])).status,202);
    assert.equal(request('/api/contact',options(forms[0])).status,202);
    assert.equal(request('/api/contact',options(forms[1])).status,202);
    assert.equal(request('/api/contact',options(forms[2])).status,202);
    assert.equal(request('/api/contact',options(forms[3])).status,429);
    assert.equal(request('/api/contact',{...options(forms[3]),headers:{Origin:'https://invalid.example.com'}}).status,403);
    const jobs=await store.query('SELECT status,attempts,provider_id FROM comm_outbox WHERE key=ANY($1::text[])',[ids.map(id=>'contact/'+id)]);
    assert.equal(jobs.length,3);assert.ok(jobs.every(j=>j.status==='pending'&&j.attempts===0&&!j.provider_id));
    console.log('PASS protected contact: GET200, POST202, duplicate202, durable rate429, CSRF403; three synthetic jobs, zero send attempts.');
    const event={type:'shipment_sent',store_id:Number(STORE_ID),occurred_at:new Date().toISOString(),data:{order:{id:123,store_id:Number(STORE_ID),external_id:'LJ'+'a'.repeat(24)},shipment:{id:456}}};
    const signature=crypto.createHmac('sha256',Buffer.from(secret('PRINTFUL_WEBHOOK_SECRET'),'hex')).update(JSON.stringify(event)).digest('hex');
    const headers={'x-pf-webhook-public-key':'localjagoff-preview-synthetic','x-pf-webhook-signature':signature};
    const valid=request('/api/printful-events',{method:'POST',body:event,headers});assert.equal(valid.status,200);assert.equal(valid.body.outcome,'preview_no_provider_or_email');
    assert.equal(request('/api/printful-events',{method:'POST',body:{...event,type:'shipment_returned'},headers}).status,400);
    console.log('PASS protected Printful route: locally signed synthetic event200; altered raw payload400; Preview provider/email exclusion. This is not genuine provider delivery evidence.');
    assert.equal(request('/api/communications/run').status,401);
    const cron=request('/api/communications/run',{headers:{Authorization:'Bearer '+secret('CRON_SECRET')}});assert.equal(cron.status,200);assert.equal(cron.body.outcome,'sending_disabled');
    const reviews=request('/api/reviews?productId=430697388');assert.equal(reviews.status,200);assert.deepEqual(reviews.body.reviews,[]);
    console.log('PASS protected scheduler: unauthenticated401, authorized200 sending_disabled. Public reviews200 with no fabricated reviews.');
  }finally{
    await store.sql.transaction([
      store.sql.query('DELETE FROM comm_outbox WHERE key=ANY($1::text[])',[ids.map(id=>'contact/'+id)]),
      store.sql.query('DELETE FROM comm_contact_requests WHERE id=ANY($1::uuid[])',[ids]),
    ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
  }
}
main().catch(()=>{console.error('Preview verification failed; inspect sanitized endpoint status only.');process.exitCode=1;});
