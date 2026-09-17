import type { Project } from '@/data/types';
import type { ProgressStore } from '@/lib/progress';

/** Props every chapter visual receives. */
export interface VisualProps {
  project: Project;
  /** Index of the step currently shown. */
  step: number;
  /** Scroll progress through the whole chapter (0–1), for frame-by-frame visuals. */
  progress: ProgressStore;
}
