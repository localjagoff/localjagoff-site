const fs=require('node:fs');
const path=require('node:path');
const swc=require('next/dist/build/swc');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');

async function buildRenderer(){
  await swc.loadBindings();
  const buildId=fs.readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim();
  if(!/^[A-Za-z0-9_-]+$/.test(buildId))throw Error('invalid_next_build_id');
  return esbuild.build({absWorkingDir:root,entryPoints:['lib/cloudflare-product-render.jsx'],
    outfile:'.open-next/product-render.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022',
    minify:true,define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_HOST_PLATFORM':'"cloudflare"'},
    plugins:[{name:'original-next-page-components',setup(build){
      build.onResolve({filter:/^localjagoff:build-id$/},()=>({path:'build-id',namespace:'localjagoff'}));
      build.onLoad({filter:/.*/,namespace:'localjagoff'},()=>({contents:`export default ${JSON.stringify(buildId)};`}));
      build.onResolve({filter:/^next\/document$/},()=>({path:path.join(root,'lib/cloudflare-product-render.jsx')}));
      build.onResolve({filter:/^next\/router$/},()=>({path:path.join(root,'lib/cloudflare-product-render.jsx')}));
      build.onLoad({filter:/\.css$/},()=>({contents:'',loader:'css'}));
      build.onLoad({filter:/\.(js|jsx)$/},args=>{
        if(args.path.includes('node_modules'))return;
        const filename=path.relative(root,args.path).replaceAll('\\','/');
        const {code}=swc.transformSync(fs.readFileSync(args.path,'utf8'),{
          filename,disableNextSsg:true,styledJsx:{},
          jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2020',transform:{react:{runtime:'automatic'}}},
          module:{type:'es6'},
        });
        return {contents:code,loader:'js',resolveDir:path.dirname(args.path)};
      });
    }}],logLevel:'warning'});
}
if(require.main===module)buildRenderer().catch(()=>{console.error('Native product renderer build failed');process.exitCode=1;});
module.exports={buildRenderer};
