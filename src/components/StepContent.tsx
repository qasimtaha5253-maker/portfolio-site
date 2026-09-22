import type { ReactNode } from 'react';
import type { Step } from '@/data/types';

// Matches *single-asterisk* emphasis in step body/bullet text (see data/projects.ts).
const BOLD = /\*(.+?)\*/g;

/** Splits text on *single-asterisk* markers and renders the marked part in
 *  <strong> (the site's existing bold styling — no extra colour/class). */
function renderBold(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  BOLD.lastIndex = 0;
  while ((match = BOLD.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<strong key={key++}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** A step's body, stats and bullets, shown in an expanded tile. */
export function StepContent({ step }: { step: Step }) {
  return (
    <>
      {step.body && <p className="step__body">{renderBold(step.body)}</p>}

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
            <li key={text}>{renderBold(text)}</li>
          ))}
        </ul>
      )}
    </>
  );
}
