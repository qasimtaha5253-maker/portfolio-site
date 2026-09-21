import gsap from 'gsap';
import type { Group, Object3D } from 'three';
import type { ModelAnimationName } from '@/data/types';

type Three = typeof import('three');

/** What ModelLayer needs from a model's built-in animation. */
export interface ModelAnimation {
  /** Play while the model is on screen and visible, pause otherwise. */
  setPlaying(playing: boolean): void;
  dispose(): void;
}

/** Finds the first object in `root` (itself included) that passes `test`. */
function find(root: Object3D, test: (o: Object3D) => boolean): Object3D | undefined {
  let hit: Object3D | undefined;
  root.traverse((o) => {
    if (!hit && test(o)) hit = o;
  });
  return hit;
}

// SolidWorks names a sub-assembly "Fixture^new assembly" (three.js also turns
// spaces into underscores), so match on the part before the "^".
const baseName = (o: Object3D) => o.name.split('^')[0];

// ---------------------------------------------------------------------------
// PTU gear-cutting fixture
//
// A static SolidWorks export with three things that move independently:
//   Fixture       never moves
//   Moving_Group  ring gear, shaft, spline shaft (and dowel) — move together
//   Cutter-1      the saw blade
//
// The file is in metres (the base plate is 0.108 across = 108 mm) while the
// SolidWorks dimensions are in millimetres, hence MM.
//
// Directions, worked out from the model itself: the slot in the back plates is
// horizontal with its ends at x = ±29.55 mm and the shaft starts at the +X end,
// so "left" is −X. That makes the front view the one looking from +Z toward −Z
// (X to the right, Y up), so "counter-clockwise from the front" is a positive
// turn about +Z. The axle runs along Z through the shaft's centre.
// ---------------------------------------------------------------------------
const MM = 0.001;
const CUT_1 = 33 * MM;
const CUT_2 = 35.79 * MM;
const SLIDE = 59.108814 * MM;
const TURN = (75.09 * Math.PI) / 180;

/** What the direction test measured (all in world units / degrees). */
export interface DirectionTestResult {
  cutterDeltaY_mm: number;
  partDeltaX_mm: number;
  rotationFromFront_deg: number;
  cutterMovesDown: boolean;
  partMovesLeft: boolean;
  rotationIsCounterClockwiseFromFront: boolean;
}

