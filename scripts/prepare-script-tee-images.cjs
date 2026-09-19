const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function main() {
  if (!process.argv[2] || !process.argv[3]) throw Error('Provide downloaded Printful front and back mockups');
  const destination = path.join(__dirname, '../public/images/products/473689891');
  await fs.mkdir(destination, { recursive: true });
  for (const [index, view] of ['front','back'].entries()) {
    const input = await fs.readFile(process.argv[index + 2]);
    const meta = await sharp(input).metadata();
    if (meta.width !== 800 || meta.height !== 800) throw Error('Expected the original 800px Printful preview');
    // Preserve the complete provider-rendered garment; only flatten transparency
    // onto white and add consistent breathing room, without regenerating artwork.
    const bytes = await sharp(input).flatten({ background:'#ffffff' })
      .extend({ top:40,bottom:40,left:40,right:40,background:'#ffffff' })
      .jpeg({ quality:94,mozjpeg:true }).toBuffer();
    await fs.writeFile(path.join(destination,view+'.jpg'),bytes);
    if(view==='front')await fs.writeFile(path.join(__dirname,'../public/images/google/473689891.jpg'),bytes);
    console.log(JSON.stringify({view,width:880,height:880,
      source_sha256:crypto.createHash('sha256').update(input).digest('hex'),
      output_sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
