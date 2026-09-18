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
  /** Self-rotate only while this is true (still gated by `animated`/`active`).
   *  Defaults on, matching the step-visual usage; the bento tile cover turns
   *  this on only while hovered. */
  spin?: boolean;
  /** Drag-to-rotate with a mouse or finger. Off for the bento tile cover, so
   *  a tap there opens the project instead of being read as a rotate-drag. */
  interactive?: boolean;
}

/**
 * Real-time .glb viewer. Three.js and the loaders are imported on demand, so
 * the 3D code only reaches visitors who scroll to this step.
 *
 * The model turns slowly by itself and can be dragged with a mouse or a
 * finger, unless `interactive` is off.
 */
export function ModelLayer({ model, active, animated, spin = true, interactive = true }: ModelLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Kept in a ref so the draw loop can read it without re-running the effect.
  const state = useRef({ active, animated, spin });
  state.current = { active, animated, spin };
  // Restarts the loop when this becomes the visible step again, or when
  // hovering turns spin back on after it stopped drawing while static.
  const resume = useRef<() => void>(() => {});
  useEffect(() => {
    if (active && spin) resume.current();
  }, [active, spin]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        // Models are meshopt-compressed by `npm run model`.
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
        // Metals show reflections, not colour: without an environment to
        // reflect, the aluminium parts of a CAD export render black.
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.append(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';

      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.68;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

      // Just enough reflection for the metal to read as metal — without it the
      // aluminium renders black, with too much it looks like chrome.
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.18;
      pmrem.dispose();

      scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x0b0d14, 1.2));
      const key = new THREE.DirectionalLight(0xffffff, 1.25);
      key.position.set(4, 6, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffc48a, 0.5);
      fill.position.set(-5, 1, -3);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      // Damping smooths user drag input, which the bento tile cover doesn't
      // take (interactive: false there) — off, so its hover-triggered spin
      // starts and stops cleanly instead of decelerating for a few frames.
      controls.enableDamping = interactive;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableRotate = interactive;
      // Drag to rotate with a mouse or a finger. A swipe that starts on the
      // model turns it instead of scrolling, so the page is scrolled from the
      // text below it.
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE };
      controls.autoRotateSpeed = 1.2;

      // Set once the model is loaded: how far it reaches from the point it
      // spins around. Measured from that point, not from the middle of the
      // bounding box, since centring on the model's bulk leaves it lopsided —
      // the towing handle swings out much further than the body.
      let reachXZ = 1;
      let reachY = 1;

      /**
       * Pull the camera back far enough that the model stays inside the panel
       * at every angle it turns through, keeping whichever direction the
       * visitor has turned it to. Recomputed on resize, since a narrow panel
       * needs more distance than a wide one.
       */
      const frameModel = () => {
        const vFov = (camera.fov * Math.PI) / 180;
        const forHeight = reachY / Math.tan(vFov / 2);
        const forWidth = reachXZ / (Math.tan(vFov / 2) * camera.aspect);
        const distance = Math.max(forHeight, forWidth) * 1.12; // breathing room
        const direction = camera.position.clone().normalize();
        if (direction.lengthSq() === 0) direction.set(0.75, 0.45, 0.95).normalize();
        camera.position.copy(direction.multiplyScalar(distance));
        camera.near = distance / 100;
        camera.far = distance * 10;
        camera.updateProjectionMatrix();
        controls.update();
      };

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (loaded) frameModel();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      let onScreen = true;
      let loaded = false;
      const draw = () => {
        // Stop drawing while scrolled away, or while another visual is showing:
        // the last frame stays on the canvas, which is faded out anyway.
        if (!onScreen || !state.current.active) {
          frame = 0;
          return;
        }
        controls.autoRotate = state.current.animated && state.current.active && state.current.spin;
        controls.update();
        renderer.render(scene, camera);
        // While static (not spinning), one rendered frame reflects the
        // current state fully — no need to keep drawing every frame until
        // something (hover) asks it to spin again.
        frame = controls.autoRotate ? requestAnimationFrame(draw) : 0;
      };

      const restart = () => {
        if (onScreen && loaded && !frame && state.current.active) draw();
      };
      resume.current = restart;

      const visibility = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        restart();
      });
      visibility.observe(host);

      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
        `${base}${model.src}`,
        (gltf) => {
          if (disposed) return;
          // Centre the model and pull the camera back far enough to frame it.
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());

          // Centre on the bulk of the model rather than the middle of its
          // bounding box, so a long thin part (the towing handle) doesn't drag
          // the body off to one side. Each mesh counts for its own volume.
          const centre = new THREE.Vector3();
          let weight = 0;
          const partBox = new THREE.Box3();
          const partSize = new THREE.Vector3();
          const partCentre = new THREE.Vector3();
          gltf.scene.traverse((obj) => {
            if (!(obj as { isMesh?: boolean }).isMesh) return;
            partBox.setFromObject(obj);
            partBox.getSize(partSize);
            partBox.getCenter(partCentre);
            const volume = partSize.x * partSize.y * partSize.z;
            if (!volume) return;
            centre.addScaledVector(partCentre, volume);
            weight += volume;
          });
          if (weight) centre.divideScalar(weight);
          else box.getCenter(centre);

          gltf.scene.position.sub(centre);
          scene.add(gltf.scene);

          // Reach from the spin axis, measured after the shift above.
          const shifted = box.clone().translate(centre.clone().negate());
          reachXZ = Math.hypot(
            Math.max(Math.abs(shifted.min.x), Math.abs(shifted.max.x)),
            Math.max(Math.abs(shifted.min.z), Math.abs(shifted.max.z)),
          );
          reachY = Math.max(Math.abs(shifted.min.y), Math.abs(shifted.max.y));
          if (!reachXZ) reachXZ = size.x * 0.5 || 1;
          if (!reachY) reachY = size.y * 0.5 || 1;

          camera.position.set(0.75, 0.45, 0.95);
          controls.target.set(0, 0, 0);

          loaded = true;
          resize(); // sizes the canvas, then frames the model for that shape
          frameModel();
          setStatus('ready');
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
