import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StepModel } from '@/data/types';
import type { ModelAnimation } from './modelAnimations';
import { RotateLeft03Icon } from '@/components/icons/RotateLeft03Icon';
import { pixelRatioCap } from '@/lib/device';

const base = import.meta.env.BASE_URL;

/**
 * Model files fetched ahead of the viewer that will show them (the tile-cover
 * scheduler asks for a tile's models as soon as the tile is near): downloads
 * run in parallel and off the main thread, so by the time a viewer is built
 * its model is usually already here. Each buffer is handed to the first
 * viewer that wants it and then forgotten.
 */
const preloaded = new Map<string, Promise<ArrayBuffer>>();

export function preloadModel(src: string) {
  if (preloaded.has(src)) return;
  const request = fetch(`${base}${src}`, { priority: 'low' } as RequestInit).then((response) => {
    if (!response.ok) throw new Error(`${response.status} for ${src}`);
    return response.arrayBuffer();
  });
  request.catch(() => {}); // a viewer falls back to loading it itself
  preloaded.set(src, request);
}

interface ModelLayerProps {
  model: StepModel;
  /** Visible step: when false the viewer keeps its last frame and stops drawing. */
  active: boolean;
  /** Reduced motion: no self-rotation. */
  animated: boolean;
  /** Drag-to-rotate with a mouse or finger. Off for the bento tile cover, so
   *  a tap there opens the project instead of being read as a rotate-drag. */
  interactive?: boolean;
  /** The model has loaded and its first frame is drawn. */
  onReady?: () => void;
  /** The model could not be shown: it failed to load, or the browser took the
   *  WebGL context away (too many live 3D views, GPU reset). The caller should
   *  show a photo instead. */
  onError?: () => void;
  /** Keep the drawn frame readable through `canvas.toDataURL()` (costs memory;
   *  only for the still-image capture tool, never on the site itself). */
  snapshot?: boolean;
  /** Build the viewer as soon as this mounts instead of waiting until it is
   *  near the screen. For tile covers, whose scheduler (src/lib/coverLive.ts)
   *  already decides when — deliberately well before the tile is in view. */
  eager?: boolean;
}

/**
 * The environment map every viewer lights its metal with, as raw pixels read
 * back from the first viewer that made it. Making it (three's PMREMGenerator
 * renders a small room scene to a cube map and blurs it, compiling five
 * shaders on the way) was the bulk of the main-thread stall each time a viewer
 * started; WebGL contexts can't share textures, but they can each upload the
 * same pixels, which takes a fraction of the time and looks identical.
 */
let sharedEnvironment: { data: Uint16Array; width: number; height: number } | null = null;
/** Set while one viewer is generating that map, so the others wait for it. */
let environmentBusy: Promise<void> | null = null;

type Three = typeof import('three');
type Renderer = import('three').WebGLRenderer;
type Material = import('three').Material;

/**
 * Resolves once the given materials' shader programs have finished linking.
 * With KHR_parallel_shader_compile (nearly every browser) that happens on the
 * GPU process's own threads, so waiting here instead of drawing straight away
 * is what keeps the main thread from freezing on a first draw. Bounded: a lost
 * context or a stuck driver must not leave a viewer waiting for ever.
 */
function whenCompiled(renderer: Renderer, materials: Iterable<Material>, limit = 4000) {
  const pending = new Set(materials);
  const deadline = performance.now() + limit;
  return new Promise<void>((resolve) => {
    const check = () => {
      if (renderer.getContext().isContextLost() || performance.now() > deadline) return resolve();
      for (const material of pending) {
        const program = (renderer.properties.get(material) as { currentProgram?: { isReady(): boolean } }).currentProgram;
        if (!program || program.isReady()) pending.delete(material);
      }
      if (pending.size) setTimeout(check, 16);
      else resolve();
    };
    check();
  });
}

/**
 * Gets PMREMGenerator's shaders linked in the background *before* it is asked
 * to render. `fromScene()` is synchronous and uses each of its five programs
 * the moment it has created it, so on a cold shader cache the main thread sat
 * waiting for all of them — a measured 0.4 s freeze on a fast desktop, once per
 * visit. Creating the same programs first (same materials, same render state,
 * so the same cache keys) and waiting for them off-thread removes that.
 *
 * This reaches into PMREMGenerator's private fields (three 0.186). If a future
 * three renames them, the checks below fail quietly and `fromScene()` simply
 * compiles its own shaders again, as slow as before but still correct.
 */
