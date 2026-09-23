import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { MiniCard, Step } from '@/data/types';
import { useMotionAllowed } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger, useGSAP);

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

/** A stat's leading number to animate, split from the surrounding text (a
 *  currency sign, unit, or "%") that stays put — e.g. "1,640 W" splits into
 *  prefix "", target 1640 (formatted with a comma), suffix " W". Returns
 *  null for a value with no leading/embedded number to count up. */
function parseStat(value: string) {
  const match = /^([^\d]*)([\d,]*\.?\d+)(.*)$/.exec(value);
  if (!match) return null;
  const [, prefix, numeric, suffix] = match;
  const decimals = numeric.includes('.') ? numeric.split('.')[1].length : 0;
  const target = parseFloat(numeric.replace(/,/g, ''));
  if (Number.isNaN(target)) return null;
  return { prefix, suffix, target, decimals, hasComma: numeric.includes(',') };
}

/** A stat's value, counting up from 0 when it scrolls into view (reduced
 *  motion, or a value with nothing to count, just shows the final text). */
function StatValue({ value, ready }: { value: string; ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const animated = useMotionAllowed();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      // Wait for the expand animation to settle (`ready`) before measuring
      // scroll position — mid-transition, the detail panel's height is still
      // animating, so a trigger created against it would anchor to the wrong
      // spot (same reason StepVisual's heavy visuals wait for `ready`).
      const parsed = animated && ready ? parseStat(value) : null;
      if (!parsed) {
        el.textContent = value;
        return;
      }
      const { prefix, suffix, target, decimals, hasComma } = parsed;
      const format = (n: number) => {
        const fixed = n.toFixed(decimals);
        const body = hasComma
          ? Number(fixed).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
          : fixed;
        return `${prefix}${body}${suffix}`;
      };
      const state = { n: 0 };
      el.textContent = format(0);
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () =>
          gsap.to(state, {
            n: target,
            duration: 1.3,
            ease: 'power2.out',
            onUpdate: () => (el.textContent = format(state.n)),
          }),
      });
      return () => trigger.kill();
    },
    { dependencies: [value, animated, ready], revertOnUpdate: true },
  );

  return <dd className="stats__value" ref={ref} />;
}

/** `step.bullets`, hidden behind a "View Details" button (`step.bulletsCollapsed`)
 *  instead of always showing — for a long list that would otherwise dominate
 *  the step before the visitor even asks for it. */
function CollapsibleBullets({ bullets }: { bullets: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="step__details-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? 'Hide Details' : 'View Details'}
      </Button>
      {open && (
        <ul className="step__bullets">
          {bullets.map((text) => (
            <li key={text}>{renderBold(text)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The "grows from 0 to fit content" accordion panel shared by MiniCardItem
 *  and SummaryCard below — a 0fr -> 1fr grid track animates height without
 *  JS measuring the content. Stays mounted (not conditionally rendered)
 *  even while closed, since that's what the transition needs; aria-hidden
 *  keeps it out of the accessibility tree until open. */
function ExpandPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="mini-card__panel" aria-hidden={!open}>
      <div className="mini-card__panel-inner">{children}</div>
    </div>
  );
}

/** One `step.cards` entry: a stat-box-styled card collapsed to just its
 *  title, expanding in place to reveal its own bullet list when tapped. */
function MiniCardItem({ card }: { card: MiniCard }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('mini-card', open && 'mini-card--open')}>
      <button
        type="button"
        className="mini-card__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mini-card__title">{card.title}</span>
        <ChevronDown className="mini-card__chevron" aria-hidden="true" />
      </button>
      {card.preview && card.preview.length > 0 && (
        <dl className="mini-card__preview">
          {card.preview.map((stat) => (
            <div className="mini-card__preview-item" key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ExpandPanel open={open}>
        <ul className="mini-card__bullets">
          {card.bullets.map((text) => (
            <li key={text}>{renderBold(text)}</li>
          ))}
        </ul>
      </ExpandPanel>
    </div>
  );
}

/** `step.bullets` behind `step.bulletsSummary` (also needs `bulletsCollapsed`):
 *  a single card whose header is a condensed version of the points, adding
 *  the full ones below when tapped — instead of CollapsibleBullets' plain
 *  button, which shows nothing at all until clicked. */
function SummaryCard({ summary, bullets }: { summary: string[]; bullets: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('mini-card mini-card--summary', open && 'mini-card--open')}>
      <button
        type="button"
        className="mini-card__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ul className="mini-card__summary">
          {summary.map((text) => (
            <li key={text}>{renderBold(text)}</li>
          ))}
        </ul>
        <ChevronDown className="mini-card__chevron" aria-hidden="true" />
      </button>
      <ExpandPanel open={open}>
        <ul className="mini-card__bullets">
          {bullets.map((text) => (
            <li key={text}>{renderBold(text)}</li>
          ))}
        </ul>
      </ExpandPanel>
    </div>
  );
}

/** A step's body, stats, bullets and mini cards, shown in an expanded tile. */
export function StepContent({ step, ready }: { step: Step; ready: boolean }) {
  return (
    <>
      {step.body && <p className="step__body">{renderBold(step.body)}</p>}

      {step.stats && step.stats.length > 0 && (
        <dl className="stats">
          {step.stats.map((stat) => (
            <div className="stats__item" key={stat.label}>
              <dt className="stats__label">{stat.label}</dt>
              <StatValue value={stat.value} ready={ready} />
            </div>
          ))}
        </dl>
      )}

      {step.bullets && step.bullets.length > 0 && (
        step.bulletsCollapsed ? (
          step.bulletsSummary && step.bulletsSummary.length > 0 ? (
            <SummaryCard summary={step.bulletsSummary} bullets={step.bullets} />
          ) : (
            <CollapsibleBullets bullets={step.bullets} />
          )
        ) : (
          <ul className="step__bullets">
            {step.bullets.map((text) => (
              <li key={text}>{renderBold(text)}</li>
            ))}
          </ul>
        )
      )}

      {step.cards && step.cards.length > 0 && (
        <div className="mini-cards">
          {step.cards.map((card) => (
            <MiniCardItem card={card} key={card.title} />
          ))}
        </div>
      )}
    </>
  );
}
