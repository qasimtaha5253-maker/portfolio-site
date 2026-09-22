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

// gltf-transform's dedup() renames a mesh node it merges with an identical one
// elsewhere in the file to the full slash-joined path it was found at, to keep
// names unique (e.g. ".../Shaft to Rotate_Assembly Updated-1/Shaft-1"). Three.js's
// loader then sanitizes every node name: whitespace becomes "_", and reserved
// characters — including "/" — are deleted outright, not replaced, so that
// prefix doesn't become a separate segment, it's glued straight onto the leaf's
// own name with no separator at all. The leaf's own name still appears intact
// *somewhere* in the result, just not after a "/" — so match with `.includes()`
// on the (space-sanitized) leaf name, not a path split.
const sanitized = (name: string) => name.replace(/\s/g, '_');
const sanitizedIncludes = (o: Object3D, name: string) => o.name.includes(sanitized(name));

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
  // The turn's sense is tied to the slide, and reads the same from any side you view it
  // from (viewing from the back flips left/right and clockwise/counter-clockwise together):
  //   sliding RIGHT (+X) turns COUNTER-clockwise,  sliding LEFT (−X) turns CLOCKWISE.
  // In model terms (+Z toward the front viewer): the slide left is −X, so its turn is
  // clockwise from +Z, a negative angle about +Z; the return slide (+X) unwinds it.
  cut(CUT_1);
  tl.to(pivot.position, { x: x0 - SLIDE, duration: 1.5 }) // slide left (−X) along the slot
    .to(pivot.rotation, { z: -TURN, duration: 1 }); //         then turn 75.09° clockwise from +Z
  cut(CUT_2);
  // Slide back (+X) while turning back to the start orientation, counter-clockwise from +Z.
  tl.to(pivot.position, { x: x0, duration: 1.5 }).to(pivot.rotation, { z: 0, duration: 1.5 }, '<');
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

// ---------------------------------------------------------------------------
// Speed-sensor oiling assembly
//
//   Sensor-1   the speed sensor — the only part that moves
//   Fixture^Speed Sensor Oiling Assembly   stand + sponge: never moves
//
// The sensor is lowered 1.25 in (31.75 mm) into the sponge over 1.5 s, held for
// 0.5 s, then raised the same distance over 1.5 s, and it loops straight away.
// The file is in metres (the stand is 70 mm across); down is −Y.
// ---------------------------------------------------------------------------
const INCH = 25.4 * MM;

function oilingSensor(THREE: Three, root: Object3D): ModelAnimation | null {
  root.updateMatrixWorld(true);
  const sensor = find(root, (o) => baseName(o).startsWith('Sensor-'));
  const stand = find(root, (o) => /^Speed_Sensor_Stand/.test(o.name));
  if (!sensor) {
    console.warn('[oiling-sensor] expected a "Sensor-1" node');
    return null;
  }
  if (stand) {
    const width = new THREE.Box3().setFromObject(stand).getSize(new THREE.Vector3()).x;
    if (Math.abs(width - 70 * MM) > 5 * MM) console.warn('[oiling-sensor] the stand is not the expected 70 mm; check the units', width);
  }

  const y0 = sensor.position.y;
  const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'power2.inOut' } });
  tl.to(sensor.position, { y: y0 - 1.25 * INCH, duration: 1.5 }) // lower 1.25 in
    .to(sensor.position, { y: y0, duration: 1.5 }, '+=0.5'); //     hold 0.5 s, then raise it again

  if (import.meta.env.DEV) Object.assign(window, { __oilingSensor: { timeline: tl, sensor } });
  return { setPlaying: (playing) => void (playing ? tl.play() : tl.pause()), dispose: () => void tl.kill() };
}

// ---------------------------------------------------------------------------
// Conveyor cart drive shaft
//
//   "Shaft to Rotate"   the whole drive-shaft sub-assembly (shaft, both
//                        handles, locking profiles, collars) — turns as one
//                        piece; everything else on the cart stays put.
//
// This export has many duplicated parts (two mirrored shaft halves, dozens of
// identical roller-assembly screws/bearings), which `npm run model`'s default
// instancing pass collapses into shared GPU-instanced batches — fine for a
// static model, but it also swallows the very node this animation looks up
// by name, so this .glb was compressed with `--no-instance` to keep every
// part addressable (still ~0.6 MB either way; instancing wasn't doing much
// for the file size here).
//
// The "Shaft to Rotate" node sits at the local origin with an identity
// transform, and its "Shaft-1" mesh (the plain shaft rod, not the many
// "Shaft__-1" roller shafts elsewhere in the cart) is centred exactly on
// that origin — so the group is already pivoted on its own rotation axis,
// running along local/world Z. Still wrapped in a pivot at the shaft's own
// centre (found from its mesh, not trusted from the group's name) for the
// same robustness as the gear fixture, in case a future export isn't quite
// this tidy.
//
// Direction: the file has no physical left/right cue the way the gear
// fixture's slot did, so "clockwise" is read from the .glb's own embedded
// "current camera" (the SolidWorks viewport open when this was exported) —
// it sits well past the shaft's +Z end looking back toward −Z, i.e. +Z
// points at that viewer, so a clockwise turn from there is a NEGATIVE
// rotation about +Z. If this reads backwards on screen, flip SHAFT_TURN's
// sign — everything else about the motion stays the same.
// ---------------------------------------------------------------------------
const SHAFT_TURN = -Math.PI / 2; // 90°, clockwise as seen from the embedded camera (see above)

