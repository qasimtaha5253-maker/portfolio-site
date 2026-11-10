import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
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
import { ModelLayer, preloadModel } from './visuals/ModelLayer';
import type { StepModel } from '@/data/types';
import { buttonVariants } from '@/components/ui/button';
import { coverModels, coverModelConfig, stillSrc } from '@/lib/coverModels';
import { CoverLiveScheduler } from '@/lib/coverLive';
import { deviceTier, maxLiveCoverViews } from '@/lib/device';

const base = import.meta.env.BASE_URL;

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

const noSubscribe = () => () => {};

/**
 * A tile's cover models. Each one is a pre-rendered still image (written by
 * the dev tool at tools/stills.html) with, while the scheduler says the tile
 * is live, the real 3D viewer on top of it. The scheduler builds viewers
 * before their tile is in view, so normally the still is never seen: it is
 * what shows if the visitor gets there first, under reduced motion and on
 * weak devices. The viewer starts at the same angle the still was taken
 * from, so once every model in the row has drawn its first frame the still
 * fades out beneath it without a visible jump. If the tile
 * loses its turn (see CoverLiveScheduler) the viewer and its WebGL context are
 * disposed of and the still is back.
 *
 * Liveness is read straight from the scheduler rather than passed down as a
 * prop, so that it changing re-renders this component only, not the grid.
 */
function CoverModels({
  id,
  models,
  scheduler,
  active,
  animated,
}: {
  id: string;
  models: StepModel[];
  scheduler: CoverLiveScheduler | null;
  active: boolean;
  animated: boolean;
}) {
  const live = useSyncExternalStore(scheduler?.subscribe ?? noSubscribe, () => scheduler?.isLive(id) ?? false);
  const [ready, setReady] = useState(0);
  useEffect(() => {
    if (!live) setReady(0);
  }, [live]);
  const onReady = useCallback(() => setReady((n) => n + 1), []);
  // Load failure or a lost WebGL context: back to the still, for good.
  const onError = useCallback(() => scheduler?.failed(id), [scheduler, id]);
  const isLive = live && ready >= models.length;
  // Tells the scheduler this tile is done building, so the next one can start.
  useEffect(() => {
    if (isLive) scheduler?.ready(id);
  }, [isLive, scheduler, id]);
  return (
    <div className={cn('bento-tile__model', models.length > 1 && 'bento-tile__model--row', isLive && 'is-live')}>
      {models.map((model) => (
        <div className="cover-model" key={model.src}>
          <picture>
            <source media="(max-width: 560px)" srcSet={`${base}${stillSrc(model, 'narrow', models.length)}`} />
            <img
              className="cover-model__still"
              src={`${base}${stillSrc(model, 'wide', models.length)}`}
              alt={model.title}
              loading="lazy"
              decoding="async"
            />
          </picture>
          {live && (
            <ModelLayer
              model={coverModelConfig(model, models.length)}
              // Cover models turn on their own (not just on hover). They stop
              // drawing while the tile is open, since the cover is hidden then.
              active={active}
              animated={animated}
              interactive={false}
              eager
              onReady={onReady}
              onError={onError}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export interface BentoGridProps {
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
  // The open tile whose cover 3D view has been released. The cover is hidden
  // while a tile is open, but its WebGL context and render loop would otherwise
  // stay alive beside the step's own models; freeing it (after the 0.3 s fade
  // out) keeps the page lighter. It's rebuilt when the tile closes.
  const [coverFreed, setCoverFreed] = useState<string | null>(null);

  // Live 3D on the covers: each tile's viewers are built ahead of the visitor
  // (once the tile is within a screen and a half), so the model is already
  // turning when it comes into view, and kept — up to `liveCap` WebGL contexts
  // in total, and none at all on a weak device or under reduced motion: those
  // keep the still images, and 3D appears only inside an opened tile. The
  // scheduler (src/lib/coverLive.ts) holds that state outside React, so
  // scrolling never re-renders this grid.
  const liveCap = animated ? maxLiveCoverViews(deviceTier()) : 0;
  const scheduler = useMemo(() => {
    const tiles = new Map<string, number>();
    for (const project of projects) {
      const count = coverModels(project).length;
      if (count) tiles.set(project.id, count);
    }
    if (!liveCap || !tiles.size) return null;
    return new CoverLiveScheduler(tiles, liveCap, (id) => {
      const project = projects.find((p) => p.id === id);
      if (project) for (const model of coverModels(project)) preloadModel(model.src);
    });
  }, [projects, liveCap]);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !scheduler) return;
    return scheduler.attach(grid);
  }, [scheduler]);
  useEffect(() => {
    scheduler?.block(coverFreed);
  }, [scheduler, coverFreed]);

  useEffect(() => {
    setCoverFreed(null);
    if (!expanded) return;
    const timer = setTimeout(() => setCoverFreed(expanded), 400);
    return () => clearTimeout(timer);
  }, [expanded]);

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
            data-cover-models={models.length > 0 ? models.length : undefined}
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
                <CoverModels id={project.id} models={models} scheduler={scheduler} active={!isExpanded} animated={animated} />
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
              {/* Hamburger-to-"×" morph (originui's animated menu-icon pattern): three
                  lines that collapse to the middle and rotate into an X, driven purely by
                  `group-aria-expanded:` off the hit button's own aria-expanded — no
                  React-driven CSS class needed, unlike the old rotate-the-"+" version.
                  The Button's own variant classes (rounded-full overriding its default
                  rounded-lg) style the circle; group-hover/group-focus-visible swap it to
                  the `primary` (orange) look while the tile itself is hovered/focused. */}
              <span
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'icon' }),
                  'bento-tile__toggle rounded-full group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground',
                )}
                aria-hidden="true"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 [transition-timing-function:cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                  />
                </svg>
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
