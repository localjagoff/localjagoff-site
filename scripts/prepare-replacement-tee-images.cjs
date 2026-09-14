const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

// This owner-approved replacement is deliberately not released to Google.
async function run() {
  if (!process.argv[2]) throw Error('Provide the replacement Printful mockup directory');
  const source = path.resolve(process.argv[2]);
  const files = await fs.readdir(source);
  const output = path.join(__dirname, '..', 'public/images/products/471950476');
  await fs.mkdir(output, { recursive: true });
  for (const view of ['front', 'back']) {
    const matches = files.filter(file => file.includes('-' + view + '-') && file.endsWith('.jpg'));
    if (matches.length !== 1) throw Error('Expected one original ' + view + ' JPEG');
    const input = await fs.readFile(path.join(source, matches[0]));
    const metadata = await sharp(input).metadata();
    if (metadata.width !== 2000 || metadata.height !== 2000) throw Error('Expected original 2000px square render');
    const bytes = await sharp(input).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    await fs.writeFile(path.join(output, view + '.jpg'), bytes);
    // Staged presentation only; GOOGLE_APPROVED_PRODUCT_IDS still excludes this ID.
    if (view === 'front') await fs.writeFile(path.join(__dirname, '..', 'public/images/google/471950476.jpg'), bytes);
    console.log(JSON.stringify({ product: 471950476, view, source: matches[0],
      source_sha256: crypto.createHash('sha256').update(input).digest('hex'),
      output_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      width: 1200, height: 1200, bytes: bytes.length }));
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
