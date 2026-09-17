import type { Step } from '@/data/types';

/** A step's body, stats and bullets. Shared by chapters and grid cards. */
export function StepContent({ step }: { step: Step }) {
  return (
    <>
      {step.body && <p className="step__body">{step.body}</p>}

      {step.stats && step.stats.length > 0 && (
        <dl className="stats">
          {step.stats.map((stat) => (
            <div className="stats__item" key={stat.label}>
              <dt className="stats__label">{stat.label}</dt>
              <dd className="stats__value">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {step.bullets && step.bullets.length > 0 && (
        <ul className="step__bullets">
          {step.bullets.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </>
  );
}
