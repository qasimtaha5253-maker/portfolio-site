import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StepModel } from '@/data/types';
import type { ModelAnimation } from './modelAnimations';

const base = import.meta.env.BASE_URL;

interface ModelLayerProps {
  model: StepModel;
  /** Visible step: when false the viewer keeps its last frame and stops drawing. */
  active: boolean;
  /** Reduced motion: no self-rotation. */
  animated: boolean;
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
export function ModelLayer({ model, active, animated, interactive = true }: ModelLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Kept in a ref so the draw loop can read it without re-running the effect.
  const state = useRef({ active, animated });
  state.current = { active, animated };
  // Restarts the loop when this becomes the visible step again.
  const resume = useRef<() => void>(() => {});
  useEffect(() => {
    if (active) resume.current();
  }, [active]);

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
      // `model.brightness` scales this for a model that renders too bright
      // (pale parts wash out to white).
      renderer.toneMappingExposure = 0.68 * (model.brightness ?? 1);

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
      // take (interactive: false there) — off, so its spin stops cleanly (when
      // the tile opens) instead of decelerating for a few frames.
      controls.enableDamping = interactive;
      controls.enablePan = false;
      controls.enableRotate = interactive;
      // Drag to rotate with a mouse or a finger. A swipe that starts on the
      // model turns it instead of scrolling, so the page is scrolled from the
      // text below it. Two fingers pinch to zoom (DOLLY_PAN, not just
      // DOLLY_ROTATE) — panning is off, so the "pan" half of that gesture is
      // inert, leaving pinch as a clean, rotate-independent zoom.
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: interactive ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.ROTATE };
      // 2 = one full turn every 30 s. The draw loop passes real elapsed time to
      // controls.update(), so this is the same on a 144 Hz monitor as on a 60 Hz
      // phone (without it OrbitControls turns a fixed step per frame).
      controls.autoRotateSpeed = 2;
      if (!interactive) {
        // OrbitControls' connect() sets touch-action: none on the canvas
        // unconditionally, regardless of enableRotate — reserving the touch
        // gesture for rotation even when rotation is off. A non-interactive
        // tile cover never rotates from touch, so that was silently
        // swallowing the scroll gesture whenever it started on a cover.
        renderer.domElement.style.touchAction = 'pan-y';
      }
      // enableZoom is a single flag shared by OrbitControls for BOTH the
      // mouse wheel and touch-pinch dolly — turning it on outright would let
      // a desktop visitor's wheel scroll get captured by the model instead of
      // scrolling the page whenever the cursor happens to be over it (the
      // same class of bug as the tile-cover touch-action issue). Toggling it
      // per-pointer-type keeps pinch-zoom for touch without ever enabling
      // wheel-zoom — but it has to happen before OrbitControls' own
      // pointerdown handler reads it for this same event, and a capture-phase
      // listener on the canvas itself does NOT run first: for the element an
      // event is dispatched *at*, capture vs. bubble doesn't order listeners,
      // only registration order does, and OrbitControls (added in its own
      // constructor, above) registered its handler first. Listening on
      // `host` (canvas's *parent*) instead works, because a capture-phase
      // listener on an actual ancestor genuinely runs before the target's own
      // listeners, regardless of registration order.
      controls.enableZoom = false;
      let setZoomForPointer: ((e: PointerEvent) => void) | null = null;
      if (interactive) {
        setZoomForPointer = (e) => {
          controls.enableZoom = e.pointerType === 'touch';
        };
        host.addEventListener('pointerdown', setZoomForPointer, { capture: true });
      }

