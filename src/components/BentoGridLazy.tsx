import { projects } from '@/data/projects';
import { BentoGrid, type BentoGridProps } from './BentoGrid';

/**
 * Entry point of the grid's own code chunk (loaded with React.lazy from
 * App.tsx). The grid sits below the full-screen intro, so nothing in it —
 * Framer Motion, the project data, the step content components — is needed
 * for the first paint; keeping it out of the main bundle gets the intro on
 * screen sooner on a slow connection.
 */
export default function BentoGridWithProjects(props: Omit<BentoGridProps, 'projects'>) {
  return <BentoGrid projects={projects} {...props} />;
}
