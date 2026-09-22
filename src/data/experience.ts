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
    summary: 'Helping revamp the production floor, building the processes, tooling, and flow it runs on.',
    highlights: [
      "I'm writing standard operating procedures so new operators can get up to speed quickly and build to the same standard from day one.",
      "I'm reworking the production layout and flow so parts, tools, and materials are where each station needs them.",
      'I design jigs that replace manual layout with repeatable accuracy. One drill jig alone cut prep time by **67%**.',
      'I standardized kitting so stations stop waiting on missing parts, taking one station from **5 hours to 2**.',
    ],
  },
  {
    role: 'Manufacturing Engineer Co-op',
    company: 'Camcor (Linamar Corporation)',
    location: 'Guelph, ON',
    dates: 'January 2025 – August 2025',
    summary: 'Helping launch a new production line — from floor layout to the tools and gauges that run it.',
    highlights: [
      'I helped launch a new production line, laying out machine cells and the shop floor in AutoCAD to set up the assembly line.',
      'I designed **18** tools and fixtures, from gear cutting fixtures to robot pallets and bearing pullers, to set up the line efficiently — all detailed to ASME Y14.5.',
      'I cut the time operators spent handling parts by **70%** with a detachable conveyor cart.',
      'I made the variable and go/no-go gauges used to quality-check the new parts.',
    ],
  },
];
