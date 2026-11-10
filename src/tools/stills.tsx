/**
 * Dev-only tool: renders every tile-cover model once, at the angle and box
 * shape the cover uses, and saves each frame as a WebP still
 * (public/models/stills/, via the dev server's `/__stills` route in
 * vite.config.ts). Open http://localhost:5173/tools/stills.html in a visible
 * browser window while `npm run dev` is running; the title turns to DONE.
 *
 * Re-run it after changing a cover model, its config (margin, brightness,
 * rotation, explode...), ModelLayer's camera/lighting, or the tile shape in
 * site.css — the live viewer fades in over these stills, so they must match.
 */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { projects } from '@/data/projects';
import { coverModelConfig, coverModels, STILL_LAYOUTS, stillBoxSize, stillSrc } from '@/lib/coverModels';
import { ModelLayer } from '@/components/visuals/ModelLayer';
import type { StepModel } from '@/data/types';

// Captured at twice the CSS size, for 2x phone screens.
const SCALE = 2;

interface Job {
  name: string;
  model: StepModel;
  width: number;
  height: number;
}

const jobs: Job[] = projects.flatMap((project) => {
  const models = coverModels(project);
  return models.flatMap((model) =>
    STILL_LAYOUTS.map((layout) => {
      const { width, height } = stillBoxSize(layout, models.length);
      return {
        name: stillSrc(model, layout, models.length).replace(/^.*\//, '').replace(/\.webp$/, ''),
        model: coverModelConfig(model, models.length),
        width: width * SCALE,
        height: height * SCALE,
      };
    }),
  );
});

function Runner() {
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const job = jobs[index];

  useEffect(() => {
    if (!job) document.title = 'DONE';
  }, [job]);

  const next = (line: string) => {
    setLog((l) => [...l, line]);
    setIndex((i) => i + 1);
  };

  const capture = () => {
    // Two frames, so the browser has definitely presented the drawn frame.
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        const canvas = hostRef.current?.querySelector('canvas');
        if (!canvas) return next(`${job.name}: no canvas`);
        const data = canvas.toDataURL('image/png');
        const res = await fetch('/__stills', { method: 'POST', body: JSON.stringify({ name: job.name, data }) });
        next(`${job.name}: ${res.status} ${await res.text()}`);
      }),
    );
  };

  return (
    <div style={{ padding: 16, color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      <p>
        {job ? `Rendering ${index + 1}/${jobs.length}: ${job.name}` : `Done: ${jobs.length} stills written to public/models/stills/`}
      </p>
      {job && (
        <div ref={hostRef} key={job.name} style={{ width: job.width, height: job.height, background: 'var(--surface)' }}>
          <ModelLayer
            model={job.model}
            active
            animated={false} // one frame at the rest angle: no spin, no part animation
            interactive={false}
            snapshot
            onReady={capture}
            onError={() => next(`${job.name}: FAILED to load`)}
          />
        </div>
      )}
      <pre id="log">{log.join('\n')}</pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Runner />
  </StrictMode>,
);
