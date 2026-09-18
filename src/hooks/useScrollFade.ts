import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollFadeOptions {
  /** Skip the effect (reduced motion): the element just stays visible. */
  enabled: boolean;
  /** 'out' fades away as the element leaves; 'in' fades up as it arrives. */
  direction: 'out' | 'in';
}

/**
 * Ties an element's opacity to scroll position, so the intro dissolves into
 * the About section instead of cutting to it.
 */
export function useScrollFade<T extends HTMLElement>({ enabled, direction }: ScrollFadeOptions) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!enabled || !el) return;

      if (direction === 'out') {
        gsap.to(el, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: '70% top', scrub: true },
        });
      } else {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: true },
          },
        );
      }
    },
    { dependencies: [enabled, direction], revertOnUpdate: true },
  );

  return ref;
}
