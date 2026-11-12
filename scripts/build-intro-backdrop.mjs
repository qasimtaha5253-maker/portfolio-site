// Small, trimmed copies of the cover stills for the faint model backdrop on the intro
// (IntroBackdrop.tsx). Re-run after re-rendering the stills: npm run backdrop
import fs from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'public/models/stills';
const OUT = 'public/intro-backdrop';
const WIDTH = 360;

await fs.mkdir(OUT, { recursive: true });
for (const file of (await fs.readdir(SRC)).filter((f) => f.endsWith('-wide.webp'))) {
  const name = file.replace(/-wide\.webp$/, '');
  const out = `${OUT}/${name}.webp`;
  const info = await sharp(`${SRC}/${file}`)
    .trim({ threshold: 1 })
    .resize({ width: WIDTH, height: WIDTH, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 55, alphaQuality: 55 })
    .toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
