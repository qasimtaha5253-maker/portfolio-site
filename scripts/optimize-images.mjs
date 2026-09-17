/**
 * Converts source photos to web-ready WebP files.
 *
 *   content/photos/<project-id>/<name>.(jpg|jpeg|png|webp|tif|tiff)
 *     -> public/projects/<project-id>/<name>-480.webp
 *        public/projects/<project-id>/<name>-960.webp
 *        public/projects/<project-id>/<name>-1600.webp
 *
 * Run with `npm run images`. Only files that are new or changed are processed.
 * Images are never upscaled, so a small source just produces smaller files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { IMAGE_WIDTHS } from '../src/image-widths.js';

const SRC = 'content/photos';
const OUT = 'public/projects';
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

async function isStale(src, outputs) {
  const srcTime = (await fs.stat(src)).mtimeMs;
  for (const out of outputs) {
    try {
      if ((await fs.stat(out)).mtimeMs < srcTime) return true;
    } catch {
      return true;
    }
  }
  return false;
}

let converted = 0;
let skipped = 0;

for (const project of await fs.readdir(SRC, { withFileTypes: true })) {
  if (!project.isDirectory()) continue;
  const srcDir = path.join(SRC, project.name);
  const outDir = path.join(OUT, project.name);
  await fs.mkdir(outDir, { recursive: true });

  const files = (await fs.readdir(srcDir)).filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()));
  const byName = Object.groupBy(files, (f) => path.basename(f, path.extname(f)));
  const clashes = Object.values(byName).filter((group) => group.length > 1);
  if (clashes.length) {
    for (const group of clashes) {
      console.error(`  ${project.name}: ${group.join(' and ')} share a name — delete the one you don't want.`);
    }
    process.exitCode = 1;
    continue;
  }

  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    const src = path.join(srcDir, file);
    const outputs = IMAGE_WIDTHS.map((w) => path.join(outDir, `${name}-${w}.webp`));

    if (!(await isStale(src, outputs))) {
      skipped++;
      continue;
    }

    for (const [i, width] of IMAGE_WIDTHS.entries()) {
      await sharp(src)
        .rotate() // respect phone-camera orientation
        .flatten({ background: '#ffffff' }) // transparent renders -> white
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputs[i]);
    }
    converted++;
    console.log(`  ${project.name}/${file}`);
  }
}

console.log(`Images: ${converted} converted, ${skipped} unchanged.`);
