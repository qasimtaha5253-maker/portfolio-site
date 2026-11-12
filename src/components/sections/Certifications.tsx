import { certifications } from '@/data/certifications';

/** The SOLIDWORKS certification badges in About, each linking to its certificate and verification page. */
export function Certifications() {
  return (
    <div className="certs">
      <h3 className="certs__title">
        Certifications
      </h3>
      <ul className="certs__list">
        {certifications.map((c) => (
          <li className="cert" key={c.slug}>
            <img
              className="cert__badge"
              src={`/certifications/${c.slug}.webp`}
              width={256}
              height={256}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div className="cert__text">
              <p className="cert__issuer">SOLIDWORKS{c.short ? ` · ${c.short}` : ''}</p>
              <p className="cert__name">{c.title}</p>
              <p className="cert__date">{c.date}</p>
              <p className="cert__links">
                <a href={`/certifications/${c.slug}.pdf`} target="_blank" rel="noopener">
                  Certificate
                </a>
                <a href={c.verifyUrl} target="_blank" rel="noopener">
                  Verify
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