function gearCutting(THREE: Three, root: Object3D): ModelAnimation | null {
  root.updateMatrixWorld(true);

  const moving = find(root, (o) => baseName(o) === 'Moving_Group');
  const cutter = find(root, (o) => baseName(o).startsWith('Cutter'));
  const shaft = moving && find(moving, (o) => /^Shaft/i.test(o.name));
  if (!moving?.parent || !cutter || !shaft) {
    console.warn('[gear-cutting] expected Moving_Group, Cutter and Shaft nodes; found', { moving, cutter, shaft });
    return null;
  }

  // Pivot: a group placed on the axle (the centre of the shaft's bounding box)
  // that Moving_Group is re-parented into, so turning the pivot turns the
  // whole group about the axle.
  const shaftBox = new THREE.Box3().setFromObject(shaft);
  const shaftSize = shaftBox.getSize(new THREE.Vector3());
  if (!(shaftSize.z > shaftSize.x && shaftSize.z > shaftSize.y) || Math.abs(shaftSize.z - 118 * MM) > 5 * MM) {
    console.warn('[gear-cutting] the shaft is not the expected 118 mm along Z; check the axle and the units', shaftSize);
  }
  const parent = moving.parent;
  const pivot: Group = new THREE.Group();
  pivot.name = 'Moving_Group pivot';
  pivot.position.copy(parent.worldToLocal(shaftBox.getCenter(new THREE.Vector3())));
  parent.add(pivot);
  pivot.updateMatrixWorld(true);
  pivot.attach(moving); // keeps Moving_Group exactly where it is in the world

  const x0 = pivot.position.x;
  const y0 = cutter.position.y;

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true, defaults: { ease: 'power2.inOut' } });
  /** Cutter down `depth`, pause 0.5 s, back up. */
  const cut = (depth: number) => {
    tl.to(cutter.position, { y: y0 - depth, duration: 1.5 }).to(cutter.position, { y: y0, duration: 1.5 }, '+=0.5');
  };
  cut(CUT_1);
  tl.to(pivot.position, { x: x0 - SLIDE, duration: 1.5 }) // slide left along the slot
    .to(pivot.rotation, { z: TURN, duration: 1 }); //          then turn counter-clockwise 75.09°
  cut(CUT_2);
  // Slide back to the right while turning counter-clockwise (as seen from the front) the
  // rest of the way round to the start orientation: 75.09° → 360° = 284.91°. It never
  // unwinds clockwise. 360° is the same pose as 0°, so the loop is seamless.
  tl.to(pivot.position, { x: x0, duration: 1.5 }).to(pivot.rotation, { z: Math.PI * 2, duration: 1.5 }, '<');
  // Each lap ends at 360°; start the next one from an explicit 0° (the same pose).
  tl.eventCallback('onRepeat', () => void (pivot.rotation.z = 0));
  // repeatDelay above is the closing 0.5 s pause before it loops.

  let wantPlaying = false;
  let testing = false;

  // ---- direction test (dev only: window.__gearCuttingTest()) ----
  // One small move of each part, measured in world space; the main loop is
  // held off while it runs, then restarts from the start pose.
  const centreOf = (o: Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  const test = async (): Promise<DirectionTestResult> => {
    testing = true;
    tl.pause(0); // start pose
    root.updateMatrixWorld(true);
    const probe = new THREE.Object3D(); // a point on the gear, 30 mm out from the axle
    probe.position.set(30 * MM, 0, 0);
    pivot.add(probe);
    const angleOf = () => {
      probe.updateWorldMatrix(true, false);
      const p = probe.getWorldPosition(new THREE.Vector3());
      const a = pivot.getWorldPosition(new THREE.Vector3());
      return Math.atan2(p.y - a.y, p.x - a.x); // seen from +Z (the front), X right, Y up
    };
    const run = (fn: (t: gsap.core.Timeline) => void) =>
      new Promise<void>((done) => {
        const t = gsap.timeline({ onComplete: done, defaults: { ease: 'power2.inOut', duration: 0.6 } });
        fn(t);
      });

    const c0 = centreOf(cutter);
    await run((t) => void t.to(cutter.position, { y: y0 - 5 * MM }));
    root.updateMatrixWorld(true);
    const cutterDeltaY = (centreOf(cutter).y - c0.y) / MM;
    cutter.position.y = y0;

    const m0 = centreOf(moving);
    await run((t) => void t.to(pivot.position, { x: x0 - 5 * MM }));
    root.updateMatrixWorld(true);
    const partDeltaX = (centreOf(moving).x - m0.x) / MM;
    pivot.position.x = x0;

    const a0 = angleOf();
    await run((t) => void t.to(pivot.rotation, { z: (15 * Math.PI) / 180 }));
    root.updateMatrixWorld(true);
    const turn = ((angleOf() - a0) * 180) / Math.PI;
    pivot.rotation.z = 0;
    pivot.remove(probe);

    testing = false;
    if (wantPlaying) tl.play(0);

    return {
      cutterDeltaY_mm: +cutterDeltaY.toFixed(3),
      partDeltaX_mm: +partDeltaX.toFixed(3),
      rotationFromFront_deg: +turn.toFixed(3),
      cutterMovesDown: cutterDeltaY < 0,
      partMovesLeft: partDeltaX < 0,
      rotationIsCounterClockwiseFromFront: turn > 0,
    };
  };
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __gearCuttingTest: test,
      __gearCuttingTimeline: tl,
      __gearCuttingParts: { pivot, cutter, moving, shaft },
    });
  }

  return {
    setPlaying: (playing) => {
      wantPlaying = playing;
      if (!testing) void (playing ? tl.play() : tl.pause());
    },
    dispose: () => void tl.kill(),
  };
}

/** Builds the named animation for a loaded model, or null if the model doesn't have the parts it needs. */
export function createModelAnimation(name: ModelAnimationName, THREE: Three, root: Object3D): ModelAnimation | null {
  switch (name) {
    case 'ptu-gear-cutting':
      return gearCutting(THREE, root);
  }
}
