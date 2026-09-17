import { createPhoto } from './images.js';
import { renderStepContent } from './step-content.js';

const THUMB_SIZES = '(min-width: 1100px) 340px, (min-width: 700px) 45vw, 100vw';

/**
 * Builds the "More projects" grid. Each card is a <details> element, so it
 * expands without JavaScript and works the same with reduced motion.
 */
export function buildCards(container, projects) {
  for (const project of projects) {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = project.id;

    const images = [];
    for (const image of [...project.steps.map((s) => s.image), ...(project.gallery ?? [])]) {
      if (image && !images.some((img) => img.src === image.src)) images.push(image);
    }
    const cover = images.find((img) => img.src === project.cover) ?? images[0];

    if (cover) {
      const thumb = createPhoto(project.id, cover, { sizes: THUMB_SIZES });
      thumb.className = 'card__thumb';
      card.append(thumb);
    }

    const body = document.createElement('div');
    body.className = 'card__body';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = project.title;
    body.append(title);

    if (project.context) {
      const context = document.createElement('p');
      context.className = 'card__context';
      context.textContent = project.context;
      body.append(context);
    }

    if (project.summary) {
      const summary = document.createElement('p');
      summary.className = 'card__summary';
      summary.textContent = project.summary;
      body.append(summary);
    }

    const details = document.createElement('details');
    details.className = 'card__details';
    const toggle = document.createElement('summary');
    toggle.textContent = 'Details';
    details.append(toggle);

    for (const step of project.steps) {
      const section = document.createElement('section');
      section.className = 'card__section';
      const h = document.createElement('h4');
      h.textContent = step.label;
      section.append(h);
      renderStepContent(section, step);
      details.append(section);
    }

    const gallery = images.filter((img) => img !== cover);
    if (gallery.length) {
      const strip = document.createElement('div');
      strip.className = 'card__gallery';
      for (const image of gallery) strip.append(createPhoto(project.id, image, { sizes: '50vw' }));
      details.append(strip);
    }

    body.append(details);
    card.append(body);
    container.append(card);
  }
}
