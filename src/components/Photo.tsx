import IMAGE_WIDTHS from '@/image-widths.json';
import type { ProjectImage } from '@/data/types';

const base = import.meta.env.BASE_URL;

interface PhotoProps {
  projectId: string;
  image: ProjectImage;
  sizes?: string;
  className?: string;
  eager?: boolean;
}

/**
 * Responsive, lazy-loaded photo produced by `npm run images`
 * (public/projects/<projectId>/<name>-<width>.webp).
 */
export function Photo({ projectId, image, sizes = '100vw', className, eager = false }: PhotoProps) {
  const url = (w: number) => `${base}projects/${projectId}/${image.src}-${w}.webp`;
  return (
    <img
      className={className}
      src={url(IMAGE_WIDTHS[1])}
      srcSet={IMAGE_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', ')}
      sizes={sizes}
      alt={image.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
