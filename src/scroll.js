import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

// Avoid re-layout jumps when mobile browser toolbars show/hide.
ScrollTrigger.config({ ignoreMobileResize: true });

// How much scroll distance each step gets, in viewport heights.
const SCROLL_PER_STEP = 1;

function setActiveStep(chapter, index) {
  if (chapter.activeIndex === index) return;
  chapter.activeIndex = index;
  chapter.stepEls.forEach((el, i) => {
    const active = i === index;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-hidden', String(!active));
  });
  chapter.dotEls.forEach((el, i) => el.classList.toggle('is-active', i === index));
}

function initSmoothScroll() {
  const lenis = new Lenis({ anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

function initPinnedChapters(chapters) {
  document.documentElement.classList.add('is-animated');

  chapters.forEach((chapter) => {
    const count = chapter.stepEls.length;
    setActiveStep(chapter, 0);

    ScrollTrigger.create({
      trigger: chapter.section,
      pin: chapter.pin,
      start: 'top top',
      end: () => `+=${window.innerHeight * count * SCROLL_PER_STEP}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const index = Math.min(count - 1, Math.floor(p * count));
        setActiveStep(chapter, index);
        chapter.visual.setProgress(index, p);
      },
    });
  });

  return () => {
    document.documentElement.classList.remove('is-animated');
    chapters.forEach((chapter) => {
      chapter.activeIndex = undefined;
      chapter.stepEls.forEach((el) => {
        el.classList.remove('is-active');
        el.removeAttribute('aria-hidden');
      });
    });
  };
}

/**
 * Full motion: Lenis + pinned, stepped chapters.
 * Reduced motion: native scroll, every step shown as a normal stacked list.
 * gsap.matchMedia reverts everything automatically if the preference changes.
 */
export function initScroll(chapters) {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const destroyLenis = initSmoothScroll();
    const resetChapters = initPinnedChapters(chapters);
    return () => {
      destroyLenis();
      resetChapters();
    };
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    chapters.forEach((chapter) => chapter.visual.setProgress(0, 0));
  });
}
