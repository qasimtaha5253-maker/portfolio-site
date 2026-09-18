import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

// Avoid re-layout jumps when mobile browser toolbars show/hide.
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Lenis smooth scrolling, driven by GSAP's ticker and synced with ScrollTrigger.
 * Returns a ref to the Lenis instance (null when reduced motion is on, since
 * Lenis isn't created then) — code that needs to nudge the scroll position
 * itself (e.g. keeping a tile's top edge fixed while it expands) must go
 * through Lenis rather than `window.scrollTo`, or Lenis's own animated
 * scroll position desyncs from the real one and snaps back on the next tick.
 */
export function useSmoothScroll(enabled: boolean): RefObject<Lenis | null> {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ anchors: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return lenisRef;
}