async function warmEnvironmentShaders(THREE: Three, renderer: Renderer, pmrem: object, room: import('three').Scene) {
  const internals = pmrem as {
    _setSize?: (size: number) => void;
    _allocateTargets?: () => import('three').WebGLRenderTarget;
    _ggxMaterial?: Material | null;
    _blurMaterial?: Material | null;
  };
  if (typeof internals._setSize !== 'function' || typeof internals._allocateTargets !== 'function') return;
  internals._setSize(256); // fromScene()'s default size
  const target = internals._allocateTargets(); // also creates the two filter materials
  // Stand-in for the planes fromScene() draws its filters on. It needs the
  // same attributes they have: whether a geometry has `position` is part of
  // the program's cache key (an empty geometry compiles a different program,
  // which is then never used).
  const plane = new THREE.BufferGeometry();
  plane.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  plane.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
  const box = new THREE.BoxGeometry();
  // The same material fromScene() clears each cube face with.
  const background = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false });
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  const materials = new Set<Material>();
  // Programs are keyed on the render state too: fromScene() draws into a
  // render target with tone mapping off, so compile under the same.
  const oldTarget = renderer.getRenderTarget();
  const oldToneMapping = renderer.toneMapping;
  renderer.setRenderTarget(target);
  renderer.toneMapping = THREE.NoToneMapping;
  try {
    for (const m of renderer.compile(room, camera)) materials.add(m);
    // These three are drawn on their own (no scene, so no lights), not as part of the room.
    for (const material of [background, internals._ggxMaterial, internals._blurMaterial]) {
      if (!material) continue;
      const mesh = new THREE.Mesh(material === background ? box : plane, material);
      for (const m of renderer.compile(mesh, camera)) materials.add(m);
    }
  } finally {
    renderer.setRenderTarget(oldTarget);
    renderer.toneMapping = oldToneMapping;
  }
  await whenCompiled(renderer, materials);
  plane.dispose();
  box.dispose();
  target.dispose();
}

/**
 * Gives `scene` its environment map: the shared pixels if a viewer has already
 * made them, otherwise generated here (and shared for the next one).
 */
async function prepareEnvironment(
  THREE: Three,
  RoomEnvironment: typeof import('three/examples/jsm/environments/RoomEnvironment.js').RoomEnvironment,
  renderer: Renderer,
  scene: import('three').Scene,
  gone: () => boolean,
) {
  // Another viewer is generating it right now: wait, then use its pixels.
  while (!sharedEnvironment && environmentBusy) await environmentBusy;
  if (gone()) return;
  if (sharedEnvironment) {
    // Same settings as the render target PMREMGenerator makes.
    const { data, width, height } = sharedEnvironment;
    const env = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
    env.mapping = THREE.CubeUVReflectionMapping;
    env.magFilter = THREE.LinearFilter;
    env.minFilter = THREE.LinearFilter;
    env.generateMipmaps = false;
    env.colorSpace = THREE.LinearSRGBColorSpace;
    env.needsUpdate = true;
    scene.environment = env;
    return;
  }
  let release = () => {};
  environmentBusy = new Promise<void>((resolve) => (release = resolve));
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    const room = new RoomEnvironment();
    await warmEnvironmentShaders(THREE, renderer, pmrem, room).catch(() => {});
    if (gone()) return;
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    // Keep the pixels for the viewers after this one. If the browser can't
    // read them back (all zeros, or it throws), nothing is kept and each
    // viewer simply makes its own.
    try {
      const { width, height } = target;
      const data = new Uint16Array(width * height * 4);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, data);
      if (!renderer.getContext().getError() && data.some((v) => v !== 0)) sharedEnvironment = { data, width, height };
    } catch {
      /* keep generating per viewer */
    }
  } finally {
    pmrem.dispose();
    environmentBusy = null;
    release();
  }
}

/**
 * Real-time .glb viewer. Three.js and the loaders are imported on demand, so
 * the 3D code only reaches visitors who scroll to this step.
 *
 * The model turns slowly by itself and can be dragged with a mouse or a
 * finger, unless `interactive` is off.
 */
