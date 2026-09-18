import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import type { Project, ProjectImage } from '@/data/types';
import { Photo } from './Photo';
import { StepContent } from './StepContent';
import { StepVisual } from './StepVisual';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Framer Motion's layout animation is what powers the "card expands into a
// detail view" pattern on 21st.dev (their Morphing Dialog / Expanding Cards
// components). It's built for exactly this: elements stay in normal document
// flow while resizing (unlike a manual FLIP with `position: absolute`), so
// the browser's own scroll position naturally keeps up instead of needing to
// be corrected by hand.
const EXPAND_TRANSITION = { type: 'spring', stiffness: 500, damping: 42, mass: 0.7 } as const;

function coverImage(project: Project): ProjectImage | undefined {
  const images = [...project.steps.map((s) => s.image), ...(project.gallery ?? [])].filter(
    (img): img is ProjectImage => Boolean(img),
  );
  return images.find((img) => img.src === project.cover) ?? images[0];
}

interface BentoGridProps {
  projects: Project[];
  /** Reveal tiles on scroll and animate the expand transition (false when reduced motion is preferred). */
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

  return (
    <div className="bento-grid" ref={gridRef}>
      {projects.map((project) => {
        const cover = coverImage(project);
        const isExpanded = expanded === project.id;
        return (
          <motion.article
            key={project.id}
            id={project.id}
            layout={animated}
            transition={animated ? EXPAND_TRANSITION : { duration: 0 }}
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
              onClick={() => setExpanded(isExpanded ? null : project.id)}
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

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  className="bento-tile__detail"
                  initial={animated ? { height: 0, opacity: 0 } : false}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={animated ? { height: 0, opacity: 0 } : { display: 'none' }}
                  transition={animated ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  {project.summary && <p className="bento-tile__summary bento-tile__summary--detail">{project.summary}</p>}
                  {project.steps.map((step) => (
                    <section className="bento-tile__step" key={step.label}>
                      <h4>{step.label}</h4>
                      <StepContent step={step} />
                      <StepVisual projectId={project.id} step={step} animated={animated} coverSrc={cover?.src} />
                    </section>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>
        );
      })}
    </div>
  );
}
