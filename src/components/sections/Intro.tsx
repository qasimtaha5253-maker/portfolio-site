import HelixChronoMatrix, { type HelixChronoMatrixProps } from '@/components/ui/helix-chrono-matrix';

// Navy (top) to orange (bottom). Dark mode uses a lighter navy so it stays visible.
const HELIX_GRADIENT: HelixChronoMatrixProps['gradient'] = {
  light: ['#1e3a8a', '#f97316'],
  dark: ['#3b5cc4', '#fb923c'],
};

/** Full-screen opening animation with the name headline. */
export function Intro() {
  return (
    <section className="intro" id="top" aria-label="Introduction">
      <HelixChronoMatrix headline="Qasim Taha" showControls={false} speed={0.5} gradient={HELIX_GRADIENT}>
        <p className="intro__role">Mechanical Engineering · University of Guelph</p>
      </HelixChronoMatrix>
      <a className="intro__cue" href="#about">
        Scroll to explore ↓
      </a>
    </section>
  );
}
