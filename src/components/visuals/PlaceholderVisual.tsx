import { useEffect, useRef } from 'react';
import type { VisualProps } from './types';

/**
 * Coloured box that changes colour per step and rotates with scroll progress,
 * so the scrub is visible. Useful while a project's real visual is in progress.
 */
export function PlaceholderVisual({ project, step, progress }: VisualProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const colors =
    project.visual?.type === 'placeholder' && project.visual.colors?.length ? project.visual.colors : ['#888'];

  // Progress changes every frame, so write it straight to the DOM.
  useEffect(() => {
    const apply = (p: number) => boxRef.current?.style.setProperty('--turn', `${p * 90}deg`);
    apply(progress.get());
    return progress.subscribe(apply);
  }, [progress]);

  return (
    <div className="placeholder-visual">
      <div ref={boxRef} className="placeholder-visual__box" style={{ backgroundColor: colors[step % colors.length] }}>
        <span className="placeholder-visual__label">Step {step + 1}</span>
      </div>
    </div>
  );
}
