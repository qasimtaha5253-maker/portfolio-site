// Compiles content/resume/resume.tex (the web copy of the resume, no phone number)
// into public/Qasim-Taha-Resume.pdf, the file the site's "Resume" link opens, and
// renders the top of its first page to public/resume-preview-{400,800}.webp, the
// thumbnail in the About section.
// Needs pdflatex (TeX Live or MiKTeX) and pdftoppm (poppler) on the PATH. Usage: npm run resume
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const src = resolve('content/resume/resume.tex');
const out = resolve('public/Qasim-Taha-Resume.pdf');
const PREVIEW_WIDTHS = [400, 800];
// Fraction of the page height the thumbnail shows (header, skills, certifications, first job).
const PREVIEW_CROP = 0.42;
const work = mkdtempSync(join(tmpdir(), 'resume-'));

function run(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: 'inherit' });
  } catch (err) {
    throw new Error(err.code === 'ENOENT' ? `${cmd} not found on the PATH` : `${cmd} failed; see the log above`);
  }
}

try {
  run('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${work}`, src]);
  copyFileSync(join(work, 'resume.pdf'), out);
  console.log(`Wrote ${out}`);

  run('pdftoppm', ['-png', '-r', '200', '-f', '1', '-l', '1', '-singlefile', out, join(work, 'page')]);
  const page = sharp(join(work, 'page.png'));
  const { width, height } = await page.metadata();
  const top = await page.extract({ left: 0, top: 0, width, height: Math.round(height * PREVIEW_CROP) }).toBuffer();
  for (const w of PREVIEW_WIDTHS) {
    const file = resolve(`public/resume-preview-${w}.webp`);
    await sharp(top).resize({ width: w }).webp({ quality: 82 }).toFile(file);
    console.log(`Wrote ${file}`);
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
