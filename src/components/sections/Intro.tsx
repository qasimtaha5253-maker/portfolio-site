import HelixChronoMatrix, { type HelixChronoMatrixProps } from '@/components/ui/helix-chrono-matrix';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import { useScrollFade } from '@/hooks/useScrollFade';

// Navy (top) to orange (bottom). The site is always dark, so `dark` is what shows.
const HELIX_GRADIENT: HelixChronoMatrixProps['gradient'] = {
  light: ['#1e3a8a', '#f97316'],
  dark: ['#3b5cc4', '#fb923c'],
};

/** Full-screen opening animation, fading out into the About section on scroll. */
export function Intro() {
  const animated = useMotionAllowed();
  const ref = useScrollFade<HTMLElement>({ enabled: animated, direction: 'out' });

  return (
    <section className="intro" id="top" aria-label="Introduction" ref={ref}>
      <HelixChronoMatrix headline="Qasim Taha" showControls={false} speed={0.5} gradient={HELIX_GRADIENT}>
        <p className="intro__role">Mechanical Engineering · University of Guelph</p>
      </HelixChronoMatrix>
      <a className="intro__cue" href="#about">
        Scroll to explore ↓
      </a>
    </section>
  );
}
