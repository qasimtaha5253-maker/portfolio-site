import * as placeholder from './placeholder.js';
import * as photos from './photos.js';

// Map of visual.type -> renderer module. Each module exports
// create(project) => { el, setProgress(stepIndex, progress) }.
// Future: sequence, model.
const renderers = {
  placeholder,
  photos,
};

export function createVisual(project) {
  const type = project.visual?.type;
  const renderer = renderers[type];
  if (!renderer) {
    console.warn(`Unknown visual type "${type}" for "${project.id}", using placeholder.`);
    return placeholder.create(project);
  }
  return renderer.create(project);
}
