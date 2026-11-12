// Compiles content/resume/resume.tex (the web copy of the resume, no phone number)
// into public/Qasim-Taha-Resume.pdf, the file the site's "Resume" link opens.
// Needs pdflatex (TeX Live or MiKTeX) on the PATH. Usage: npm run resume
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const src = resolve('content/resume/resume.tex');
const out = resolve('public/Qasim-Taha-Resume.pdf');
const work = mkdtempSync(join(tmpdir(), 'resume-'));

try {
  execFileSync(
    'pdflatex',
    ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${work}`, src],
    { stdio: 'inherit' },
  );
  copyFileSync(join(work, 'resume.pdf'), out);
  console.log(`Wrote ${out}`);
} catch (err) {
  console.error(
    err.code === 'ENOENT'
      ? 'pdflatex not found. Install TeX Live or MiKTeX, or export the PDF from Overleaf and save it as public/Qasim-Taha-Resume.pdf.'
      : 'pdflatex failed; see the log above.',
  );
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
