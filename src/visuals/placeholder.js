/**
 * Placeholder visual: a coloured box that changes colour per step and
 * rotates slightly with scroll progress, so the scrub is visible.
 */
export function create(visual) {
  const colors = visual.colors?.length ? visual.colors : ['#888'];

  const el = document.createElement('div');
  el.className = 'placeholder-visual';

  const box = document.createElement('div');
  box.className = 'placeholder-visual__box';
  const label = document.createElement('span');
  label.className = 'placeholder-visual__label';
  box.append(label);
  el.append(box);

  let current = -1;

  function setProgress(stepIndex, progress) {
    if (stepIndex !== current) {
      current = stepIndex;
      box.style.backgroundColor = colors[stepIndex % colors.length];
      label.textContent = `Step ${stepIndex + 1}`;
    }
    // progress is 0–1 across the whole chapter
    box.style.setProperty('--turn', `${progress * 90}deg`);
  }

  setProgress(0, 0);
  return { el, setProgress };
}
