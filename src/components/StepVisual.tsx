import { useEffect, useRef, useState } from 'react';
import { Photo } from './Photo';
import { EmbedLayer } from './visuals/EmbedLayer';
import { ModelLayer } from './visuals/ModelLayer';
import type { Step } from '@/data/types';

const SIZES = '(min-width: 768px) 40rem, 100vw';
const SPLIT_SIZES = '(min-width: 768px) 20rem, 50vw';

/** Runs the model/animation only while its wrapper is actually on screen. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, onScreen] as const;
}

interface StepVisualProps {
  projectId: string;
  step: Step;
  /** Reduced motion: always show the plain photo instead of a model/animation. */
  animated: boolean;
  /** The tile's own cover photo; a step whose only visual repeats it renders nothing. */
  coverSrc?: string;
}

/**
 * A step's own visual, shown inline below its text (the bento tile shows every
 * step at once, so unlike the pinned chapter layout there's no shared cell to
 * crossfade in). Split rows, models and animations only appear with motion
 * allowed; reduced motion always falls back to the step's plain photo.
 */
export function StepVisual({ projectId, step, animated, coverSrc }: StepVisualProps) {
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();

  if (!animated) {
    if (!step.image || step.image.src === coverSrc) return null;
    return <Photo projectId={projectId} image={step.image} sizes={SIZES} className="step-visual__img" />;
  }

  if (step.split?.length) {
    return (
      <div
        className="step-visual step-visual--split"
        style={{ gridTemplateColumns: `repeat(${step.split.length}, minmax(0, 1fr))` }}
        ref={ref}
      >
        {step.split.map((item, i) =>
          item.model ? (
            <ModelLayer key={item.model.src} model={item.model} active={onScreen} animated={animated} />
          ) : item.image ? (
            <Photo
              key={item.image.src}
              projectId={projectId}
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
  }

  if (step.model) {
    return (
      <div className="step-visual" ref={ref}>
        <ModelLayer model={step.model} active={onScreen} animated={animated} />
      </div>
    );
  }

  if (step.embed) {
    return (
      <div className="step-visual" ref={ref}>
        <EmbedLayer embed={step.embed} active={onScreen} />
      </div>
    );
  }

  if (step.image && step.image.src !== coverSrc) {
    return <Photo projectId={projectId} image={step.image} sizes={SIZES} className="step-visual__img" />;
  }

  return null;
}
