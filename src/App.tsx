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
  const lenisRef = useSmoothScroll(animated);

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

        <BentoGrid projects={projects} animated={animated} lenisRef={lenisRef} />
      </section>

      <footer className="footer" id="contact">
        {/* Decorative echo of the intro's helix canvas — a faint, static
            version of the same navy-to-orange rings, bookending the page.
            Static (not the live WebGL canvas) since it's just a background
            flourish, not worth a second animated canvas. */}
        <svg className="footer__echo" viewBox="0 0 800 280" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="footerEchoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b5cc4" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#footerEchoGradient)" strokeWidth="1.2">
            <ellipse cx="400" cy="140" rx="360" ry="60" opacity="0.55" />
            <ellipse cx="400" cy="140" rx="300" ry="95" opacity="0.4" />
            <ellipse cx="400" cy="140" rx="230" ry="125" opacity="0.3" />
            <ellipse cx="250" cy="90" rx="140" ry="40" opacity="0.35" />
            <ellipse cx="560" cy="190" rx="150" ry="42" opacity="0.35" />
          </g>
          <g fill="url(#footerEchoGradient)" opacity="0.6">
            <circle cx="120" cy="120" r="2.5" />
            <circle cx="680" cy="160" r="2.5" />
            <circle cx="400" cy="40" r="2" />
            <circle cx="400" cy="240" r="2" />
            <circle cx="240" cy="200" r="1.8" />
            <circle cx="560" cy="80" r="1.8" />
          </g>
        </svg>
        <h2 className="footer__title">Get in touch</h2>
        <ContactLinks />
      </footer>
    </main>
  );
}
