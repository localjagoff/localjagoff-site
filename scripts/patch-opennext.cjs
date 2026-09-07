const fs=require('node:fs');
const path=require('node:path');
// OpenNext #1325: preserve Node's optional-module error contract for React 18.
const file=path.resolve(__dirname,'../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/optional-deps.js');
const before='contents: `throw new Error(\'Missing optional dependency "${pluginData.name}"\')`';
const after='contents: `throw Object.assign(new Error(\'Missing optional dependency "${pluginData.name}"\'), { code: "MODULE_NOT_FOUND" })`';
const source=fs.readFileSync(file,'utf8');
if(source.includes(before))fs.writeFileSync(file,source.replace(before,after));
else if(!source.includes(after))throw new Error('OpenNext optional-dependency shim changed; review patch before building');
