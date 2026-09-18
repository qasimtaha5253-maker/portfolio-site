import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import type { Project, ProjectImage } from '@/data/types';
import { Photo } from './Photo';
import { StepContent } from './StepContent';
import { StepVisual } from './StepVisual';

gsap.registerPlugin(ScrollTrigger, Flip, useGSAP);

function coverImage(project: Project): ProjectImage | undefined {
  const images = [...project.steps.map((s) => s.image), ...(project.gallery ?? [])].filter(
    (img): img is ProjectImage => Boolean(img),
  );
  return images.find((img) => img.src === project.cover) ?? images[0];
}

interface BentoGridProps {
  projects: Project[];
  /** Reveal tiles on scroll (false when reduced motion is preferred). */
  animated: boolean;
}

/**
 * Every project as a tile in one grid, sized by `featured`. Tapping a tile
 * expands it in place to show its steps; the rest of the grid reflows below.
 */
export function BentoGrid({ projects, animated }: BentoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useGSAP(
    () => {
      if (!animated || !gridRef.current) return;
      const tiles = gridRef.current.querySelectorAll('.bento-tile');
      gsap.set(tiles, { opacity: 0, y: 28 });
      ScrollTrigger.batch(tiles, {
        start: 'top 88%',
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }),
      });
    },
    { dependencies: [animated], scope: gridRef, revertOnUpdate: true },
  );

  /**
   * Expanding a tile reflows every other tile in the grid, not just the one
   * tapped — Flip animates all of them from their old bounds to their new
   * ones instead of letting the grid jump straight to the new layout.
   */
  function toggle(id: string) {
    if (!animated || !gridRef.current) {
      setExpanded((current) => (current === id ? null : id));
      return;
    }
    const state = Flip.getState(gridRef.current.querySelectorAll('.bento-tile'));
    flushSync(() => setExpanded((current) => (current === id ? null : id)));
    Flip.from(state, {
      duration: 0.6,
      ease: 'power2.inOut',
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.15 }),
    });
  }

  return (
    <div className="bento-grid" ref={gridRef}>
      {projects.map((project) => {
        const cover = coverImage(project);
        const isExpanded = expanded === project.id;
        return (
          <article
            key={project.id}
            id={project.id}
            className={cn(
              'bento-tile',
              project.featured && 'bento-tile--large',
              isExpanded && 'bento-tile--expanded',
            )}
          >
            <button
              type="button"
              className="bento-tile__hit"
              aria-expanded={isExpanded}
              onClick={() => toggle(project.id)}
            >
              {cover && (
                <Photo
                  projectId={project.id}
                  image={cover}
                  sizes="(min-width: 1100px) 45vw, (min-width: 700px) 45vw, 100vw"
                  className="bento-tile__photo"
                />
              )}
              <div className="bento-tile__scrim" />
              <div className="bento-tile__caption">
                {project.context && <p className="bento-tile__context">{project.context}</p>}
                <h3 className="bento-tile__title">{project.title}</h3>
                {project.summary && !isExpanded && <p className="bento-tile__summary">{project.summary}</p>}
              </div>
              <span className="bento-tile__toggle" aria-hidden="true">
                {isExpanded ? '×' : '+'}
              </span>
            </button>

            {isExpanded && (
              <div className="bento-tile__detail">
                {project.summary && <p className="bento-tile__summary bento-tile__summary--detail">{project.summary}</p>}
                {project.steps.map((step) => (
                  <section className="bento-tile__step" key={step.label}>
                    <h4>{step.label}</h4>
                    <StepContent step={step} />
                    <StepVisual projectId={project.id} step={step} animated={animated} coverSrc={cover?.src} />
                  </section>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
