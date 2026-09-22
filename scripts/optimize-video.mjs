/**
 * Turns a numbered image-sequence export (e.g. SolidWorks Motion Study frames,
 * PlaneAssembly-0000.tga, PlaneAssembly-0001.tga, ...) into a compact looping
 * web video, the same idea as optimize-model.mjs for .glb exports: a huge raw
 * source lives in content/ (gitignored) and only a small, committed file goes
 * in public/.
 *
 *   npm run video -- content/animations/toy-plane public/animations/toy-plane.mp4 \
 *     --fps 30 [--width 1280] [--crf 23] [--poster]
 *
 * Encodes H.264 in an MP4 container (not WebM/VP9) specifically because it's
 * the one format every target browser, including Safari/iOS, plays natively
 * with no fallback `<source>` needed. `--poster` also writes a WebP still of
 * the first frame, for the `<video poster>` attribute (shown before the clip
 * has loaded, and while it's paused for reduced motion).
 *
 * Uses the ffmpeg binary from the `ffmpeg-static` package, not a system
 * install, so this works the same on any machine `npm install` has run on.
 */
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const args = process.argv.slice(2);
const [inputDir, output] = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const fps = Number(flag('fps', 30));
const width = Number(flag('width', 1280));
const crf = Number(flag('crf', 23));
const wantPoster = args.includes('--poster');

if (!inputDir || !output) {
  console.error(
    'Usage: npm run video -- <frames-dir> <output.mp4> [--fps 30] [--width 1280] [--crf 23] [--poster]',
  );
  process.exit(1);
}

const files = (await fs.readdir(inputDir)).filter((f) => /\.tga$/i.test(f)).sort();
if (!files.length) {
  console.error(`No .tga files found in ${inputDir}`);
  process.exit(1);
}

// Frames are named "<prefix>-<N digits>.tga" (SolidWorks' own export naming);
// derive ffmpeg's printf-style pattern from the first file rather than
// assuming a fixed prefix or digit count.
const match = files[0].match(/^(.+?)(\d+)\.tga$/i);
if (!match) {
  console.error(`Expected frames named like "name-0000.tga", got "${files[0]}"`);
  process.exit(1);
}
const [, prefix, firstIndexStr] = match;
const digits = firstIndexStr.length;
const startNumber = Number(firstIndexStr);
const pattern = path.join(inputDir, `${prefix}%0${digits}d.tga`);

console.log(`${files.length} frames, ${fps} fps = ${(files.length / fps).toFixed(1)} s`);

await fs.mkdir(path.dirname(output), { recursive: true });

execFileSync(
  ffmpegPath,
  [
    '-y',
    '-framerate', String(fps),
    '-start_number', String(startNumber),
    '-i', pattern,
    // Round down to an even width/height (H.264 requires both dimensions even).
    '-vf', `scale=${width}:-2`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', // widest hardware-decode compatibility, incl. iOS
    '-crf', String(crf),
    '-preset', 'slow',
    '-movflags', '+faststart', // moov atom up front, so playback can start before the full file downloads
    '-an', // silent — this is a scroll/step visual, not a video with sound
    output,
  ],
  { stdio: 'inherit' },
);

if (wantPoster) {
  const poster = output.replace(/\.mp4$/i, '-poster.webp');
  execFileSync(
    ffmpegPath,
    ['-y', '-start_number', String(startNumber), '-i', pattern, '-vf', `scale=${width}:-2`, '-vframes', '1', poster],
    { stdio: 'inherit' },
  );
  console.log(poster);
}

const [srcBytes, outBytes] = await Promise.all([
  fs.readdir(inputDir).then((fs2) => fs2.length), // frame count, not bytes — the raw sequence is too big to stat quickly
  fs.stat(output).then((s) => s.size),
]);
console.log(`${inputDir} (${srcBytes} frames) -> ${output} ${(outBytes / 1024 / 1024).toFixed(1)} MB`);
