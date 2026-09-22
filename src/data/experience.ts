/**
 * Work experience shown in the About section — the only file to edit to
 * add, remove or reorder roles; no component code needs to change.
 *
 * Newest role first. In a highlight's text, wrap the key metric in
 * **double asterisks** (plain-text bold, like Markdown) to have it rendered
 * in the site's accent colour — leave a highlight with no clear number
 * unwrapped rather than forcing one in.
 */
export interface ExperienceRole {
  role: string;
  company: string;
  location: string;
  /** e.g. "May 2026 – Present". */
  dates: string;
  /** One-line summary of the role. */
  summary: string;
  /** Exactly 3 short highlights, newest/most relevant first. */
  highlights: string[];
}

export const experience: ExperienceRole[] = [
  {
    role: 'Manufacturing Engineer Co-op',
    company: 'Roadtrek Inc.',
    location: 'Cambridge, ON',
    dates: 'May 2026 – Present',
    summary: 'Improving how parts, tools, and materials move through production.',
    highlights: [
      'Stations were losing hours waiting on missing parts, so I rebuilt the kitting checklists to identify every part up front. Station time dropped from **5 hours to 2**.',
      'I designed a drill jig that holds a propane regulator bracket and locates its holes, cutting prep time by **67%** and removing manual layout entirely.',
      'When our sealing tape started failing in the heat, I benchmarked replacements for adhesion, temperature resistance, and waterproofing. The new tape is now going into production.',
    ],
  },
  {
    role: 'Manufacturing Engineer Co-op',
    company: 'Camcor (Linamar Corporation)',
    location: 'Guelph, ON',
    dates: 'January 2025 – August 2025',
    summary: 'Designing the tooling behind driveline production.',
    highlights: [
      'I took **18** production tools from concept to release, from gear cutting fixtures to robot pallets and bearing pullers, all detailed to ASME Y14.5.',
      'I cut the time operators spent handling parts by **70%** with a detachable conveyor cart.',
      'I helped launch a new PTU production line by designing the variable and go/no-go gauges used to check its parts.',
    ],
  },
];