function conveyorShaft(THREE: Three, root: Object3D): ModelAnimation | null {
  root.updateMatrixWorld(true);

  // three.js replaces spaces in node names with underscores on load (see
  // baseName's comment above), so the SolidWorks name "Shaft to Rotate"
  // arrives as "Shaft_to_Rotate".
  const group = find(root, (o) => baseName(o) === 'Shaft_to_Rotate');
  // Scoped to `group`'s own subtree, where the only other shafts are the
  // "Shaft__-1" roller shafts (double underscore, no plain "Shaft-1" — a
  // substring match is unambiguous here).
  const shaft = group && find(group, (o) => sanitizedIncludes(o, 'Shaft-1'));
  if (!group?.parent || !shaft) {
    console.warn('[conveyor-shaft] expected a "Shaft to Rotate" node containing "Shaft-1"; found', { group, shaft });
    return null;
  }

  const shaftBox = new THREE.Box3().setFromObject(shaft);
  const shaftSize = shaftBox.getSize(new THREE.Vector3());
  if (!(shaftSize.z > shaftSize.x && shaftSize.z > shaftSize.y)) {
    console.warn('[conveyor-shaft] "Shaft-1" is not the expected long-and-thin rod along Z; check the axis', shaftSize);
  }

  const parent = group.parent;
  const pivot: Group = new THREE.Group();
  pivot.name = 'Shaft to Rotate pivot';
  pivot.position.copy(parent.worldToLocal(shaftBox.getCenter(new THREE.Vector3())));
  parent.add(pivot);
  pivot.updateMatrixWorld(true);
  pivot.attach(group); // keeps the shaft assembly exactly where it is in the world

  const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'power2.inOut' } });
  tl.to(pivot.rotation, { z: SHAFT_TURN, duration: 1.5 }) // turn 90°
    .to(pivot.rotation, { z: 0, duration: 1.5 }, '+=1'); //   hold 1 s, then turn back

  if (import.meta.env.DEV) Object.assign(window, { __conveyorShaft: { timeline: tl, pivot, group, shaft } });
  return { setPlaying: (playing) => void (playing ? tl.play() : tl.pause()), dispose: () => void tl.kill() };
}

// ---------------------------------------------------------------------------
// Shaft removal tool (shaft adapter + sleeve)
//
//   "Shaft Adaptor A"   one of the two interlocking halves that grip the
//                        shaft — the only one this animation moves
//   "Sleeve"             the slide-hammer sleeve that threads onto the top
//   "Shaft Adaptor B", the output-shaft body   never move
//
// Adaptor A sits offset from the shaft's own (vertical, Y) axis — "inwards"
// is read as toward that axis: the direction from A's start position to the
// axis, in the horizontal (X/Z) plane, computed from wherever A actually is
// rather than assumed, so this still works if the part is repositioned in a
// future export. "Down" for the sleeve is unambiguous — everything in this
// file stacks along Y (shaft body at the bottom, adaptors above it, sleeve
// on top) — so it's simply −Y.
// ---------------------------------------------------------------------------
function shaftPuller(THREE: Three, root: Object3D): ModelAnimation | null {
  root.updateMatrixWorld(true);
  const adaptorA = find(root, (o) => sanitizedIncludes(o, 'Shaft Adaptor A'));
  const sleeve = find(root, (o) => sanitizedIncludes(o, 'Sleeve'));
  if (!adaptorA || !sleeve) {
    console.warn('[shaft-puller] expected "Shaft Adaptor A" and "Sleeve" nodes; found', { adaptorA, sleeve });
    return null;
  }

  // A's offset from the shaft's vertical axis, in the horizontal plane —
  // "inward" is the direction from here back toward that axis (X=0, Z=0).
  const ax0 = adaptorA.position.x;
  const az0 = adaptorA.position.z;
  const radial = new THREE.Vector2(ax0, az0);
  if (radial.length() < 1e-4) {
    console.warn('[shaft-puller] "Shaft Adaptor A" sits on the shaft axis already; no inward direction to move along', {
      ax0,
      az0,
    });
    return null;
  }
  const inward = radial.clone().normalize().multiplyScalar(-1.5 * INCH); // 1.5 in, toward the axis
  const sy0 = sleeve.position.y;

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true, defaults: { ease: 'power2.inOut' } });
  tl.to(adaptorA.position, { x: ax0 + inward.x, z: az0 + inward.y, duration: 1.5 }) // A moves inward, 1.5 in
    .to(sleeve.position, { y: sy0 - 2 * INCH, duration: 1.5 }, '+=0.5') //             sleeve moves down, 2 in
    .to(sleeve.position, { y: sy0, duration: 1.5 }, '+=0.5') //                        sleeve moves back up
    .to(adaptorA.position, { x: ax0, z: az0, duration: 1.5 }, '+=0.5'); //             A moves outward again
  // repeatDelay above is the closing 0.5 s pause before it loops.

  if (import.meta.env.DEV) Object.assign(window, { __shaftPuller: { timeline: tl, adaptorA, sleeve } });
  return { setPlaying: (playing) => void (playing ? tl.play() : tl.pause()), dispose: () => void tl.kill() };
}

/** Builds the named animation for a loaded model, or null if the model doesn't have the parts it needs. */
export function createModelAnimation(name: ModelAnimationName, THREE: Three, root: Object3D): ModelAnimation | null {
  switch (name) {
    case 'ptu-gear-cutting':
      return gearCutting(THREE, root);
    case 'oiling-sensor':
      return oilingSensor(THREE, root);
    case 'conveyor-shaft':
      return conveyorShaft(THREE, root);
    case 'shaft-puller':
      return shaftPuller(THREE, root);
  }
}
