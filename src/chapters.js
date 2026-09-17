import { createVisual } from './visuals/index.js';

/**
 * Builds one <section class="chapter"> per project and returns
 * [{ project, section, stepEls, visual }] for the scroll controller.
 */
export function buildChapters(container, projects) {
  return projects.map((project, i) => {
    const section = document.createElement('section');
    section.className = 'chapter';
    section.id = project.id;
    section.setAttribute('aria-labelledby', `${project.id}-title`);

    const pin = document.createElement('div');
    pin.className = 'chapter__pin';

    const visual = createVisual(project.visual);
    const visualWrap = document.createElement('div');
    visualWrap.className = 'chapter__visual';
    visualWrap.append(visual.el);

    const text = document.createElement('div');
    text.className = 'chapter__text';

    const header = document.createElement('header');
    header.className = 'chapter__header';
    header.innerHTML = `
      <p class="chapter__index">Project ${String(i + 1).padStart(2, '0')}</p>
      <h2 class="chapter__title" id="${project.id}-title"></h2>
      ${project.subtitle ? '<p class="chapter__subtitle"></p>' : ''}
    `;
    header.querySelector('.chapter__title').textContent = project.title;
    if (project.subtitle) header.querySelector('.chapter__subtitle').textContent = project.subtitle;

    const stepsWrap = document.createElement('ol');
    stepsWrap.className = 'chapter__steps';
    const stepEls = project.steps.map((step, s) => {
      const li = document.createElement('li');
      li.className = 'step';
      li.dataset.step = s;
      const h = document.createElement('h3');
      h.className = 'step__label';
      h.textContent = step.label;
      const p = document.createElement('p');
      p.className = 'step__body';
      p.textContent = step.body;
      li.append(h, p);
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
