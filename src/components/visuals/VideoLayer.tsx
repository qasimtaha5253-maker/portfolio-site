import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { StepVideo } from '@/data/types';

const base = import.meta.env.BASE_URL;

interface VideoLayerProps {
  video: StepVideo;
  /** Visible step: when false playback is paused rather than left running. */
  active: boolean;
}

/**
 * A looping, silent video — same treatment as EmbedLayer's HTML animation:
 * playback costs battery/bandwidth even while faded out, so it only runs
 * while this is the visual actually on screen.
 */
export function VideoLayer({ video, active }: VideoLayerProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      // A muted video is allowed to autoplay without a user gesture, but the
      // promise still rejects if the browser changes its mind mid-transition
      // (e.g. the tab backgrounds right as this fires) — nothing to do about
      // that beyond not letting it surface as an unhandled rejection.
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <video
      ref={ref}
      src={`${base}${video.src}`}
      poster={video.poster ? `${base}${video.poster}` : undefined}
      aria-label={video.title}
      muted
      loop
      playsInline
      preload="metadata"
      className={cn('photo-visual__frame', active && 'is-active')}
    />
  );
}
