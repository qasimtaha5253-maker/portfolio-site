/**
 * Shrinks a .glb exported from SolidWorks for the web.
 *
 *   npm run model -- content/models/cooling-unit.glb public/models/cooling-unit.glb
 *
 * Applies lossless-ish cleanups (drop unused data, merge duplicates, weld
 * vertices) and quantizes positions/normals, which three.js reads natively —
 * no extra decoder is downloaded by visitors.
 */
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, resample } from '@gltf-transform/functions';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: npm run model -- <input.glb> <output.glb>');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read(input);

await document.transform(
  dedup(),
  prune(),
  resample(),
  weld(),
  quantize({ pattern: /^(POSITION|NORMAL|TEXCOORD)/ }),
);

await io.write(output, document);

const [before, after] = await Promise.all([fs.stat(input), fs.stat(output)]);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${input} ${mb(before.size)} -> ${output} ${mb(after.size)}`);
