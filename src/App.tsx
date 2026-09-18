import { projects } from '@/data/projects';
import { cn } from '@/lib/utils';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { BentoGrid } from '@/components/BentoGrid';
import { Intro } from '@/components/sections/Intro';
import { About } from '@/components/sections/About';
import { ContactLinks } from '@/components/sections/ContactLinks';

export default function App() {
  // Reduced motion: no tile reveal animation, everything shown at once.
  const animated = useMotionAllowed();
  useSmoothScroll(animated);

  return (
    <main className={cn('site', animated && 'is-animated')}>
      <Intro />
      <About />

      <section className="bento-section" id="work" aria-labelledby="work-title">
        <header className="bento-section__header">
          <p className="bento-section__eyebrow">Projects</p>
          <h2 className="bento-section__title" id="work-title">
            What I&apos;ve built
          </h2>
          <p className="bento-section__hint">Tap a project to see how it works.</p>
        </header>

        <BentoGrid projects={projects} animated={animated} />
      </section>

      <footer className="footer" id="contact">
        <h2 className="footer__title">Get in touch</h2>
        <ContactLinks />
      </footer>
    </main>
  );
}
