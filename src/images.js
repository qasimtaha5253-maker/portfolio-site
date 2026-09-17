import { IMAGE_WIDTHS } from './image-widths.js';

const base = import.meta.env.BASE_URL;

/**
 * Builds a responsive, lazy-loaded <img> for a photo produced by
 * `npm run images` (public/projects/<projectId>/<name>-<width>.webp).
 */
export function createPhoto(projectId, image, { sizes = '100vw', eager = false } = {}) {
  const url = (w) => `${base}projects/${projectId}/${image.src}-${w}.webp`;
  const img = document.createElement('img');
  img.src = url(IMAGE_WIDTHS[1]);
  img.srcset = IMAGE_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', ');
  img.sizes = sizes;
  img.alt = image.alt ?? '';
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}
