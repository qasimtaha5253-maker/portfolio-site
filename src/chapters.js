import { createVisual } from './visuals/index.js';
import { createPhoto } from './images.js';
import { renderStepContent } from './step-content.js';

/**
 * Builds one <section class="chapter"> per featured project and returns
 * [{ project, section, pin, stepEls, dotEls, visual }] for the scroll controller.
 */
export function buildChapters(container, projects) {
  return projects.map((project, i) => {
    const section = document.createElement('section');
    section.className = 'chapter';
    section.id = project.id;
    section.setAttribute('aria-labelledby', `${project.id}-title`);
    const hasStepImages = project.steps.some((s) => s.image);
    section.classList.toggle('has-step-media', hasStepImages);

    const pin = document.createElement('div');
    pin.className = 'chapter__pin';

    const visual = createVisual(project);
    const visualWrap = document.createElement('div');
    visualWrap.className = 'chapter__visual';
    visualWrap.append(visual.el);

    const text = document.createElement('div');
    text.className = 'chapter__text';

    const header = document.createElement('header');
    header.className = 'chapter__header';
    const index = document.createElement('p');
    index.className = 'chapter__index';
    index.textContent = `Project ${String(i + 1).padStart(2, '0')}`;
    const title = document.createElement('h2');
    title.className = 'chapter__title';
    title.id = `${project.id}-title`;
    title.textContent = project.title;
    header.append(index, title);
    if (project.context) {
      const context = document.createElement('p');
      context.className = 'chapter__context';
      context.textContent = project.context;
      header.append(context);
    }

    const stepsWrap = document.createElement('ol');
    stepsWrap.className = 'chapter__steps';
    const stepEls = project.steps.map((step, s) => {
      const li = document.createElement('li');
      li.className = 'step';
      li.dataset.step = s;
      const h = document.createElement('h3');
      h.className = 'step__label';
      h.textContent = step.label;
      li.append(h);
      renderStepContent(li, step);
      // Inline photo, shown only in the static (reduced-motion) layout.
      if (step.image) {
        const fig = document.createElement('figure');
        fig.className = 'step__media';
        fig.append(createPhoto(project.id, step.image, { sizes: '(min-width: 768px) 40rem, 100vw' }));
        li.append(fig);
      }
      stepsWrap.append(li);
      return li;
    });

    const dots = document.createElement('div');
    dots.className = 'chapter__dots';
    dots.setAttribute('aria-hidden', 'true');
    const dotEls = project.steps.map(() => {
      const d = document.createElement('span');
      dots.append(d);
      return d;
    });

    text.append(header, stepsWrap, dots);
    pin.append(visualWrap, text);
    section.append(pin);
    container.append(section);

    return { project, section, pin, stepEls, dotEls, visual };
  });
}
