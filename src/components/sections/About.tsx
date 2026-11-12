import { useMotionAllowed } from '@/hooks/useMediaQuery';
import { useScrollFade } from '@/hooks/useScrollFade';
import { ContactLinks } from './ContactLinks';
import { ResumePreview } from './ResumePreview';
import { Certifications } from './Certifications';

export function About() {
  const animated = useMotionAllowed();
  const ref = useScrollFade<HTMLDivElement>({ enabled: animated, direction: 'in' });

  return (
    <section className="hero" id="about" aria-labelledby="about-title">
      <div className="hero__layout" ref={ref}>
        <div className="hero__inner">
          <p className="hero__eyebrow">Mechanical Engineering Co-op · University of Guelph</p>
          <h2 className="hero__title" id="about-title">
            About me
          </h2>
          <p className="hero__lede">
            I’m a mechanical engineering student at the University of Guelph, graduating in 2027, and a Certified
            SOLIDWORKS Professional (CSWP). I enjoy the full design loop: modeling a part, checking it against real
            constraints like fit, tolerances and manufacturability, and refining it until it’s ready to build. Outside
            school, 3D printing is my hobby and a small side business, where I make functional parts in
            engineering-grade materials. It’s given me a practical feel for designing parts that print, fit and hold
            up. Having worked on the manufacturing side, I design with how things actually get made in mind.
          </p>
          <ContactLinks />
        </div>
        <ResumePreview />
        <Certifications />
      </div>
    </section>
  );
}
