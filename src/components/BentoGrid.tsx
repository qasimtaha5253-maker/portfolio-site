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
  // Heavy step visuals (3D model, embedded animation) wait for the expand
  // animation to finish before mounting, so loading them doesn't compete
  // with it for frames — see `toggle`.
  const [contentReady, setContentReady] = useState(true);

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
   * Runs one open or close as its own Flip transition: freezes the grid's
   * height so pulling every tile out of flow (Flip's `absolute: true`)
   * doesn't collapse the container and jump everything below it, applies
   * `mutate`, then animates every tile from its old bounds to its new ones.
   */
  function animateChange(mutate: () => void, opts: { opening?: boolean; onDone?: () => void } = {}) {
    const grid = gridRef.current;
    if (!grid) return;
    const startHeight = grid.getBoundingClientRect().height;
    const state = Flip.getState(grid.querySelectorAll('.bento-tile'));
    gsap.set(grid, { height: startHeight });
    if (opts.opening) setContentReady(false);
    flushSync(mutate);
    Flip.from(state, {
      duration: 0.6,
      ease: 'power2.inOut',
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.15 }),
      onComplete: () => {
        gsap.set(grid, { clearProps: 'height' });
        if (opts.opening) setContentReady(true);
        opts.onDone?.();
      },
    });
  }

  function toggle(id: string) {
    if (!animated || !gridRef.current) {
      setExpanded((current) => (current === id ? null : id));
      return;
    }
    if (expanded === id) {
      animateChange(() => setExpanded(null));
    } else if (expanded === null) {
      animateChange(() => setExpanded(id), { opening: true });
    } else {
      // Switching straight from one open tile to another: closing the old
      // one and opening the new one at the same time sends every tile
      // between them moving in different directions simultaneously, which
      // reads as the whole grid glitching rather than one clean motion — so
      // fully close the old one first, then open the new one.
      animateChange(() => setExpanded(null), {
        onDone: () => animateChange(() => setExpanded(id), { opening: true }),
      });
    }
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
                    <StepVisual
                      projectId={project.id}
                      step={step}
                      animated={animated}
                      coverSrc={cover?.src}
                      ready={contentReady}
                    />
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
