import * as placeholder from './placeholder.js';

// Map of visual.type -> renderer module. Each module exports
// create(visual) => { el, setProgress(stepIndex, progress) }.
// Future: image, sequence, model.
const renderers = {
  placeholder,
};

export function createVisual(visual) {
  const renderer = renderers[visual?.type];
  if (!renderer) {
    console.warn(`Unknown visual type "${visual?.type}", using placeholder.`);
    return placeholder.create(visual ?? {});
  }
  return renderer.create(visual);
}
