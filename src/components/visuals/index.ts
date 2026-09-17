import type { ComponentType } from 'react';
import type { Visual } from '@/data/types';
import type { VisualProps } from './types';
import { PhotosVisual } from './PhotosVisual';
import { PlaceholderVisual } from './PlaceholderVisual';

// visual.type -> component. Future: sequence, model.
const visuals: Record<Visual['type'], ComponentType<VisualProps>> = {
  photos: PhotosVisual,
  placeholder: PlaceholderVisual,
};

export function getVisual(type: Visual['type'] | undefined) {
  return (type && visuals[type]) || PlaceholderVisual;
}

export type { VisualProps };
