/**
 * Shrinks a .glb exported from SolidWorks for the web.
 *
 *   npm run model -- content/models/cooling-unit.glb public/models/cooling-unit.glb [--ratio 0.2]
 *
 * SolidWorks exports are far too heavy to put on a web page (hundreds of MB,
 * millions of triangles), so this:
 *   - drops unused data and merges duplicate meshes/materials
 *   - turns repeated parts into GPU instances (e.g. every strawberry)
 *   - simplifies geometry to `--ratio` of its triangles
 *   - shrinks textures to WebP
 *   - quantizes and meshopt-compresses what's left for transfer
 *
 * three.js reads the result with MeshoptDecoder, which ships with three.
 */
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  instance,
  resample,
  weld,
  simplify,
  textureCompress,
  quantize,
  meshopt,
} from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith('--'));
const ratioArg = args.indexOf('--ratio');
const ratio = ratioArg === -1 ? 0.2 : Number(args[ratioArg + 1]);

if (!input || !output) {
  console.error('Usage: npm run model -- <input.glb> <output.glb> [--ratio 0.2]');
  process.exit(1);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
});

const document = await io.read(input);

const count = (doc) => {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      tris += (indices ? indices.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return Math.round(tris);
};

const trisBefore = count(document);

await document.transform(
  prune({ keepAttributes: false, keepLeaves: false }),
  dedup(),
  instance({ min: 2 }), // repeated parts become GPU instances
  resample(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  prune(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

await io.write(output, document);

const [before, after] = await Promise.all([fs.stat(input), fs.stat(output)]);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
console.log(
  `${input} ${mb(before.size)}, ${trisBefore.toLocaleString()} tris\n` +
    `${output} ${mb(after.size)}, ${count(document).toLocaleString()} tris`,
);
