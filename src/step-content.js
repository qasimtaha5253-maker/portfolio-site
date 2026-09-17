/**
 * Renders a step's body / stats / bullets into `parent`.
 * Shared by pinned chapters and grid cards.
 */
export function renderStepContent(parent, step) {
  if (step.body) {
    const p = document.createElement('p');
    p.className = 'step__body';
    p.textContent = step.body;
    parent.append(p);
  }

  if (step.stats?.length) {
    const dl = document.createElement('dl');
    dl.className = 'stats';
    for (const stat of step.stats) {
      const item = document.createElement('div');
      item.className = 'stats__item';
      const dd = document.createElement('dd');
      dd.className = 'stats__value';
      dd.textContent = stat.value;
      const dt = document.createElement('dt');
      dt.className = 'stats__label';
      dt.textContent = stat.label;
      item.append(dt, dd); // CSS shows the value above the label
      dl.append(item);
    }
    parent.append(dl);
  }

  if (step.bullets?.length) {
    const ul = document.createElement('ul');
    ul.className = 'step__bullets';
    for (const text of step.bullets) {
      const li = document.createElement('li');
      li.textContent = text;
      ul.append(li);
    }
    parent.append(ul);
  }
}
