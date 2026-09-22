import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { experience } from '@/data/experience';
import { useMotionAllowed } from '@/hooks/useMediaQuery';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Matches a **bold** metric in a highlight string (see data/experience.ts).
const METRIC = /\*\*(.+?)\*\*/g;

/** Splits a highlight on its **metric** marker(s) and renders the marked
 *  part in the same accent gradient as the project stat numbers. */
function renderHighlight(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  METRIC.lastIndex = 0;
  while ((match = METRIC.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <strong className="experience__metric" key={key++}>
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Work experience, shown as stacked cards (newest first) directly below the
 * About hero. A subtle fade-up as each card enters view — no scroll pinning
 * — same reveal treatment as the project tiles below; skipped entirely
 * under reduced motion.
 */
export function Experience() {
  const animated = useMotionAllowed();
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!animated || !listRef.current) return;
      const items = listRef.current.querySelectorAll('.experience__item');
      gsap.set(items, { opacity: 0, y: 28 });
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 }),
      });
    },
    { dependencies: [animated], scope: listRef, revertOnUpdate: true },
  );

  return (
    <section className="bento-section experience-section" id="experience" aria-labelledby="experience-title">
      <header className="bento-section__header">
        <p className="bento-section__eyebrow">Experience</p>
        <h2 className="bento-section__title" id="experience-title">
          Where I&apos;ve worked
        </h2>
      </header>

      <div className="experience" ref={listRef}>
        {experience.map((job) => (
          <article className="experience__item" key={`${job.company}-${job.dates}`}>
            <div className="experience__head">
              <div>
                <h3 className="experience__role">{job.role}</h3>
                <p className="experience__company">{job.company}</p>
              </div>
              <p className="bento-tile__context experience__meta">
                {job.location} | {job.dates}
              </p>
            </div>
            <p className="experience__summary">{job.summary}</p>
            <ul className="experience__highlights">
              {job.highlights.map((highlight) => (
                <li key={highlight}>{renderHighlight(highlight)}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
