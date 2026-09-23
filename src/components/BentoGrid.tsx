import { useEffect, useRef, useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type Lenis from 'lenis';
import { cn } from '@/lib/utils';
import type { Project, ProjectImage } from '@/data/types';
import { Photo } from './Photo';
import { StepContent } from './StepContent';
import { StepVisual } from './StepVisual';
import { ModelLayer } from './visuals/ModelLayer';
import type { StepModel } from '@/data/types';
import { buttonVariants } from '@/components/ui/button';

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

/** A project with a model on one of its steps shows it as its tile cover
 *  (rotating on hover) instead of a plain photo. A `split` row or `stack`
 *  on any step supplies every model in it, side by side. Otherwise, every
 *  step's own single `model` is used, deduped by src (a project may repeat
 *  the same model on more than one step — the cover only needs it once) —
 *  so a project with several different model-bearing steps (e.g. Assembly
 *  Line Fixtures & Tooling) gets all of them side by side on its cover. */
function coverModels(project: Project): StepModel[] {
  for (const step of project.steps) {
    for (const items of [step.split, step.stack]) {
      const models = items?.flatMap((item) => (item.model ? [item.model] : [])) ?? [];
      if (models.length) return models;
    }
  }
  const seen = new Set<string>();
  const models: StepModel[] = [];
  for (const step of project.steps) {
    if (step.model && !seen.has(step.model.src)) {
      seen.add(step.model.src);
      models.push(step.model);
    }
  }
  return models;
}

interface BentoGridProps {
  projects: Project[];
  /** Reveal tiles on scroll and animate the expand transition (false when reduced motion is preferred). */
  animated: boolean;
  /** The page's Lenis instance, so scrolling to an opened tile goes through
   *  it instead of fighting its own animated scroll position. */
  lenisRef: RefObject<Lenis | null>;
}

/** An element's distance from the top of the document, ignoring any CSS
 *  `transform` — unlike `getBoundingClientRect`, this stays correct even
 *  while Framer Motion's layout animation is still visually easing the tile
 *  toward this (already-final) position. */
function documentTop(el: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/**
 * Every project as a same-sized tile in one grid. Tapping a tile
 * expands it in place to show its steps; the rest of the grid reflows below.
 */
export function BentoGrid({ projects, animated, lenisRef }: BentoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Heavy step visuals (3D model, embedded animation) wait for the expand
  // animation to finish before mounting, so loading them doesn't compete
  // with it for frames — see `toggle` and the detail's onAnimationComplete.
  const [contentReady, setContentReady] = useState(true);

  function toggle(id: string) {
    const opening = expanded !== id;
    if (opening) setContentReady(false);
    setExpanded(opening ? id : null);
  }

  // Opening a tile — especially switching straight from one open tile to
  // another — reflows everything around it: a tile above collapsing pulls
  // the page up, the new one growing pushes it back down. Left alone, that
  // reads as the page glitching. Instead, actively lock the scroll onto
  // wherever the opening tile currently sits, every frame, for as long as
  // the layout is still moving.
  //
  // A single one-shot scroll (measure once, animate there) isn't enough:
  // when switching tiles, the *previous* tile is still mid-exit-animation
  // (AnimatePresence keeps it mounted, animating its height down over 0.35s)
  // at the moment this effect first runs, so a single measurement targets
  // where the new tile is *right now* — with the old one still tall — not
  // where it ends up once that collapse finishes. Re-measuring every frame
  // means the scroll target itself moves smoothly in step with the real
  // layout, however long that takes, instead of committing to a stale guess.
  useEffect(() => {
    if (!animated || !expanded) return;
    const lenis = lenisRef.current;
    const el = document.getElementById(expanded);
    if (!lenis || !el) return;

    let frame = 0;
    let lastTarget = -1;
    let stableFrames = 0;
    const start = performance.now();

    function tick(now: number) {
      const target = Math.max(0, documentTop(el!) - 20);
      lenis!.scrollTo(target, { immediate: true });
      stableFrames = Math.abs(target - lastTarget) < 0.5 ? stableFrames + 1 : 0;
      lastTarget = target;
      // Stop once the target holds still for a few frames (everything has
      // settled), or after a safety cap in case it never quite does.
      if (stableFrames < 6 && now - start < 1400) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [expanded, animated, lenisRef]);

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
        const models = coverModels(project);
        const isExpanded = expanded === project.id;
        return (
          <motion.article
            key={project.id}
            id={project.id}
            layout={animated}
            transition={animated ? EXPAND_TRANSITION : { duration: 0 }}
            className={cn(
              'bento-tile',
              isExpanded && 'bento-tile--expanded',
            )}
          >
            <button
              type="button"
              // `group` lets the toggle below react to this button's own
              // hover/focus-visible (group-hover:/group-focus-visible:)
              // instead of a custom CSS parent-hover selector — needed here
              // because that selector would sit in @layer components, which
              // Tailwind's own utility classes (@layer utilities) always
              // beat regardless of specificity, so a plain custom rule can't
              // reliably override the toggle's shadcn background classes.
              className="bento-tile__hit group"
              aria-expanded={isExpanded}
              onClick={() => toggle(project.id)}
            >
              {models.length > 0 ? (
                <div className={cn('bento-tile__model', models.length > 1 && 'bento-tile__model--row')}>
                  {models.map((model) => (
                    <ModelLayer
                      key={model.src}
                      // A row of models wants each as big as it can be, and its tall,
                      // narrow canvases don't crop the way a step's wide box does, so the
                      // extra `margin` set for the step view is left out here.
                      model={models.length > 1 ? { ...model, margin: undefined } : model}
                      // Cover models turn on their own (not just on hover). They stop
                      // drawing while the tile is open, since the cover is hidden then.
                      active={!isExpanded}
                      animated={animated}
                      interactive={false}
                    />
                  ))}
                </div>
              ) : (
                cover && (
                  <Photo
                    projectId={project.id}
                    image={cover}
                    sizes="(min-width: 1100px) 45vw, (min-width: 700px) 45vw, 100vw"
                    className="bento-tile__photo"
                  />
                )
              )}
              <div className="bento-tile__scrim" />
              <div className="bento-tile__caption">
                {project.context && <p className="bento-tile__context">{project.context}</p>}
                <h3 className="bento-tile__title">{project.title}</h3>
                {project.summary && !isExpanded && <p className="bento-tile__summary">{project.summary}</p>}
              </div>
              {/* Always "+"; CSS rotates it 45° when expanded so it morphs into a "×"
                  instead of snapping between two different glyphs. The originui/shadcn
                  Button's own shape/variant classes (rounded-full overriding its default
                  rounded-lg) style it; group-hover/group-focus-visible swap it to the
                  `primary` (orange) look while the tile itself is hovered/focused. */}
              <span
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'icon' }),
                  'bento-tile__toggle rounded-full group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground',
                )}
                aria-hidden="true"
              >
                +
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
                  onAnimationComplete={() => {
                    if (isExpanded) setContentReady(true);
                  }}
                >
                  {project.summary && <p className="bento-tile__summary bento-tile__summary--detail">{project.summary}</p>}
                  {project.steps.map((step, stepIndex) => (
                    <section className="bento-tile__step" key={`${step.label}-${stepIndex}`}>
                      {/* A step can share its heading with the one before it (an empty
                          label) — e.g. a second visual that continues the same section
                          instead of starting a new one. */}
                      {step.label && <h4>{step.label}</h4>}
                      <StepContent step={step} ready={contentReady} />
                      <StepVisual
                        projectId={project.id}
                        step={step}
                        animated={animated}
                        coverSrc={cover?.src}
                        ready={contentReady}
                      />
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
