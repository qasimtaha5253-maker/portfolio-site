import { LoaderCircle } from 'lucide-react';

/**
 * Centred "3D Model Loading..." spinner shown in a step's model box until the model is drawn —
 * both before the viewer is mounted (it waits for the tile's expand to settle) and while it loads.
 * Fills its nearest positioned ancestor. Tile covers don't use it (they show their still image).
 */
export function ModelLoading() {
  return (
    <div className="model-loading" role="status">
      <LoaderCircle className="model-loading__icon" aria-hidden="true" />
      <span className="model-loading__text">3D Model Loading...</span>
    </div>
  );
}