      // Set once the model is loaded: how far the camera needs to sit back to
      // fit the model. reachXZ is measured from the spin centre (not the
      // bounding box's middle), since centring on the model's bulk leaves it
      // lopsided — the towing handle swings out much further than the body,
      // and that full swing radius has to fit regardless of rotation. reachY
      // has no such swing (turning around the vertical axis doesn't change a
      // point's height), so it's measured from the true vertical midpoint —
      // see where it's computed, below.
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
        // Breathing room; `model.margin` adds more for a model that needs it.
        const distance = Math.max(forHeight, forWidth) * 1.12 * (model.margin ?? 1);
        const direction = camera.position.clone().sub(controls.target).normalize();
        if (direction.lengthSq() === 0) direction.set(0.75, 0.45, 0.95).normalize();
        camera.position.copy(direction.multiplyScalar(distance).add(controls.target));
        camera.near = distance / 100;
        camera.far = distance * 10;
        camera.updateProjectionMatrix();
        // How far pinch-zoom can pull the camera in/out, relative to the
        // auto-framed distance — close enough to actually feel like zooming
        // in, without letting the near plane clip through the model.
        controls.minDistance = distance * 0.35;
        controls.maxDistance = distance * 2.5;
        controls.update(0); // 0 s elapsed: re-frame without nudging the auto-rotation
      };

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (loaded) {
          frameModel();
          // Resizing wipes the canvas, and a still (not spinning) model
          // isn't redrawn every frame — so draw it once now, or a cover
          // model stays blank after its tile is expanded and closed again.
          resume.current();
        }
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      let onScreen = true;
      let loaded = false;
      // The model's built-in animation (`model.animation`), once loaded; null
      // for a plain model and under reduced motion.
      let anim: ModelAnimation | null = null;
      let lastDraw = 0; // when the previous frame was drawn (0 = the loop was idle)
      const draw = () => {
        // Stop drawing while scrolled away, or while another visual is showing:
        // the last frame stays on the canvas, which is faded out anyway.
        if (!onScreen || !state.current.active) {
          frame = 0;
          lastDraw = 0;
          anim?.setPlaying(false);
          return;
        }
        anim?.setPlaying(true);
        controls.autoRotate = state.current.animated && state.current.active && model.autoRotate !== false;
        // Real elapsed time, so the spin is the same speed at any frame rate. Capped so a
        // hiccup (or the first frame after being idle) can't make it jump.
        const now = performance.now();
        const elapsed = lastDraw ? Math.min((now - lastDraw) / 1000, 0.1) : 0;
        // Marks a draw as in progress *before* controls.update(), which can
        // synchronously fire the 'change' listener below (e.g. rotating on
        // its own, not just from a drag) — restart() checks `frame` to
        // avoid re-entering draw() while already inside it, so this has to
        // be set before update() can trigger that, not after (the real
        // frame id/0 overwrites this once rendering for real is done).
        frame = -1;
        controls.update(elapsed);
        renderer.render(scene, camera);
        // Under reduced motion the model doesn't spin, so one rendered frame
        // reflects the current state fully — no need to keep drawing every
        // frame (a drag or resize draws again). A model with its own
        // animation needs every frame drawn while that plays.
        frame = controls.autoRotate || anim ? requestAnimationFrame(draw) : 0;
        lastDraw = frame ? now : 0;
      };

      const restart = () => {
        if (onScreen && loaded && !frame && state.current.active) draw();
      };
      resume.current = restart;
      // The loop below only keeps re-scheduling itself while auto-rotating
      // or a built-in animation is playing — for a static model (neither),
      // it draws one frame and stops. OrbitControls fires this on every
      // camera change, including from a drag, so that still draws a fresh
      // frame each time instead of showing a stale one while being dragged.
      controls.addEventListener('change', restart);

      const visibility = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        restart();
      });
      visibility.observe(host);

      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
        `${base}${model.src}`,
        (gltf) => {
          if (disposed) return;

          // A source export that wasn't saved upright gets a one-time
          // correction here, before anything below measures it — so framing,
          // the spin axis and `margin` all then treat the corrected pose as
          // "up", the same as a model that arrived upright.
          if (model.rotation) {
            const [x, y, z] = model.rotation;
            gltf.scene.rotation.set((x * Math.PI) / 180, (y * Math.PI) / 180, (z * Math.PI) / 180);
            gltf.scene.updateMatrixWorld(true);
          }

          // `model.explode`: a one-time static pull-apart, before framing
          // measures the (now-exploded) model. Matched against the *start*
          // of each node's name, not `.includes()`, so a part's own mesh
          // label nested inside a same-named group (e.g. "Design 2 Holder"
          // inside "Holder") doesn't also match and get shifted twice.
          if (model.explode?.length) {
            for (const { part, offset } of model.explode) {
              gltf.scene.traverse((obj) => {
                if (!obj.name.startsWith(part)) return;
                obj.position.x += offset[0];
                obj.position.y += offset[1];
                obj.position.z += offset[2];
              });
            }
            gltf.scene.updateMatrixWorld(true);
          }

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

          // `model.transparentParts`: make a named part (and everything
          // nested inside it) see-through, so what's inside it is visible —
          // e.g. a housing over a mechanism. depthWrite off keeps it from
          // hiding what's behind it in the depth buffer regardless of draw
          // order; double-sided so the inside face still renders (a CAD
          // export's shell is usually front-face-only).
          if (model.transparentParts?.length) {
            const opacity = model.transparentOpacity ?? 0.3;
            const parts = model.transparentParts;
            gltf.scene.traverse((obj) => {
              if (!parts.some((part) => obj.name.includes(part))) return;
              obj.traverse((inner) => {
                const mesh = inner as { isMesh?: boolean; material?: unknown };
                if (!mesh.isMesh) return;
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const m of materials) {
                  const mat = m as { transparent?: boolean; opacity?: number; depthWrite?: boolean; side?: number } | undefined;
                  if (!mat) continue;
                  mat.transparent = true;
                  mat.opacity = opacity;
                  mat.depthWrite = false;
                  mat.side = THREE.DoubleSide;
                }
              });
            });
          }

          // Reach from the spin axis, measured after the shift above.
          const shifted = box.clone().translate(centre.clone().negate());
          reachXZ = Math.hypot(
            Math.max(Math.abs(shifted.min.x), Math.abs(shifted.max.x)),
            Math.max(Math.abs(shifted.min.z), Math.abs(shifted.max.z)),
          );
          // Vertically, unlike XZ, there's no swing-radius concern — turning
          // around the (vertical) Y axis never changes a point's Y coordinate,
          // so looking at the true vertical midpoint instead of the spin
          // centre doesn't make the model swing off-centre as it rotates. Parts
          // that reach further one way than the other (e.g. legs reaching
          // further down than a frame reaches up) previously got framed
          // symmetrically around the spin centre — sized to fit the larger
          // side, leaving slack on the smaller one instead of using it.
          const centreY = (shifted.min.y + shifted.max.y) / 2;
          reachY = (shifted.max.y - shifted.min.y) / 2;
          if (!reachXZ) reachXZ = size.x * 0.5 || 1;
          if (!reachY) reachY = size.y * 0.5 || 1;

          // frameModel() derives its viewing angle from camera.position minus
          // controls.target, so the camera has to be seeded *offset by* the
          // target — otherwise, for any model with a non-zero centreY, that
          // first direction comes out skewed (not just re-based), tilting the
          // angle itself rather than only shifting what it's centred on.
          controls.target.set(0, centreY, 0);
          camera.position.set(0.75, 0.45, 0.95).add(controls.target);

          loaded = true;
          resize(); // sizes the canvas, then frames the model for that shape
          frameModel();
          setStatus('ready');
          draw();

          // Model with its own animation: load that code only now that it's
          // needed, then start drawing every frame (draw() plays/pauses it).
          if (model.animation && state.current.animated) {
            void import('./modelAnimations').then(({ createModelAnimation }) => {
              if (disposed) return;
              anim = createModelAnimation(model.animation!, THREE, gltf.scene);
              cancelAnimationFrame(frame);
              frame = 0;
              restart();
            });
          }
        },
        undefined,
        () => !disposed && setStatus('error'),
      );

      cleanup = () => {
        cancelAnimationFrame(frame);
        anim?.dispose();
        observer.disconnect();
        visibility.disconnect();
        controls.removeEventListener('change', restart);
        if (setZoomForPointer) host.removeEventListener('pointerdown', setZoomForPointer, { capture: true });
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
