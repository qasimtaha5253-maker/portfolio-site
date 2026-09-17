import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from '@/components/Photo';
import type { ProjectImage } from '@/data/types';
import type { VisualProps } from './types';

const SIZES = '(min-width: 1100px) 55vw, (min-width: 768px) and (orientation: landscape) 55vw, 100vw';

/**
 * Crossfades to each step's `image`. Steps without an image keep the
 * previous photo on screen.
 */
export function PhotosVisual({ project, step }: VisualProps) {
  const { photos, stepPhoto } = useMemo(() => {
    const photos: ProjectImage[] = [];
    const stepPhoto: (string | undefined)[] = [];
    let last: string | undefined;
    for (const s of project.steps) {
      if (s.image && !photos.some((p) => p.src === s.image!.src)) photos.push(s.image);
      last = s.image?.src ?? last;
      stepPhoto.push(last);
    }
    return { photos, stepPhoto };
  }, [project]);

  const active = stepPhoto[step] ?? stepPhoto.find(Boolean);

  return (
    <div className="photo-visual">
      {photos.map((image) => (
        <Photo
          key={image.src}
          projectId={project.id}
          image={image}
          sizes={SIZES}
          className={cn('photo-visual__img', image.src === active && 'is-active')}
        />
      ))}
    </div>
  );
}
