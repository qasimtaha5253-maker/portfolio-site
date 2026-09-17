import { useSyncExternalStore } from 'react';

/** Live result of a CSS media query. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

// Dev only: add ?reduced-motion to the URL to preview the reduced-motion layout.
const forceReducedMotion = import.meta.env.DEV && new URLSearchParams(location.search).has('reduced-motion');

/** True when the visitor hasn't asked for reduced motion. */
export function useMotionAllowed() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  return !(reduced || forceReducedMotion);
}
