const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const env={...process.env,NEXT_PUBLIC_HOST_PLATFORM:'cloudflare'};
for(const [file,...args] of [
  ['scripts/patch-opennext.cjs'],
  ['node_modules/@opennextjs/cloudflare/dist/cli/index.js','build'],
  ['scripts/cloudflare-static.cjs'],
  ['scripts/cloudflare-product-render.cjs'],
  ['scripts/cloudflare-prewarm.cjs','--apply'],
]){
  const result=spawnSync(process.execPath,[path.join(root,file),...args],{cwd:root,env,stdio:'inherit',windowsHide:true});
  if(result.error||result.status!==0)process.exit(result.status||1);
}
