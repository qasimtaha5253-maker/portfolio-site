/**
 * Project config — the single source of truth for every chapter.
 * Add, remove or reorder projects here; no animation code needs to change.
 *
 * Project shape:
 *   id        unique slug (used for the section id / URL anchor)
 *   title     chapter heading
 *   subtitle  optional one-liner under the title
 *   visual    what shows in the pinned visual area. `type` picks the renderer:
 *               'placeholder'  coloured box, one colour per step   (available now)
 *               'image'        photo per step                      (planned)
 *               'sequence'     scroll-scrubbed SolidWorks frames   (planned)
 *               'model'        Three.js .glb exploded view         (planned)
 *   steps     ordered list of text steps; any number (usually 3+).
 *               label  short step name ("Introduction", "How it works", ...)
 *               body   paragraph text
 *
 * Planned fields for later sessions (sketch, not yet used):
 *   visual: { type: 'image', images: [{ src: '/projects/x/1.webp', alt: '...' }] }
 *   visual: { type: 'sequence', path: '/projects/x/frames/', frameCount: 120, ext: 'webp' }
 *   visual: { type: 'model', src: '/projects/x/model.glb' }
 */
export const projects = [
  {
    id: 'project-one',
    title: 'Project One',
    subtitle: 'Placeholder chapter',
    visual: {
      type: 'placeholder',
      colors: ['#e4572e', '#f3a712', '#29335c'],
    },
    steps: [
      { label: 'Introduction', body: 'What the project is and why it existed. Placeholder text.' },
      { label: 'How it works', body: 'The mechanism, design decisions and analysis. Placeholder text.' },
      { label: 'What it achieved', body: 'Results, numbers and lessons learned. Placeholder text.' },
    ],
  },
  {
    id: 'project-two',
    title: 'Project Two',
    subtitle: 'Placeholder chapter',
    visual: {
      type: 'placeholder',
      colors: ['#2a9d8f', '#8ab17d', '#264653'],
    },
    steps: [
      { label: 'Introduction', body: 'What the project is and why it existed. Placeholder text.' },
      { label: 'How it works', body: 'The mechanism, design decisions and analysis. Placeholder text.' },
      { label: 'What it achieved', body: 'Results, numbers and lessons learned. Placeholder text.' },
    ],
  },
];
