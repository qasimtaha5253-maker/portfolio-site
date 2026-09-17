import type { Project, ProjectImage } from '@/data/types';
import { Photo } from './Photo';
import { StepContent } from './StepContent';

const THUMB_SIZES = '(min-width: 1100px) 340px, (min-width: 700px) 45vw, 100vw';

/**
 * Compact project card for the "More projects" grid. Details expand with a
 * native <details> element, so it works without JavaScript or animation.
 */
export function ProjectCard({ project }: { project: Project }) {
  const images: ProjectImage[] = [];
  for (const image of [...project.steps.map((s) => s.image), ...(project.gallery ?? [])]) {
    if (image && !images.some((img) => img.src === image.src)) images.push(image);
  }
  const cover = images.find((img) => img.src === project.cover) ?? images[0];
  const gallery = images.filter((img) => img !== cover);

  return (
    <article className="card" id={project.id}>
      {cover && <Photo projectId={project.id} image={cover} sizes={THUMB_SIZES} className="card__thumb" />}

      <div className="card__body">
        <h3 className="card__title">{project.title}</h3>
        {project.context && <p className="card__context">{project.context}</p>}
        {project.summary && <p className="card__summary">{project.summary}</p>}

        <details className="card__details">
          <summary>Details</summary>
          {project.steps.map((step) => (
            <section className="card__section" key={step.label}>
              <h4>{step.label}</h4>
              <StepContent step={step} />
            </section>
          ))}
          {gallery.length > 0 && (
            <div className="card__gallery">
              {gallery.map((image) => (
                <Photo key={image.src} projectId={project.id} image={image} sizes="50vw" />
              ))}
            </div>
          )}
        </details>
      </div>
    </article>
  );
}
