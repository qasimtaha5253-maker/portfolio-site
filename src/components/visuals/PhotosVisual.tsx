import { useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from '@/components/Photo';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import type { ProjectImage, StepEmbed, StepModel } from '@/data/types';
import { ModelLayer } from './ModelLayer';
import type { VisualProps } from './types';

const SIZES = '(min-width: 1100px) 55vw, (min-width: 768px) and (orientation: landscape) 55vw, 100vw';
const base = import.meta.env.BASE_URL;

type Layer =
  | { kind: 'image'; value: ProjectImage }
  | { kind: 'embed'; value: StepEmbed }
  | { kind: 'model'; value: StepModel };

/**
 * Shows what each step calls for — a photo, an HTML animation or a 3D model —
 * crossfading between them. A step that sets none keeps the previous one.
 */
export function PhotosVisual({ project, step }: VisualProps) {
  const animated = useMotionAllowed();

  const { images, embeds, models, perStep } = useMemo(() => {
    const images: ProjectImage[] = [];
    const embeds: StepEmbed[] = [];
    const models: StepModel[] = [];
    const perStep: (Layer | undefined)[] = [];
    let current: Layer | undefined;

    for (const s of project.steps) {
      if (s.image && !images.some((i) => i.src === s.image!.src)) images.push(s.image);
      if (s.embed && !embeds.some((e) => e.src === s.embed!.src)) embeds.push(s.embed);
      if (s.model && !models.some((m) => m.src === s.model!.src)) models.push(s.model);
      // Newest wins when a step sets more than one.
      if (s.model) current = { kind: 'model', value: s.model };
      else if (s.embed) current = { kind: 'embed', value: s.embed };
      else if (s.image) current = { kind: 'image', value: s.image };
      perStep.push(current);
    }
    return { images, embeds, models, perStep };
  }, [project]);

  const active = perStep[step] ?? perStep.find(Boolean);

  // Heavy layers load only once their step has been reached.
  const reached = useRef(new Set<string>());
  if (active && active.kind !== 'image') reached.current.add(active.value.src);

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
            scrolling="no"
            className={cn(
              'photo-visual__frame',
              active?.kind === 'embed' && active.value.src === embed.src && 'is-active',
            )}
          />
        ) : null,
      )}

      {models.map((model) =>
        reached.current.has(model.src) ? (
          <ModelLayer
            key={model.src}
            model={model}
            active={active?.kind === 'model' && active.value.src === model.src}
            animated={animated}
          />
        ) : null,
      )}
    </div>
  );
}
