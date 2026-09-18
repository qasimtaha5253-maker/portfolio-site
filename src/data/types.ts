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

/** A real-time 3D model (.glb) the visitor can rotate. */
export interface StepModel {
  /** Path under public/, e.g. 'models/cooling-unit.glb'. */
  src: string;
  /** Described for screen readers, e.g. '3D model of the cooling unit assembly'. */
  title: string;
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
   * Priority when a step sets several: `split` > `model` > `embed` > `image`.
   */
  split?: SplitItem[];
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
  /** true: large tile (two grid rows). false: standard tile. */
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
