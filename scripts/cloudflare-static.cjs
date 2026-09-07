const fs=require('node:fs');
const path=require('node:path');
// Assets bypass Next middleware. Only these reviewed public routes may be copied.
const PUBLIC_ROUTES=Object.freeze([
  '/', '/arcade', '/bridge-rage', '/cart', '/contact', '/fry-catcher', '/hats',
  '/hoodies', '/jagoff-jump', '/parking-chair-panic', '/pothole-patrol', '/privacy',
  '/tees', '/terms', '/whats-a-jagoff', '/yinzer-invaders',
]);

function planStaticAssets(root){
  const pages=JSON.parse(fs.readFileSync(path.join(root,'.next/server/pages-manifest.json'),'utf8'));
  const {routes={}}=JSON.parse(fs.readFileSync(path.join(root,'.next/prerender-manifest.json'),'utf8'));
  return PUBLIC_ROUTES.map(route=>{
    const relative=route==='/'?'index':route.slice(1);
    const file='pages/'+relative+'.html';
    const source=path.join(root,'.next/server',file);
    const target=path.join(root,'.open-next/assets',relative+'.html');
    // Pages auto-static HTML is absent from prerender.routes. SSR and ISR stay on Next.
    const copy=pages[route]===file&&(!routes[route]||routes[route].initialRevalidateSeconds===false)&&fs.existsSync(source);
    return {route,source,target,copy};
  });
}

function copyStaticAssets({root=path.resolve(__dirname,'..'),env=process.env}={}){
  const plan=planStaticAssets(root),assets=path.join(root,'.open-next/assets');
  fs.mkdirSync(assets,{recursive:true});
  for(const {source,target,copy} of plan){
    if(copy)fs.copyFileSync(source,target);
    else if(fs.existsSync(target))fs.unlinkSync(target);
  }
  const headers='/*\n  X-Content-Type-Options: nosniff\n'+
    (env.COMMERCE_ENV==='preview'?'  X-Robots-Tag: noindex, nofollow, noarchive\n':'')+
    '/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n';
  fs.writeFileSync(path.join(assets,'_headers'),headers);
  return plan.filter(entry=>entry.copy).map(entry=>entry.route);
}

if(require.main===module)copyStaticAssets();
module.exports={PUBLIC_ROUTES,planStaticAssets,copyStaticAssets};
