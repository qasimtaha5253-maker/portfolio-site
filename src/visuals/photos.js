import { createPhoto } from '../images.js';

const SIZES = '(min-width: 1100px) 55vw, (min-width: 768px) and (orientation: landscape) 55vw, 100vw';

/**
 * Photo visual: crossfades to each step's `image`. Steps without an image
 * keep the previous photo on screen.
 */
export function create(project) {
  const el = document.createElement('div');
  el.className = 'photo-visual';

  // One <img> per distinct photo, in step order.
  const photos = new Map();
  const stepPhoto = [];
  let last = null;
  for (const step of project.steps) {
    if (step.image && !photos.has(step.image.src)) {
      const img = createPhoto(project.id, step.image, { sizes: SIZES });
      img.className = 'photo-visual__img';
      el.append(img);
      photos.set(step.image.src, img);
    }
    last = step.image ? photos.get(step.image.src) : last;
    stepPhoto.push(last);
  }

  let current = null;

  function setProgress(stepIndex) {
    const next = stepPhoto[stepIndex] ?? stepPhoto.find(Boolean);
    if (next === current) return;
    current?.classList.remove('is-active');
    next?.classList.add('is-active');
    current = next;
  }

  setProgress(0);
  return { el, setProgress };
}
