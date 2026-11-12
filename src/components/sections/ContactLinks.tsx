export const LINKEDIN_URL = 'https://www.linkedin.com/in/qasim-taha';
export const EMAIL = 'qasim.taha5253@gmail.com';
// Built from content/resume/resume.tex by `npm run resume` (web copy: no phone number).
export const RESUME_URL = '/Qasim-Taha-Resume.pdf';

/** `showResume={false}` in About, where the resume preview card already links to it. */
export function ContactLinks({ showResume = true }: { showResume?: boolean }) {
  return (
    <ul className="contact">
      <li>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener">
          LinkedIn
        </a>
      </li>
      {showResume && (
        <li>
          <a href={RESUME_URL} target="_blank" rel="noopener">
            Resume
          </a>
        </li>
      )}
      <li>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </li>
    </ul>
  );
}
