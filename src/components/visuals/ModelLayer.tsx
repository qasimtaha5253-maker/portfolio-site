import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StepModel } from '@/data/types';

const base = import.meta.env.BASE_URL;

interface ModelLayerProps {
  model: StepModel;
  /** Visible step: when false the viewer keeps its last frame and stops drawing. */
  active: boolean;
  /** Reduced motion: no self-rotation. */
  animated: boolean;
}

/**
 * Real-time .glb viewer. Three.js and the loaders are imported on demand, so
 * the 3D code only reaches visitors who scroll to this step.
 *
 * The model turns slowly by itself and can be dragged with a mouse. Touch
 * dragging is deliberately off, so scrolling the page always works on a phone.
 */
export function ModelLayer({ model, active, animated }: ModelLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Kept in a ref so the draw loop can read it without re-running the effect.
  const state = useRef({ active, animated });
  state.current = { active, animated };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { MeshoptDecoder }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        // Models are meshopt-compressed by `npm run model`.
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.append(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

      scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x0b0d14, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(4, 6, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffc48a, 0.8);
      fill.position.set(-5, 1, -3);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      // Mouse drag rotates; touch gestures are left to the page so it can scroll.
      controls.touches = { ONE: null, TWO: null } as unknown as typeof controls.touches;
      controls.autoRotateSpeed = 1.2;

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      let onScreen = true;
      let loaded = false;
      const draw = () => {
        if (!onScreen) {
          frame = 0; // stop drawing while scrolled away
          return;
        }
        controls.autoRotate = state.current.animated && state.current.active;
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(draw);
      };

      const visibility = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && loaded && !frame) draw();
      });
      visibility.observe(host);

      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
        `${base}${model.src}`,
        (gltf) => {
          if (disposed) return;
          // Centre the model and pull the camera back far enough to frame it.
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const centre = box.getCenter(new THREE.Vector3());
          gltf.scene.position.sub(centre);
          scene.add(gltf.scene);

          const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
          const distance = radius / Math.sin((camera.fov * Math.PI) / 360);
          camera.position.set(distance * 0.75, distance * 0.45, distance * 0.95);
          camera.near = distance / 100;
          camera.far = distance * 10;
          camera.updateProjectionMatrix();
          controls.target.set(0, 0, 0);
          controls.update();

          resize();
          setStatus('ready');
          loaded = true;
          draw();
        },
        undefined,
        () => !disposed && setStatus('error'),
      );

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        visibility.disconnect();
        controls.dispose();
        scene.traverse((obj) => {
          const mesh = obj as { geometry?: { dispose(): void }; material?: unknown };
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => (m as { dispose(): void }).dispose());
          else (material as { dispose?(): void } | undefined)?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [model.src]);

  return (
    <div className={cn('model-layer', active && 'is-active')} aria-label={model.title} role="img">
      <div ref={hostRef} className="model-layer__canvas" />
      {status !== 'ready' && (
        <p className="model-layer__status">{status === 'loading' ? 'Loading 3D model…' : 'Model unavailable'}</p>
      )}
    </div>
  );
}
