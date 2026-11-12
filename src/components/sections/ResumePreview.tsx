import { ArrowUpRight, FileText } from 'lucide-react';
import { RESUME_URL } from './ContactLinks';

/**
 * A small card in About showing the top of the resume's first page; clicking it opens the PDF.
 * The images are rendered from the PDF by `npm run resume`, so they always match it.
 */
export function ResumePreview() {
  return (
    <a className="resume-preview" href={RESUME_URL} target="_blank" rel="noopener">
      <span className="resume-preview__paper">
        <img
          src="/resume-preview-400.webp"
          srcSet="/resume-preview-400.webp 400w, /resume-preview-800.webp 800w"
          sizes="(max-width: 26rem) calc(100vw - 2rem), 22rem"
          width={400}
          height={217}
          alt="Preview of the top of my resume"
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="resume-preview__bar">
        <FileText className="resume-preview__icon" aria-hidden="true" />
        <span className="resume-preview__label">Resume</span>
        <span className="resume-preview__meta">PDF · 1 page</span>
        <ArrowUpRight className="resume-preview__arrow" aria-hidden="true" />
      </span>
    </a>
  );
}