export function ModelLayer({
  model,
  active,
  animated,
  interactive = true,
  onReady,
  onError,
  snapshot = false,
  eager = false,
}: ModelLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Latest callbacks, readable from the (once-only) set-up effect below.
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
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

    const start = async () => {
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

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: snapshot });
      // A tile cover is small and slow-turning, so it doesn't need the full
      // phone pixel density — 1.5 is visually the same there and ~45% fewer
      // pixels; weaker devices (src/lib/device.ts) get less still.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap(interactive)));
      // The browser drops a context when too many are live or the GPU resets.
      // Rather than leave a blank box, give up on this view: the caller falls
      // back to its photo (a cover keeps showing its still image).
      let failed = false;
      const fail = () => {
        if (disposed) return;
        failed = true;
        setStatus('error');
        callbacks.current.onError?.();
      };
      const onContextLost = (e: Event) => {
        e.preventDefault();
        cancelAnimationFrame(frame);
        frame = 0;
        fail();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
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
      // It arrives asynchronously (see prepareEnvironment); the model is
      // fetched meanwhile and only compiled and shown once this has settled.
      const environmentReady = prepareEnvironment(THREE, RoomEnvironment, renderer, scene, () => disposed || failed).catch(
        () => {},
      );
      scene.environmentIntensity = 0.18;

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
        const now = performance.now();
        // Covers draw at ~30 fps: they turn at 12°/s, so 60 fps is invisible
        // there, and up to nine of these run at once. (Skips the frame but keeps
        // the loop alive; `lastDraw` only moves on a real draw, so the spin's
        // elapsed time stays correct.)
        if (!interactive && lastDraw && now - lastDraw < 30) {
          frame = requestAnimationFrame(draw);
          return;
        }
        anim?.setPlaying(true);
        controls.autoRotate = state.current.animated && state.current.active && model.autoRotate !== false;
        // Real elapsed time, so the spin is the same speed at any frame rate. Capped so a
        // hiccup (or the first frame after being idle) can't make it jump.
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

      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const onLoaded = (
        gltf: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF,
      ) => {
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

          const show = () => {
            if (disposed || failed) return;
            loaded = true;
            resize(); // sizes the canvas, then frames the model for that shape
            frameModel();
            setStatus('ready');
            // Always one frame, even if this viewer was built ahead of its
            // tile coming on screen (draw() does nothing off screen): the
            // still image fades out once we report ready, and the canvas
            // under it must not be empty. The spin starts when it's in view.
            if (onScreen && state.current.active) draw();
            else renderer.render(scene, camera);
            callbacks.current.onReady?.();

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
          };
          // Have the model's shaders compiled before the first draw, in the
          // background where the browser supports it (most do). Drawing
          // straight away instead makes the main thread wait for every shader
          // — the single biggest stall in a profile of scrolling the grid.
          void environmentReady
            .then(() => {
              if (disposed || failed) return;
              // (The environment has to be in place first: it is part of
              // what the shaders are compiled for.)
              return whenCompiled(renderer, renderer.compile(scene, camera));
            })
            .then(show, show);
      };
      const url = `${base}${model.src}`;
      const loadItself = () => loader.load(url, onLoaded, undefined, fail);
      const ahead = preloaded.get(model.src);
      if (ahead) {
        preloaded.delete(model.src);
        ahead.then(
          (buffer) => {
            if (!disposed) loader.parse(buffer, '', onLoaded, fail);
          },
          () => {
            if (!disposed) loadItself();
          },
        );
      } else {
        loadItself();
      }

      cleanup = () => {
        cancelAnimationFrame(frame);
        anim?.dispose();
        observer.disconnect();
        visibility.disconnect();
        controls.removeEventListener('change', restart);
        if (setZoomForPointer) host.removeEventListener('pointerdown', setZoomForPointer, { capture: true });
        controls.dispose();
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        scene.traverse((obj) => {
          const mesh = obj as { geometry?: { dispose(): void }; material?: unknown };
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => (m as { dispose(): void }).dispose());
          else (material as { dispose?(): void } | undefined)?.dispose?.();
        });
        renderer.dispose();
        // Covers come and go as the page scrolls: free the context now rather
        // than when the browser gets round to it, or the per-page limit (16 in
        // Chrome) is reached and the browser takes a *live* one away instead.
        // (Unless the browser already took it: three would only log a warning.)
        if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    // Don't build the renderer or fetch the model until the viewer is near the
    // screen. Without this every tile cover (nine WebGL contexts) set itself up
    // at page load, even for tiles far down the page.
    let started = eager;
    if (eager) void start();
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        near.disconnect();
        void start();
      },
      // Far enough ahead that a phone's fast scroll doesn't outrun it.
      { rootMargin: '900px 0px' },
    );
    near.observe(host);

    return () => {
      disposed = true;
      near.disconnect();
      cleanup();
    };
  }, [model.src]);

  return (
    <div className={cn('model-layer', active && 'is-active')} aria-label={model.title} role="img">
      <div ref={hostRef} className="model-layer__canvas" />
      {status !== 'ready' && (
        <p className="model-layer__status">{status === 'loading' ? 'Loading 3D model…' : 'Model unavailable'}</p>
      )}
      {/* Drag/pinch-to-interact hint — only where that's actually possible
          (a step's own model, not the non-interactive bento tile cover). */}
      {interactive && status === 'ready' && <RotateLeft03Icon className="model-layer__rotate-hint" aria-hidden="true" />}
    </div>
  );
}
