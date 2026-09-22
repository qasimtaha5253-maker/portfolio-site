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
  /** A few short highlights, newest/most relevant first. */
  highlights: string[];
}

export const experience: ExperienceRole[] = [
  {
    role: 'Manufacturing Engineer Co-op',
    company: 'Roadtrek Inc.',
    location: 'Cambridge, ON',
    dates: 'May 2026 – Present',
    summary: 'Revamping the production floor: its processes, tooling, and layout.',
    highlights: [
      'Developing standard operating procedures that bring new operators up to speed fast and hold every build to one standard.',
      'Redesigning the production layout and flow so parts, tools, and materials sit where each station needs them.',
      'Designing jigs that replace manual layout with repeatable accuracy. One drill jig cut prep time by **67%**.',
      'Standardized kitting to eliminate waits on missing parts, cutting one station’s time from **5 hours to 2**.',
    ],
  },
  {
    role: 'Manufacturing Engineer Co-op',
    company: 'Camcor (Linamar Corporation)',
    location: 'Guelph, ON',
    dates: 'January 2025 – August 2025',
    summary: 'Launch team for a new PTU product, setting up the assembly line from cell layout to tooling and gauges.',
    highlights: [
      'Laid out machine cells and the shop floor in AutoCAD to set up the new assembly line.',
      'Designed **18** production tools and fixtures, from gear cutting fixtures to robot pallets and bearing pullers, all detailed to ASME Y14.5.',
      'Cut operator part-handling time by **70%** with a detachable conveyor cart.',
      'Designed variable and go/no-go gauges to quality-check the new parts.',
    ],
  },
];
