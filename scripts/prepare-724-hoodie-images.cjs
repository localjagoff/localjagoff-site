const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const sources={
  473985115:['af6c0357-a44c-458c-a6b9-962fa724ba25','56db6702-7bd0-40bd-a118-f1445bcb31f5'],
  473987159:['a3c2a21e-e30e-4434-983c-42ddfd0a8c74','bd80990e-ec35-4554-80c7-3e128659c5ba'],
  473987719:['5e9e63ec-6492-4f09-b208-363dce9f10e4','4a909101-4412-4703-8c7c-9655f6e5ba48'],
  473990688:['8cd96bb1-f3b2-4ebe-854d-5e503e98aecd','ef4331af-ee99-4b08-ab38-9383946b2e25'],
  473981186:['2db97a07-973d-4d05-bc15-c39295658734','0bda6182-1714-45e7-ae3d-16c7110f7493'],
  473991005:['405565d1-4e02-4d17-9e8e-9f6d6388b338','c3a04ee2-f49d-4697-9747-d561510893fb'],
};
async function main(){
  if(!process.argv[2])throw Error('Provide original Printful download directory');
  for(const [id,files] of Object.entries(sources)){
    const dest=path.join(__dirname,'../public/images/products',id);
    await fs.mkdir(dest,{recursive:true});
    for(const [index,file] of files.entries()){
      const input=await fs.readFile(path.join(process.argv[2],file+'.png'));
      const meta=await sharp(input).metadata();
      if(meta.width!==800||meta.height!==800)throw Error('Expected original 800px Printful render');
      const view=index===0?'front':'back';
      // Preserve the complete original render; only neutral padding and JPEG encoding.
      await sharp(input).flatten({background:'#ffffff'})
        .extend({top:40,bottom:40,left:40,right:40,background:'#ffffff'})
        .jpeg({quality:94,mozjpeg:true}).toFile(path.join(dest,view+'.jpg'));
      console.log(JSON.stringify({id,view,width:880,height:880,
        source_sha256:crypto.createHash('sha256').update(input).digest('hex')}));
    }
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
