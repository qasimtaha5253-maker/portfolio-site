import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Faint, still pictures of the projects' 3D models scattered behind the intro headline.
 * Plain images (public/intro-backdrop/, small trimmed copies of the cover stills made by
 * `npm run backdrop`), no WebGL and nothing animating, so they cost nothing per frame.
 * They are only added once the page has loaded and the browser is idle, so the intro's
 * first paint never waits for them. Positions live in site.css (.intro-backdrop__item--*);
 * on phones some are hidden, and `loading="lazy"` means hidden ones are never downloaded.
 */
const MODELS = [
  'cooling-unit',
  'conveyor-cart',
  'toy-plane',
  'coffee-cup-gripper',
  'meccano-launcher',
  'oiling-tool',
  'ptu-gear-cutting-fixture-row',
  'oiling-assembly-row',
  'shaft-adapter-row',
];

export function IntroBackdrop() {
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let idle = 0;
    const start = () => {
      const go = () => setReady(true);
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(go, { timeout: 2000 });
      else idle = setTimeout(go, 300);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      clearTimeout(idle);
    };
  }, []);

  // Fade in on the frame after the images are in the DOM.
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [ready]);

  if (!ready) return null;
  return (
    <div className={cn('intro-backdrop', shown && 'is-shown')} aria-hidden="true">
      {MODELS.map((name) => (
        <img
          key={name}
          className={`intro-backdrop__item intro-backdrop__item--${name}`}
          src={`/intro-backdrop/${name}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ))}
    </div>
  );
}
