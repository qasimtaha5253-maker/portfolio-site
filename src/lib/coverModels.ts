import type { Project, StepModel } from '@/data/types';

/** A project with a model on one of its steps shows it as its tile cover
 *  instead of a plain photo. A `split` row or `stack` on any step supplies
 *  every model in it, side by side. Otherwise, every step's own single
 *  `model` is used, deduped by src (a project may repeat the same model on
 *  more than one step — the cover only needs it once) — so a project with
 *  several different model-bearing steps (e.g. Assembly Line Fixtures &
 *  Tooling) gets all of them side by side on its cover, unless a model opts
 *  out with `excludeFromCover` (e.g. a close-up of one small subsystem that
 *  isn't meant to stand in for the whole project). */
export function coverModels(project: Project): StepModel[] {
  for (const step of project.steps) {
    for (const items of [step.split, step.stack]) {
      const models = items?.flatMap((item) => (item.model && !item.model.excludeFromCover ? [item.model] : [])) ?? [];
      if (models.length) return models;
    }
  }
  const seen = new Set<string>();
  const models: StepModel[] = [];
  for (const step of project.steps) {
    if (step.model && !step.model.excludeFromCover && !seen.has(step.model.src)) {
      seen.add(step.model.src);
      models.push(step.model);
    }
  }
  return models;
}

/** The cover shows each model as the live viewer would frame it there: in a
 *  row of several, the `margin` set for the (wide) step view is dropped, since
 *  the row's tall, narrow canvases don't crop the way a step's wide box does. */
export function coverModelConfig(model: StepModel, rowLength: number): StepModel {
  return rowLength > 1 ? { ...model, margin: undefined } : model;
}

/** Still-image layouts a cover model is rendered in (see tools/stills.html):
 *  the collapsed tile is wide on a desktop/tablet and nearly square on a phone. */
export const STILL_LAYOUTS = ['wide', 'narrow'] as const;
export type StillLayout = (typeof STILL_LAYOUTS)[number];

/** CSS pixel size of one cover model's box in each layout, for a tile shown
 *  alone or as one of `rowLength` models side by side (the row's canvases
 *  overlap their neighbours by 6% a side, hence the 1.12). */
export function stillBoxSize(layout: StillLayout, rowLength: number): { width: number; height: number } {
  const tile = layout === 'wide' ? { width: 540, height: 316 } : { width: 343, height: 364 };
  const width = rowLength > 1 ? (tile.width / rowLength) * 1.12 : tile.width;
  return { width: Math.round(width), height: tile.height };
}

/** Path (under public/) of a cover model's still, written by the dev tool at tools/stills.html. */
export function stillSrc(model: StepModel, layout: StillLayout, rowLength: number): string {
  const name = model.src.replace(/^.*\//, '').replace(/\.glb$/, '');
  return `models/stills/${name}${rowLength > 1 ? '-row' : ''}-${layout}.webp`;
}
