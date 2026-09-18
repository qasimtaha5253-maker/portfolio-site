import { useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from '@/components/Photo';
import type { ProjectImage, StepEmbed } from '@/data/types';
import type { VisualProps } from './types';

const SIZES = '(min-width: 1100px) 55vw, (min-width: 768px) and (orientation: landscape) 55vw, 100vw';
const base = import.meta.env.BASE_URL;

type Layer = { kind: 'image'; value: ProjectImage } | { kind: 'embed'; value: StepEmbed };

/**
 * Shows each step's photo, or its HTML animation, crossfading between them.
 * A step without either keeps whatever the previous step showed.
 */
export function PhotosVisual({ project, step }: VisualProps) {
  const { images, embeds, perStep } = useMemo(() => {
    const images: ProjectImage[] = [];
    const embeds: StepEmbed[] = [];
    const perStep: (Layer | undefined)[] = [];
    let current: Layer | undefined;

    for (const s of project.steps) {
      // A step can set a photo, an animation, or neither; the newest wins.
      if (s.image && !images.some((i) => i.src === s.image!.src)) images.push(s.image);
      if (s.embed && !embeds.some((e) => e.src === s.embed!.src)) embeds.push(s.embed);
      if (s.embed) current = { kind: 'embed', value: s.embed };
      else if (s.image) current = { kind: 'image', value: s.image };
      perStep.push(current);
    }
    return { images, embeds, perStep };
  }, [project]);

  const active = perStep[step] ?? perStep.find(Boolean);

  // Load an animation only once its step has been reached, so it costs nothing
  // for visitors who never scroll that far.
  const reached = useRef(new Set<string>());
  if (active?.kind === 'embed') reached.current.add(active.value.src);

  return (
    <div className="photo-visual">
      {images.map((image) => (
        <Photo
          key={image.src}
          projectId={project.id}
          image={image}
          sizes={SIZES}
          className={cn(
            'photo-visual__img',
            active?.kind === 'image' && active.value.src === image.src && 'is-active',
          )}
        />
      ))}

      {embeds.map((embed) =>
        reached.current.has(embed.src) ? (
          <iframe
            key={embed.src}
            src={`${base}${embed.src}`}
            title={embed.title}
            loading="lazy"
            scrolling="no"
            className={cn(
              'photo-visual__frame',
              active?.kind === 'embed' && active.value.src === embed.src && 'is-active',
            )}
          />
        ) : null,
      )}
    </div>
  );
}
