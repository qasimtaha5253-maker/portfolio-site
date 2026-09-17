import { ContactLinks } from './ContactLinks';

export function About() {
  return (
    <section className="hero" id="about" aria-labelledby="about-title">
      <div className="hero__inner">
        <p className="hero__eyebrow">Mechanical Engineering Co-op · University of Guelph</p>
        <h2 className="hero__title" id="about-title">
          About me
        </h2>
        <p className="hero__lede">
          I’m a final-year Mechanical Engineering co-op student with a strong interest in mechanical design,
          especially robotics and automation. I enjoy taking ideas from early concepts to working hardware through
          CAD, prototyping, testing and iteration.
        </p>
        <p className="hero__lede hero__lede--secondary">
          These projects show how I design, build and refine — with a focus on real-world performance, reliability
          and clear design intent.
        </p>
        <ContactLinks />
      </div>
    </section>
  );
}
