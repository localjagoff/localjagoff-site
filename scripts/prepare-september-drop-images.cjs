const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

// Lossy size optimization only: preserve the provider's full square composition/artwork.
async function run() {
  const source = path.resolve(process.argv[2] || '../new-product-mockups');
  for (const id of [471744647, 471744585, 471744477, 471744283]) {
    const files = await fs.readdir(path.join(source, String(id)));
    const output = path.join(__dirname, '..', 'public', 'images', 'products', String(id));
    await fs.mkdir(output, { recursive: true });
    for (const view of ['front', 'back']) {
      const matches = files.filter(file => file.includes('-' + view + '-') && file.endsWith('.jpg'));
      if (matches.length !== 1) throw Error('Expected one original ' + id + ' ' + view);
      const input = path.join(source, String(id), matches[0]);
      const meta = await sharp(input).metadata();
      if (meta.width !== 2000 || meta.height !== 2000) throw Error('Unexpected source dimensions');
      const target = path.join(output, view + '.jpg');
      await sharp(input).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true }).toFile(target);
      if (view === 'front') await fs.copyFile(target, path.join(__dirname, '..', 'public', 'images', 'google', id + '.jpg'));
      console.log(JSON.stringify({ id, view, width: 1200, height: 1200, bytes: (await fs.stat(target)).size }));
    }
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
