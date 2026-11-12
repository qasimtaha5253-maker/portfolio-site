/**
 * Certifications shown in About. Each one has a badge (cut from the certificate,
 * public/certifications/<slug>.webp), the certificate itself (<slug>.pdf), and the
 * issuer's verification page (the URL in the certificate's QR code).
 */
export interface Certification {
  slug: string;
  /** Shown large on the card. */
  title: string;
  /** Short form, if the certification is known by one (e.g. CSWP). */
  short?: string;
  /** Month and year it was earned, as shown on the card. */
  date: string;
  verifyUrl: string;
}

export const certifications: Certification[] = [
  {
    slug: 'cswp',
    title: 'Design Professional',
    short: 'CSWP',
    date: 'Sept. 2026',
    verifyUrl: 'https://cv.virtualtester.com/qr/?b=SLDWRKS&i=C-3XJN8YSM2R',
  },
  {
    slug: 'electrical',
    title: 'Electrical Design Associate',
    date: 'Sept. 2026',
    verifyUrl: 'https://cv.virtualtester.com/qr/?b=SLDWRKS&i=C-BR56924EMW',
  },
  {
    slug: 'sustainability',
    title: 'Sustainability Associate',
    date: 'Sept. 2026',
    verifyUrl: 'https://cv.virtualtester.com/qr/?b=SLDWRKS&i=C-CFAG4LQEVM',
  },
  {
    slug: 'additive-manufacturing',
    title: 'Additive Manufacturing Associate',
    date: 'Oct. 2026',
    verifyUrl: 'https://cv.virtualtester.com/qr/?b=SLDWRKS&i=C-KH7ABYS962',
  },
];
