const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const sources={
  'black-front':'80c1f0d8-29f5-456b-a9bc-c434aa18a97c.png',
  'black-back':'41468b4c-1cd3-495e-8cc1-a4562f0a4f0f.png',
  'white-front':'ac8e225f-8231-4984-9902-6ff6e1c37fee.png',
  'white-back':'7cf3b56f-b11b-4f1d-9232-8b397dd220d6.png'
};
async function main() {
  if(!process.argv[2])throw Error('Provide original Printful download directory');
  const destination=path.join(__dirname,'../public/images/products/473834484');
  await fs.mkdir(destination,{recursive:true});
  for(const [view,filename] of Object.entries(sources)) {
    const input=await fs.readFile(path.join(process.argv[2],filename));
    const meta=await sharp(input).metadata();
    if(meta.width!==800||meta.height!==800)throw Error('Expected original 800px Printful render');
    // Preserve complete garment/artwork; only flatten transparency and add neutral padding.
    await sharp(input).flatten({background:'#ffffff'})
      .extend({top:40,bottom:40,left:40,right:40,background:'#ffffff'})
      .jpeg({quality:94,mozjpeg:true}).toFile(path.join(destination,view+'.jpg'));
    console.log(JSON.stringify({id:473834484,view,width:880,height:880,
      source_sha256:crypto.createHash('sha256').update(input).digest('hex')}));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
