/**
 * Shrinks a .glb exported from SolidWorks for the web.
 *
 *   npm run model -- content/models/cooling-unit.glb public/models/cooling-unit.glb [--ratio 0.2] [--no-instance]
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
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
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
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith('--'));
const ratioArg = args.indexOf('--ratio');
const ratio = ratioArg === -1 ? 0.2 : Number(args[ratioArg + 1]);
// Some sources report a broken (e.g. zero-height) size for a texture that
// gltf-transform's own lightweight header reader can't parse correctly —
// textureCompress then asks sharp to resize *to* that broken size and
// crashes. `--no-resize` skips resizing (still converts to webp) as a
// workaround for those files.
const resize = args.includes('--no-resize') ? undefined : [1024, 1024];
// The instancing pass collapses every repeated part (e.g. identical bolts,
// or — critically — two mirrored copies of a sub-assembly) into a single
// GPU-instanced mesh, whose per-instance transforms live in a flat buffer
// instead of named nodes. That's exactly what a model animation looks a
// node up by name to grab, so a model with a part `ModelLayer` needs to
// find and move at runtime needs this off, even at the cost of a larger file.
const skipInstancing = args.includes('--no-instance');

if (!input || !output) {
  console.error('Usage: npm run model -- <input.glb> <output.glb> [--ratio 0.2] [--no-resize] [--no-instance]');
  process.exit(1);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  // Some exports (e.g. re-exported/re-compressed sources, unlike a plain
  // SolidWorks export) arrive Draco-compressed — a decoder is only needed to
  // read those; the output is always re-encoded with meshopt, not Draco.
  'draco3d.decoder': await draco3d.createDecoderModule(),
});

const document = await io.read(input);

// A Draco-compressed source is fully decoded into plain geometry on read —
// Draco is just a wire format, not something the document needs afterward.
// Drop the extension so the writer re-encodes with meshopt (below) instead
// of trying to re-compress with Draco, which needs an encoder module we
// don't otherwise use.
document
  .getRoot()
  .listExtensionsUsed()
  .filter((ext) => ext instanceof KHRDracoMeshCompression)
  .forEach((ext) => ext.dispose());

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

// Some exports mislabel a texture's MIME type — a couple of aluminum normal
// maps in a real conveyor-cart export turned out to be raw DDS data tagged
// as image/png, which neither gltf-transform's own size reader nor sharp
// can parse (DDS isn't a texture format the web can use anyway). Rather than
// crash, drop any texture whose actual bytes don't match its declared type
// and unassign it from whatever material slot pointed to it — the model
// keeps its geometry and base colors, just without that one detail map.
const MAGIC = {
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // 'RIFF'
};
for (const texture of document.getRoot().listTextures()) {
  const bytes = texture.getImage();
  const magic = MAGIC[texture.getMimeType()];
  if (!bytes || !magic || magic.every((b, i) => bytes[i] === b)) continue;
  console.warn(
    `Dropping "${texture.getName() || texture.getURI() || '(unnamed)'}": ` +
      `declared as ${texture.getMimeType()} but its bytes don't match (likely a mislabeled/unsupported format).`,
  );
  for (const material of document.getRoot().listMaterials()) {
    for (const slot of ['BaseColor', 'Normal', 'MetallicRoughness', 'Emissive', 'Occlusion']) {
      if (material[`get${slot}Texture`]?.() === texture) material[`set${slot}Texture`](null);
    }
  }
  texture.dispose();
}

await document.transform(
  prune({ keepAttributes: false, keepLeaves: false }),
  dedup(),
  ...(skipInstancing ? [] : [instance({ min: 2 })]), // repeated parts become GPU instances
  resample(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize }),
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
