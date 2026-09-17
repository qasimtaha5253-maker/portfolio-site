import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import { createProgressStore } from '@/lib/progress';
import type { Project } from '@/data/types';
import { Photo } from './Photo';
import { StepContent } from './StepContent';
import { getVisual } from './visuals';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// How much scroll distance each step gets, in viewport heights.
const SCROLL_PER_STEP = 1;

interface ChapterProps {
  project: Project;
  index: number;
  /** Pin and step through the content (false when reduced motion is preferred). */
  animated: boolean;
}

/**
 * A featured project. When animated, the chapter pins and steps through its
 * text one step at a time while the visual updates; otherwise every step is
 * shown as a normal stacked list with its photo inline.
 */
export function Chapter({ project, index, animated }: ChapterProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const progress = useMemo(() => createProgressStore(), []);
  const count = project.steps.length;
  const Visual = getVisual(project.visual?.type);
  const titleId = `${project.id}-title`;

  useGSAP(
    () => {
      if (!animated) return;
      ScrollTrigger.create({
        trigger: sectionRef.current,
        pin: pinRef.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * count * SCROLL_PER_STEP}`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setStep(Math.min(count - 1, Math.floor(self.progress * count)));
          progress.set(self.progress);
        },
      });
    },
    { dependencies: [animated, count], revertOnUpdate: true },
  );

  return (
    <section
      ref={sectionRef}
      id={project.id}
      aria-labelledby={titleId}
      className={cn('chapter', project.steps.some((s) => s.image) && 'has-step-media')}
    >
      <div ref={pinRef} className="chapter__pin">
        <div className="chapter__visual">
          <Visual project={project} step={step} progress={progress} />
        </div>

        <div className="chapter__text">
          <header className="chapter__header">
            <p className="chapter__index">Project {String(index + 1).padStart(2, '0')}</p>
            <h2 className="chapter__title" id={titleId}>
              {project.title}
            </h2>
            {project.context && <p className="chapter__context">{project.context}</p>}
          </header>

          <ol className="chapter__steps">
            {project.steps.map((s, i) => (
              <li
                key={s.label}
                className={cn('step', animated && i === step && 'is-active')}
                aria-hidden={animated ? i !== step : undefined}
              >
                <h3 className="step__label">{s.label}</h3>
                <StepContent step={s} />
                {/* Inline photo, shown only in the static (reduced-motion) layout. */}
                {s.image && (
                  <figure className="step__media">
                    <Photo projectId={project.id} image={s.image} sizes="(min-width: 768px) 40rem, 100vw" />
                  </figure>
                )}
              </li>
            ))}
          </ol>

          <div className="chapter__dots" aria-hidden="true">
            {project.steps.map((s, i) => (
              <span key={s.label} className={cn(i === step && 'is-active')} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
