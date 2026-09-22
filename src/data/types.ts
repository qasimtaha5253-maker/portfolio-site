export interface ProjectImage {
  /** Photo name: file name in content/photos/<project id>/ without extension. */
  src: string;
  /** Description for screen readers. */
  alt: string;
}

/**
 * A standalone HTML animation shown inside an expanded tile. The file keeps its
 * own markup, CSS and JS: it loads in a frame, so it can't clash with the site.
 */
export interface StepEmbed {
  /** Path under public/, e.g. 'animations/cooling-unit.html'. */
  src: string;
  /** Described for screen readers, e.g. 'Animated airflow through the cooling unit'. */
  title: string;
}

/**
 * A built-in animation for a model, run by src/components/visuals/modelAnimations.ts.
 *   'ptu-gear-cutting'  the PTU gear-cutting fixture: cutter, sliding and turning gear group
 *   'oiling-sensor'     the speed-sensor oiling assembly: sensor lowered 1.25 in and raised
 *   'conveyor-shaft'    the conveyor cart's drive shaft, turned 90° and back
 */
export type ModelAnimationName = 'ptu-gear-cutting' | 'oiling-sensor' | 'conveyor-shaft';

/** A real-time 3D model (.glb) the visitor can rotate. */
export interface StepModel {
  /** Path under public/, e.g. 'models/cooling-unit.glb'. */
  src: string;
  /** Described for screen readers, e.g. '3D model of the cooling unit assembly'. */
  title: string;
  /**
   * Extra room around the model, as a multiplier on the camera distance (default 1;
   * 1.2 pulls the camera back 20%). The framing fits the model's height and swing
   * radius, but a wide, low model seen from above can still have its near edge
   * cropped at some angles as it spins — raise this for those.
   */
  margin?: number;
  /**
   * How bright this model is lit, as a multiplier (default 1; 0.8 is 20% dimmer).
   * The lighting is shared by every model, so use this for one whose pale parts
   * wash out to white.
   */
  brightness?: number;
  /**
   * Plays a built-in looping animation of the model's moving parts (it only
   * runs while the model is on screen, and not under reduced motion).
   */
  animation?: ModelAnimationName;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Step {
  /** Step heading, e.g. "How it works". */
  label: string;
  /** Paragraph text. */
  body?: string;
  /** List of points. */
  bullets?: string[];
  /** Highlight numbers shown as boxes. */
  stats?: Stat[];
  /** Photo for this step. Also the fallback under reduced motion. */
  image?: ProjectImage;
  /** HTML animation for this step (needs motion allowed; reduced motion shows `image`). */
  embed?: StepEmbed;
  /** Rotatable 3D model for this step (needs motion allowed; reduced motion shows `image`). */
  model?: StepModel;
  /**
   * Two or more visuals shown side by side in one row, e.g. a simulation
   * result beside the part it was run on. Each entry is a photo or a model.
   * Priority when a step sets several: `split` > `stack` > `model` > `embed` > `image`.
   */
  split?: SplitItem[];
  /**
   * Two or more visuals shown one under another, each at full size (the same
   * size a single `model` or `image` gets) — for when a row would make them
   * too small. Each entry is a photo or a model. Also the tile cover, where
   * the models sit side by side. Priority: `split` > `stack` > `model` >
   * `embed` > `image`.
   */
  stack?: SplitItem[];
}

/** One cell of a side-by-side step: a photo or a 3D model. */
export interface SplitItem {
  image?: ProjectImage;
  model?: StepModel;
}

export interface Project {
  /** Unique slug; also the folder name for photos and the page anchor. */
  id: string;
  title: string;
  /** Where it was done, e.g. "Linamar · Co-op". */
  context?: string;
  /** Not used by the grid at the moment: every tile is the same (large) size. */
  featured: boolean;
  /** One or two sentences, shown on the tile. */
  summary?: string;
  /** Photo name used as the tile cover (defaults to the first step photo). */
  cover?: string;
  /** Shown as sections, in order, when the tile is expanded. */
  steps: Step[];
  /** Extra photos. Only used as cover candidates; the expanded tile does not show them. */
  gallery?: ProjectImage[];
}
