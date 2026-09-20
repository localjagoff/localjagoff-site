const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const sources = {
  473808622: {
    'black-front':'62180fd1-29cb-4f09-850d-e5ce251b928d.png',
    'black-back':'edaa7174-ddd5-4781-bdcc-ee7eb5784c76.png',
    'white-front':'a340462a-4a85-415e-b922-e19b59da8329.png',
    'white-back':'8f4a9327-b74f-45c2-a700-f6b7a279d0d4.png',
  },
  473808088: {
    'black-front':'a1664186-7929-4b49-917a-a9380e827c33.png',
    'black-back':'1ca5d2f8-bf5f-46ae-9577-50328b5aecce.png',
    'white-front':'056eea68-34d3-4955-b84f-f85f9f7758d3.png',
    'white-back':'c34cc627-8747-4465-9a07-90d9b0a3ee34.png',
  },
};
async function main() {
  if (!process.argv[2]) throw Error('Provide the original Printful download directory');
  for (const [id, views] of Object.entries(sources)) {
    const destination = path.join(__dirname, '../public/images/products', id);
    await fs.mkdir(destination, { recursive: true });
    for (const [view, filename] of Object.entries(views)) {
      const input = await fs.readFile(path.join(process.argv[2], filename));
      const meta = await sharp(input).metadata();
      if (meta.width !== 800 || meta.height !== 800) throw Error('Expected original 800px Printful mockup');
      // Keep every artwork/garment pixel; flatten transparency and add the site's white margin.
      const bytes = await sharp(input).flatten({ background:'#ffffff' })
        .extend({ top:40,bottom:40,left:40,right:40,background:'#ffffff' })
        .jpeg({ quality:94,mozjpeg:true }).toBuffer();
      await fs.writeFile(path.join(destination,view+'.jpg'),bytes);
      console.log(JSON.stringify({id,view,width:880,height:880,
        source_sha256:crypto.createHash('sha256').update(input).digest('hex')}));
    }
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
