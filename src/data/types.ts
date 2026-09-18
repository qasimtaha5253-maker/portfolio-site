export interface ProjectImage {
  /** Photo name: file name in content/photos/<project id>/ without extension. */
  src: string;
  /** Description for screen readers. */
  alt: string;
}

/**
 * A standalone HTML animation shown in the pinned visual. The file keeps its own
 * markup, CSS and JS: it loads in a frame, so it can't clash with the site.
 */
export interface StepEmbed {
  /** Path under public/, e.g. 'animations/cooling-unit.html'. */
  src: string;
  /** Described for screen readers, e.g. 'Animated airflow through the cooling unit'. */
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
  /** Photo for this step. A step without one keeps showing the previous photo. */
  image?: ProjectImage;
  /**
   * HTML animation for this step; the visual cross-fades from the photo to it.
   * Like `image`, it carries forward until a later step sets a different one.
   */
  embed?: StepEmbed;
}

/**
 * Pinned visual for featured chapters. `type` picks the renderer in
 * src/components/visuals/:
 *   'photos'       shows each step's `image`          (available)
 *   'placeholder'  coloured box per step              (available)
 *   'sequence'     scroll-scrubbed SolidWorks frames  (planned)
 *   'model'        Three.js .glb exploded view        (planned)
 */
export type Visual = { type: 'photos' } | { type: 'placeholder'; colors?: string[] };

export interface Project {
  /** Unique slug; also the folder name for photos and the page anchor. */
  id: string;
  title: string;
  /** Where it was done, e.g. "Linamar · Co-op". */
  context?: string;
  /** true: pinned scrollytelling chapter. false: card in "More projects". */
  featured: boolean;
  /** One or two sentences, shown on grid cards. */
  summary?: string;
  /** Photo name used as the card thumbnail (defaults to the first step photo). */
  cover?: string;
  /** Required for featured projects. */
  visual?: Visual;
  /** Chapters step through these; cards show them as sections. */
  steps: Step[];
  /** Extra photos shown when a grid card is expanded. */
  gallery?: ProjectImage[];
}
