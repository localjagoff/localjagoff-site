import runner from '../../../lib/communications-runner.cjs';
import auth from '../../../lib/communications-auth.cjs';
export const config={maxDuration:300};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  const supplied=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
  if(!auth.equal(supplied,process.env.CRON_SECRET))return res.status(401).json({error:'Unauthorized'});
  // Netlify uses its authenticated background worker, not a 60-second API request.
  if(process.env.SITE_ID)return res.status(409).json({error:'Use the scheduled background worker'});
  try{return res.status(200).json(await runner.runCommunications());}
  catch{return res.status(503).json({error:'Communications check incomplete'});}
}
