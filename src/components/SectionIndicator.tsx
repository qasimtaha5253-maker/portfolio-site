import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A small pill fixed to the bottom of the screen while the visitor is reading About:
 * "About me" (where you are) and "Projects" (what's next, a link down to #work), so it's
 * clear there is more below. Hidden on the intro and once the projects take over.
 *
 * "Reading About" = About crosses a band across the middle of the screen and the projects
 * don't yet. IntersectionObserver only fires when that changes, so scrolling doesn't
 * re-render anything. The link goes through Lenis's anchor handling (smooth scroll), or the
 * browser's own jump under reduced motion.
 */
export function SectionIndicator() {
  const [aboutActive, setAboutActive] = useState(false);
  const [workActive, setWorkActive] = useState(false);

  useEffect(() => {
    const about = document.getElementById('about');
    const work = document.getElementById('work');
    if (!about || !work) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === about) setAboutActive(e.isIntersecting);
          if (e.target === work) setWorkActive(e.isIntersecting);
        }
      },
      // A band from 35% to 70% down the screen.
      { rootMargin: '-35% 0px -30% 0px' },
    );
    io.observe(about);
    io.observe(work);
    return () => io.disconnect();
  }, []);

  const visible = aboutActive && !workActive;

  return (
    <nav className={cn('section-indicator', visible && 'is-visible')} aria-label="Page sections" aria-hidden={!visible}>
      <span className="section-indicator__current" aria-current="location">
        <span className="section-indicator__dot" aria-hidden="true" />
        About me
      </span>
      <span className="section-indicator__rule" aria-hidden="true" />
      <a className="section-indicator__next" href="#work" tabIndex={visible ? 0 : -1}>
        Projects
        <ChevronDown className="section-indicator__chevron" aria-hidden="true" />
      </a>
    </nav>
  );
}
