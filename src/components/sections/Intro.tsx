import HelixChronoMatrix from '@/components/ui/helix-chrono-matrix';

/** Full-screen opening animation with the name headline. */
export function Intro() {
  return (
    <section className="intro" id="top" aria-label="Introduction">
      <HelixChronoMatrix headline="Qasim Taha" showControls={false}>
        <p className="intro__role">Mechanical Engineering · University of Guelph</p>
      </HelixChronoMatrix>
      <a className="intro__cue" href="#about">
        Scroll to explore ↓
      </a>
    </section>
  );
}
