export const LINKEDIN_URL = 'https://www.linkedin.com/in/qasim-taha';
export const EMAIL = 'qtaha@uoguelph.ca';

export function ContactLinks() {
  return (
    <ul className="contact">
      <li>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener">
          LinkedIn
        </a>
      </li>
      <li>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </li>
    </ul>
  );
}
