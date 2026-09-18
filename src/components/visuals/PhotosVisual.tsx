import { useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from '@/components/Photo';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import type { ProjectImage, SplitItem, StepEmbed, StepModel } from '@/data/types';
import { ModelLayer } from './ModelLayer';
import type { VisualProps } from './types';

const SIZES = '(min-width: 1100px) 55vw, (min-width: 768px) and (orientation: landscape) 55vw, 100vw';
const SPLIT_SIZES = '(min-width: 1100px) 28vw, (min-width: 768px) and (orientation: landscape) 28vw, 50vw';
const base = import.meta.env.BASE_URL;

type Layer =
  | { kind: 'image'; key: string; image: ProjectImage }
  | { kind: 'embed'; key: string; embed: StepEmbed }
  | { kind: 'model'; key: string; model: StepModel }
  | { kind: 'split'; key: string; items: SplitItem[] };

/**
 * Shows what each step calls for — a photo, an HTML animation, a 3D model, or
 * a model and photo side by side — crossfading between them. A step that sets
 * none keeps the previous one.
 */
export function PhotosVisual({ project, step }: VisualProps) {
  const animated = useMotionAllowed();

  const { layers, perStep } = useMemo(() => {
    const layers: Layer[] = [];
    const perStep: (Layer | undefined)[] = [];
    const add = (layer: Layer) => {
      const existing = layers.find((l) => l.key === layer.key);
      if (existing) return existing;
      layers.push(layer);
      return layer;
    };

    let current: Layer | undefined;
    for (const s of project.steps) {
      // Newest wins when a step sets more than one.
      if (s.split?.length) {
        const key = 'split:' + s.split.map((i) => i.image?.src ?? i.model?.src).join('|');
        current = add({ kind: 'split', key, items: s.split });
      } else if (s.model) {
        current = add({ kind: 'model', key: s.model.src, model: s.model });
      } else if (s.embed) {
        current = add({ kind: 'embed', key: s.embed.src, embed: s.embed });
      } else if (s.image) {
        current = add({ kind: 'image', key: s.image.src, image: s.image });
      }
      perStep.push(current);
    }
    return { layers, perStep };
  }, [project]);

  const active = perStep[step] ?? perStep.find(Boolean);

  // Heavy layers (animations, 3D) load only once their step has been reached.
  const reached = useRef(new Set<string>());
  if (active && active.kind !== 'image') reached.current.add(active.key);

  return (
    <div className="photo-visual">
      {layers.map((layer) => {
        const isActive = layer.key === active?.key;

        if (layer.kind === 'image') {
          return (
            <Photo
              key={layer.key}
              projectId={project.id}
              image={layer.image}
              sizes={SIZES}
              className={cn('photo-visual__img', isActive && 'is-active')}
            />
          );
        }

        if (!reached.current.has(layer.key)) return null;

        if (layer.kind === 'embed') {
          return (
            <iframe
              key={layer.key}
              src={`${base}${layer.embed.src}`}
              title={layer.embed.title}
              scrolling="no"
              className={cn('photo-visual__frame', isActive && 'is-active')}
            />
          );
        }

        if (layer.kind === 'model') {
          return (
            <ModelLayer key={layer.key} model={layer.model} active={isActive} animated={animated} />
          );
        }

        // Several visuals in one row, e.g. a simulation beside the part it ran on.
        return (
          <div
            key={layer.key}
            className={cn('photo-visual__split', isActive && 'is-active')}
            style={{ gridTemplateColumns: `repeat(${layer.items.length}, minmax(0, 1fr))` }}
          >
            {layer.items.map((item, i) =>
              item.model ? (
                <ModelLayer key={item.model.src} model={item.model} active={isActive} animated={animated} />
              ) : item.image ? (
                <Photo
                  key={item.image.src}
                  projectId={project.id}
                  image={item.image}
                  sizes={SPLIT_SIZES}
                  className="photo-visual__split-img"
                />
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
