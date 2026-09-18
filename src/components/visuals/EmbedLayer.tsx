import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { StepEmbed } from '@/data/types';

const base = import.meta.env.BASE_URL;

interface EmbedLayerProps {
  embed: StepEmbed;
  /** Visible step: when false the animation is paused rather than left running. */
  active: boolean;
}

/**
 * A standalone HTML animation in a frame. Animations cost frames even while
 * faded out, so this pauses them unless they're the visual on screen — the
 * file exposes `__setPaused` for that.
 */
export function EmbedLayer({ embed, active }: EmbedLayerProps) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const apply = () => {
      const win = frame.contentWindow as (Window & { __setPaused?: (paused: boolean) => void }) | null;
      win?.__setPaused?.(!active);
    };

    apply(); // in case it has already loaded
    frame.addEventListener('load', apply);
    return () => frame.removeEventListener('load', apply);
  }, [active]);

  return (
    <iframe
      ref={ref}
      src={`${base}${embed.src}`}
      title={embed.title}
      scrolling="no"
      className={cn('photo-visual__frame', active && 'is-active')}
    />
  );
}
