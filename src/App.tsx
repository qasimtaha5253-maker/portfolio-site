import { projects } from '@/data/projects';
import { cn } from '@/lib/utils';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { Chapter } from '@/components/Chapter';
import { ProjectCard } from '@/components/ProjectCard';
import { Intro } from '@/components/sections/Intro';
import { About } from '@/components/sections/About';
import { ContactLinks } from '@/components/sections/ContactLinks';

const featured = projects.filter((p) => p.featured);
const others = projects.filter((p) => !p.featured);

export default function App() {
  // Reduced motion: native scrolling and a plain stacked layout.
  const animated = useMotionAllowed();
  useSmoothScroll(animated);

  return (
    // `is-animated` switches the CSS to the pinned layout (see styles/site.css).
    <main className={cn('site', animated && 'is-animated')}>
      <Intro />
      <About />

      <div id="chapters">
        {featured.map((project, i) => (
          <Chapter key={project.id} project={project} index={i} animated={animated} />
        ))}
      </div>

      {others.length > 0 && (
        <section className="more" id="more-projects" aria-labelledby="more-projects-title">
          <h2 className="more__title" id="more-projects-title">
            More projects
          </h2>
          <div className="more__grid">
            {others.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      <footer className="footer" id="contact">
        <h2 className="footer__title">Get in touch</h2>
        <ContactLinks />
      </footer>
    </main>
  );
}
