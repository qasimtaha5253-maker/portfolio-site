# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold.
Read `CLAUDE.md` first (project rules and architecture — refreshed 2026-09-18 for the bento
grid), then this.

Last updated: 2026-09-18, after session 4 (the bento-grid rebuild), the merge to `main`, and the
dead-code cleanup.

---

## 1. What this is, and where it lives

Single-page portfolio for Qasim Taha, final-year Mechanical Engineering co-op student at the
University of Guelph. 10 projects, loaded from one config file, rendered as a bento grid.

- **Live (main — the bento grid):** https://portfolio-site-qasim-1db5.vercel.app/
  Auto-deploys on push to `main`; Vercel can take several minutes to publish.
- **Repo:** https://github.com/qasimtaha5253-maker/portfolio-site — branch `main`
- **Old version:** the pinned-chapter scrollytelling site is tagged `pinned-chapter-version`
  (the vanilla-JS original is `vanilla-js-version`).
- **Local:** `C:\Users\qasim\Documents\portfolio-site` (moved off OneDrive — don't move it back;
  OneDrive syncing `node_modules` caused file locks)

`bento-layout` was fast-forward merged into `main` on 2026-09-18 at the user's request; it is
now just an alias of `main`'s history. Work directly on `main`, or on a branch for anything
risky (a pushed branch gets its own Vercel preview URL).

## 2. How the user works

- He gives direction; Claude writes all code and explains anything he must do in plain terms
  (he is not a web developer — no jargon without a one-line explanation).
- **Push automatically** once a change builds and passes checks, then report what went live.
  Don't sit on finished work waiting for approval.
- He iterates fast and visually, and describes symptoms precisely ("the screen moves up and down
  when...", "the bottom is cutting off, space on top") — reproduce exactly what he describes rather
  than guessing at a nearby-sounding bug. He will push back hard, and correctly, if a "fix" doesn't
  actually match what he's seeing on his own device.
- He's comfortable with real changes when they're the right fix — added a new animation library,
  downgraded a core dependency (React) — as long as the reasoning is explained. He is not
  precious about the current approach; when GSAP-based expand animation kept glitching after
  several honest attempts, he said "undo everything and start from scratch" rather than keep
  patching, and that was the right call.
- Report honestly, including when something couldn't be verified. See §6's browser-pane caveat —
  this came up constantly and he's already aware verification in this environment has limits.

## 3. Commands

```
npm run dev          # dev server, exposed on the LAN (he opens it on his phone)
npm run build        # tsc -b (TypeScript 7) then vite build — run before every push
npm run typecheck    # tsc -b only
npm run images       # content/photos/** -> public/projects/**/*.webp (+ transparent-photos.json)
npm run model -- <in.glb> <out.glb> [--ratio 0.2] [--no-resize] [--no-instance]
npm run video -- <frames-dir> <out.mp4> [--fps 30] [--width 1280] [--crf 23] [--poster]
```

`--no-resize` on the model script is new (§7) — skips the texture-resize step for sources whose
texture size metadata is unreliable. Default ratio is 0.2, not 0.15 as an older note said — check
`scripts/optimize-model.mjs` if in doubt rather than trusting a stale comment. `--no-instance`
(added 2026-09-21) skips GPU-instancing repeated parts — needed for a model a *model animation*
looks a part up by name in; see §7, "Conveyor shaft".

`npm run video` (added 2026-09-21, `scripts/optimize-video.mjs`) turns a numbered frame sequence
(e.g. `PlaneAssembly-0000.tga` …) into an H.264 MP4, using the `ffmpeg-static` package's bundled
binary — no system ffmpeg needed. `--poster` also writes a first-frame WebP still. See §7, "Video
pipeline" for the full story (a 1.1 GB TGA sequence → a 1.3 MB video).

Windows: stopping a background `npm run dev` can leave vite holding port 5173. Find it with
`Get-NetTCPConnection -LocalPort 5173` and stop that process.

## 4. Architecture (current, bento grid)

Vite + React 19.2.8 (pinned — see §7) + TypeScript + Tailwind v4, shadcn layout (`@/` → `src/`).

```
index.html                     shell, <html class="dark">
src/main.tsx → src/App.tsx     Intro, About, BentoGrid, footer
src/data/projects.ts           THE content file — all copy, photos, models, animations
src/data/types.ts              field docs for the above
src/components/
  BentoGrid.tsx                the whole grid: tiles, expand/collapse, scroll-follow, self-spinning covers
  StepVisual.tsx                a step's own visual inside an expanded tile (model/embed/split/photo)
  Photo.tsx                    responsive WebP <img>, adds `is-transparent` from a generated list
  StepContent.tsx              body / stats / bullets
  sections/                    Intro (canvas), About, ContactLinks
  ui/helix-chrono-matrix.tsx   user-supplied intro canvas, modified
  visuals/                     ModelLayer (3D), EmbedLayer (iframe), VideoLayer (plain <video>)
src/hooks/
  useMediaQuery.ts              useMotionAllowed (dev-only `?reduced-motion` flag)
  useSmoothScroll.ts            Lenis + GSAP ticker; now RETURNS a RefObject<Lenis|null> (see §7)
  useScrollFade.ts              Intro/About crossfade on scroll
src/styles/site.css            all site CSS, in @layer base/components
content/photos/<project>/      source images (committed)
content/models/                source .glb (GITIGNORED)
content/animations/<name>/     source frame sequence, e.g. .tga (GITIGNORED — can be 1 GB+)
public/projects/, public/models/, public/animations/   generated/served assets (committed)
scripts/optimize-model.mjs     model compression — see §7 for two real fixes made this session
scripts/optimize-video.mjs     frame-sequence -> MP4, added 2026-09-21 — see §7 "Video pipeline"
```

### How a tile works (`BentoGrid.tsx`)

- Every project is the same size tile: `grid-column: span 2`, `grid-row: span 2` (the size the
  featured tiles used to have; changed 2026-09-20 at his request). The `featured` field in
  `projects.ts` is therefore **unused by the grid** — kept in case he wants size tiers back.
  Tapping one sets `expanded` (a single `string | null`) and it grows in place;
  tapping it again, or tapping a different tile, collapses/switches.
- **Expand/collapse animation is Framer Motion (`motion` package), not GSAP.** `motion.article`
  with `layout` animates each tile's size/position; `AnimatePresence` + a `motion.div` with
  `initial/animate/exit` on `height`/`opacity` handles the detail content mounting. This was a
  deliberate choice after GSAP's manual FLIP approach (position: absolute + manual scroll math)
  kept producing real bugs in practice — see §7 for the whole story and why Motion needed a React
  downgrade to work at all.
- **Scroll-follow:** opening/switching tiles reflows the page around them, which used to read as
  the page glitching. `BentoGrid` now actively scrolls to and locks onto whichever tile is
  opening, every frame, via Lenis — see §7, this needed real debugging to get right (a one-shot
  scroll consistently landed in the wrong place).
- **Cover models:** a project whose first model-bearing step has a `model` (or a `split`/`stack`
  of models) shows those live models as its tile cover (instead of a plain photo). They **turn on
  their own** — changed 2026-09-20 at his request; before that they were still until hovered
  (the `spin`/hover plumbing is removed). Each cover `ModelLayer` gets `active={!isExpanded}`, so a
  cover stops drawing while its tile is open (it's hidden then), and `ModelLayer` also stops
  while a canvas is scrolled off-screen (IntersectionObserver). Under reduced motion they stay
  still. Fully data-driven via `coverModels()` — no per-project code. `interactive={false}` on
  covers, so a tap opens the tile instead of rotating.
  **Cost:** every visible cover is now a continuous 60 fps WebGL render (up to ~5–6 at once on a
  desktop screen, fewer on a phone where tiles fill the screen). Not measured on a real phone.
- **Deferred heavy visuals:** opening a tile with a 3D model/embedded animation used to visibly lag
  (loading them competed with the expand animation for frames). `StepVisual`'s `ready` prop defers
  mounting the actual `ModelLayer`/`EmbedLayer` until the expand animation's `onAnimationComplete`
  fires — but the *sized wrapper* (aspect-ratio based, not content-based) always renders
  immediately, or the tile would measure short, animate to the wrong height, then jump again once
  the heavy content mounted. Both halves matter; see §7 if this needs touching again.

### A step's visual (`StepVisual.tsx`)

A step in `projects.ts` can set `image`, `embed` (HTML animation in an iframe), `video` (plain
looping `<video>`, added 2026-09-21), `model` (.glb), `stack`, or `split: [...]` (several side by
side, model and/or photo). Priority when a step sets more than one:
`split` > `stack` > `model` > `embed` > `video` > `image`. Under reduced motion, always `image`.
Unlike the old pinned-chapter layout, there's no shared cell to crossfade between steps — the
bento tile shows every step's own visual, stacked, all at once, when expanded.

## 5. Current content state

- **All tiles are the same (large) size** since 2026-09-20. Marked `featured` (no longer affects
  size): Cooling Unit, Conveyor Cart, Coffee Cup Gripper.
- **Cooling Unit** — 4 steps, showpiece: 3D model → HTML section animation → CFD plot + strawberry
  flat split → 3D model again + stats. Has a cover model (spins on its tile).
- **Conveyor Cart** — 3D model on step 2 ("Reverse engineering the line") and as the tile cover,
  replacing what had been a plain (low-res) photo there. **Animated (`conveyor-shaft`, 2026-09-21,
  replacing an earlier real model with no motion):** the whole drive-shaft sub-assembly ("Shaft to
  Rotate" — shaft, both handles, locking profiles, collars) turns 90° and back; see §7 "Model
  animations" for the node-name gotcha this one hit and why it's compressed without instancing.
- **Coffee Cup Gripper** — got its real 3D model (2026-09-18) on the first step ("The challenge",
  shown under the text, after the first point); it is also the tile's cover model. The source
  export was 5 MB / 925k triangles → 0.7 MB / 97k after `npm run model` (one unreadable,
  mislabeled texture was dropped, same quirk as the conveyor cart). Its config has `margin: 1.25`
  (see §7, "3D model framing"). The step's `gripper-cad` photo is kept as the reduced-motion
  fallback. If he meant the model to go under the *second* step ("How it works") instead, move
  the `model:` line in `projects.ts`. He may still add an animation later.
- **Small Fixtures & Tooling** — got three 3D models (2026-09-19): shaft removal tool
  (**animated**, `shaft-adapter.glb` — replaced with an animated export 2026-09-21;
  `animation: 'shaft-puller'`: adaptor A pulled in 1.5 in, sleeve down 2 in, sleeve back up,
  adaptor A back out, 0.5 s pause after every move — see §7 "Shaft puller"), saw-cut fixture
  (**animated**, `ptu-gear-cutting-fixture.glb` — replaced
  the earlier static `gear-cutting-fixture.glb` on 2026-09-21; see §7 "Model animations") and
  oiling fixture (**animated**, `oiling-assembly.glb`, from his `Speed_Sensor_Oiling_Assembly`
  "Motion Study" export, replaced 2026-09-21; `animation: 'oiling-sensor'`: the sensor lowers
  1.25 in (31.75 mm) in 1.5 s, holds 0.5 s, raises 1.25 in in 1.5 s, loops forever with no extra
  delay — see §7 "Model animations"). On the first step ("Shaft removal tool", under its bullets)
  they are a `stack`: three full-size boxes (672×504, same as the other projects' models) one
  under another. A row of three at that size can't fit (~890 px of room), and a first attempt
  as a `split` row (2026-09-19) looked too small to him. On the tile cover the same three sit
  side by side, all spinning together on their own; each cover canvas is wider than a third of the
  tile and overlaps its neighbours (`.bento-tile__model--row`) so they draw big, and the cover
  ignores the models' `margin` (tall, narrow canvases don't crop). The saw fixture (`margin: 1.25`)
  and oiling fixture (`margin: 1.35`) need a margin in the step view — a wide, low model gets its
  near edge cropped otherwise. All three have `brightness: 0.5` (he asked for lower lighting on
  2026-09-20, then "lower more" — 0.7 → 0.5; their pale grey parts were washing out to white; the
  value is a multiplier on the shared 0.68 exposure and applies to the cover as well — nudge it if
  he wants darker/lighter).
- **Conveyor shaft (`conveyor-shaft`, 2026-09-21) — read this before touching model animations on
  any file with duplicated parts.** The node to rotate is `Shaft to Rotate` (shaft, both handles,
  locking profiles, collars — the second, mirrored half is a genuine duplicate of the first). His
  first export compressed to a tiny 40-node file: `npm run model`'s default instancing pass
  (`instance({ min: 2 })` in `optimize-model.mjs`) collapsed every repeated part — including both
  shaft halves and dozens of identical roller-assembly screws/bearings — into anonymous
  GPU-instanced batch nodes at the scene root, with per-instance transforms baked into a flat
  buffer instead of named children. `findByBaseName('Shaft to Rotate')` then found nothing to
  rotate but a bare, un-decorated shaft cylinder — the handles etc. would have stayed fixed in
  place while the shaft spun through them. **Fix:** added a `--no-instance` flag to
  `optimize-model.mjs` (skips the `instance()` step) and used it for this model — the file is
  still ~0.6 MB either way, instancing wasn't doing much for *this* one, so there's no downside
  here specifically. Don't assume that holds for every future upload; if a model with genuinely
  massive duplicate-part counts needs both instancing *and* a named-node animation, the fix would
  need to be more targeted (e.g. excluding just that subtree from `instance()`), which the current
  flag doesn't do.
- **Node names three.js actually produces — a second real bug found on the same model.** The
  gltf-transform-based inspector script used to explore these files (a throwaway, not checked in)
  reads *raw* glTF names; **`GLTFLoader` sanitizes every node name before three.js ever sees it**
  (`PropertyBinding.sanitizeNodeName`): whitespace → `_`, and reserved characters
  (`` [ ] . : / ``) are *deleted*, not replaced. Two real bugs from this, both now fixed in
  `modelAnimations.ts`:
  1. `baseName()`'s existing comment already knew spaces become underscores, but the code that
     used it for this model compared against `'Shaft to Rotate'` (a name with real spaces) instead
     of `'Shaft_to_Rotate'` — silently matched nothing (`find` returns `undefined`, not an error).
  2. `dedup()` renames a mesh node it merges with an identical one elsewhere to the full
     slash-joined path it was found at, e.g. `".../Shaft to Rotate_Assembly Updated-1/Shaft-1"` —
     and since `/` is one of the deleted characters, three.js's sanitized version has **no
     separator at all** between the old path segments; splitting on `/` (which worked fine for the
     PTU/oiling models, since their meshes weren't deduped into shared instances) finds nothing.
     Fixed by matching with `.includes()` on the (space-sanitized) leaf name instead of a path
     split — the substring survives even glued onto its former parent's name.
  Both failures were silent (`find()` returns `undefined`, no thrown error) — a `console.warn`
  when the expected nodes aren't found (already the pattern in `gearCutting`/`oilingSensor`) is
  what actually surfaced this; check the browser console first if a new model animation "does
  nothing".
- **Direction, this time from the embedded camera, not the geometry.** Unlike the gear fixture's
  slot, nothing about this shaft assembly is asymmetric enough to read left/right/clockwise from
  the geometry itself. Used the `.glb`'s own `"current camera"` node instead (every SolidWorks
  export carries the viewport that was active when it was exported) — computed its world position
  and forward vector (quaternion × local −Z) and found it sitting well past the shaft's +Z end,
  looking back toward −Z. So +Z points at that viewer, and (same convention as the gear fixture)
  clockwise from there is a **negative** rotation about +Z. If he says it looks backwards, it's one
  sign flip (`SHAFT_TURN`'s sign in `modelAnimations.ts`) — but first check which end of the cart
  he was actually looking from, the same lesson as the gear fixture's direction mix-ups.
  `shaft-adapter.glb` has been replaced twice: 2026-09-20 with a newer static export (the upper
  puller block gained the interlocking notch), then 2026-09-21 with the animated one (see §7).
  Sources 3–15 MB → 0.1–0.7 MB each. In animated mode this replaces the `shaft-puller-photo` photo
  (it was the cover and the step-1 image); the photo now only shows under reduced motion. The
  saw-cut and oiling steps keep their photos. If he'd rather have each model under its own step
  (shaft / saw / oiling), move each into that step as a plain `model`.
- **Shaft puller (`shaft-puller`, 2026-09-21).** Node names (post three.js sanitizing): `Sleeve-1`
  (the slide-hammer sleeve — no spaces, unaffected), `Shaft_Adaptor_A-1` and `Shaft_Adaptor_B-1`
  (the two interlocking halves that grip the shaft — only A moves; B and the shaft body stay
  fixed). Everything stacks along local/world Y (shaft body at the bottom, both adaptors mid,
  sleeve on top), so "sleeve down" is unambiguously −Y — no direction guesswork needed there.
  "Inwards towards the model" for adaptor A was read as *radially, toward the shaft's own vertical
  (Y) axis* — computed at runtime from wherever A's start position actually is (`new
  THREE.Vector2(x0, z0)`, normalized and negated), not a hardcoded direction, so it stays correct
  if a future export repositions the part. This reading was confirmed by a striking coincidence
  worth knowing about: A's start position is *exactly* 1.500000 in from the axis, so moving
  "inward by 1.5 in" lands it precisely at (X=0, Z=0) — landing dead-on like that from an
  independently-specified distance is a strong sign this is the intended motion, not a
  misread axis. Timeline (8 s, then repeats): A in (1.5 s) → 0.5 s pause → sleeve down 2 in
  (1.5 s) → 0.5 s pause → sleeve up (1.5 s) → 0.5 s pause → A out (1.5 s) → 0.5 s pause (loop).
  Verified in world space: A's radial travel is exactly 1.5 in, sleeve's vertical travel exactly
  2 in, both return to their exact start position, every duration matches. Also confirmed
  visually (batch a timeline-seek + screenshot immediately after one another, or the auto-rotating
  camera drifts enough between separate tool calls to make two screenshots look inconsistent even
  when nothing moved — see §6): at 1.5 s the two adaptor halves visibly close from an open
  two-piece fork into one solid block around the shaft, and the sleeve visibly descends over that
  block between 2 s and 3.5 s.
- **Kinder Toy Plane** — got a video (2026-09-21) on its "Process" step: the plane assembly
  exploding apart, from a SolidWorks Motion Study frame sequence he exported himself (841
  `PlaneAssembly-NNNN.tga` frames, 2560×931, 30 fps, 1.1 GB — see §7 "Video pipeline"). The
  existing `plane-exploded` photo on that step is unchanged and is now the reduced-motion
  fallback. Not a tile cover (no cover-video mechanism exists — `coverModels()` only looks at
  `model`/`split`/`stack`; that's a separate model, added next).
- **Kinder Toy Plane, again** — also got a real 3D model (2026-09-21) on its first step ("Idea"),
  which per the usual rule made it the tile cover too, replacing the `plane-photo` cover image
  (that photo is now only the reduced-motion fallback on both the cover and the "Idea" step).
  **Animated (`propeller-spin`):** the propeller spins continuously forever — the only one of the
  five model animations that never stops, reverses, or returns to a start pose. See §7,
  "Propeller spin" for how its (non-axis-aligned) spin axis was found and verified.
- The other 5 projects are photo-only.
- A "Choosing a concept" step existed on Cooling Unit once and was **deleted at his request** — he
  doesn't want to discuss alternative concepts. Don't reintroduce it.

## 6. Environment traps — read before spending time debugging "it doesn't work"

- **The Claude Browser pane pauses rendering (rAF, ResizeObserver, lazy loading) when it isn't the
  actively displayed pane**, and screenshots taken in that state come back blank, stale, or frozen
  mid-animation. This caused repeated false alarms this session — an effect that looked "stuck"
  in a screenshot was often just fine once verified via DOM/JS state directly. **Always check DOM
  state (`getBoundingClientRect`, class lists, element counts) before concluding something is
  broken from a screenshot alone.** Opening a fresh tab and/or taking a screenshot (which seems to
  force a repaint) sometimes "unsticks" it; waiting longer alone often doesn't.
- Cross-checking real behavior sometimes required the user's own report from his actual phone/
  desktop — this pane's limits mean Claude's own testing isn't always sufficient proof, and it's
  fine to say so rather than overclaim.
- **Two separate `computer` screenshot calls, even seconds apart, can show a self-rotating model
  from two different camera angles** (auto-rotate keeps turning in the real wall-clock time each
  tool call takes) — a real, deliberate move (e.g. a part descending) can look reversed or
  unchanged purely from that drift, a false alarm this session hit on the shaft-puller sleeve.
  Trust the measured world-space transform over a pixel comparison across separate calls; if you
  do want a visual check, batch the seek-and-screenshot pairs together (`browser_batch`) to
  minimise the gap between them.
- WebGL canvases can't be copied after their frame unless created with `preserveDrawingBuffer`
  (they aren't here) — don't try to inspect a render by reading canvas pixels.
- Bash heredocs mangle backticks — use the Write/Edit tools for anything containing backticks or
  template literals, not `node -e` through bash.
- `?reduced-motion` on the dev URL previews the reduced-motion layout (dev only).
- **21st.dev free tier: 2 component-code retrievals/day**, resets at UTC midnight. Metadata/search
  is unmetered; only pulling actual code is capped. Hit this limit this session — check
  `npx @21st-dev/cli usage` before planning to pull real code from a component.

## 7. Lessons learned this session — read before touching these again

**Expand/collapse animation: GSAP Flip → Framer Motion, and why**
Multiple rounds of a hand-built GSAP Flip animation (manual `position: absolute`, manual scroll
math) kept producing real, reproducible bugs in the user's own testing even after each was fixed
in isolation (page jumping when switching tiles, wrong scroll targets, a full-page height collapse
mid-transition). After being asked to "redo the 21st animation from scratch," the interaction was
rebuilt on Framer Motion's `layout` + `AnimatePresence` — the actual technique 21st.dev's own
shared-layout card components use, and one specifically designed to keep elements in normal
document flow while animating (rather than faking position via transforms), which sidesteps most
of what GSAP's approach fought with.

**Framer Motion crashed on install — a React version issue, not a code bug**
Installing `motion` and using `layout`/`AnimatePresence` crashed the whole app: "Invalid hook
call," "Rendered more hooks than during the previous render." Confirmed via `npm ls react` that
there was no duplicate React anywhere in `node_modules` — this was a genuine incompatibility
between Framer Motion 13.4.0 and React 19.3.0, which had *just* gone stable (very recent even by
this project's bleeding-edge standards). **Fix: downgraded `react`/`react-dom`/their `@types` to
19.2.8** (the prior stable line). This is a **deliberate, permanent pin** — don't upgrade React
again without first checking Motion's compatibility with whatever version you're moving to.

**Scroll-follow when a tile opens: why a one-shot animated scroll doesn't work**
Switching directly from one open tile to another needs the *previous* tile to finish closing
before the layout the *new* tile's final position depends on is settled — but `AnimatePresence`
keeps the closing tile mounted through its own exit animation (0.35s), so a scroll effect that
fires once and measures the target tile's position immediately catches it **while the old tile is
still tall**, mid-collapse. In a real test this put the computed scroll target off by over 1200px.
**Fix:** `BentoGrid` re-measures the opening tile's position every `requestAnimationFrame` and
re-issues `lenis.scrollTo(target, {immediate: true})`, until the position holds steady for a few
consecutive frames (with a safety time cap). Because the *target* itself is what's animating
smoothly (following Framer's own easing), the resulting scroll motion is smooth too, without
needing its own separate easing curve.
- Measure position via cumulative `offsetTop`/`offsetParent` (a `documentTop()` helper), **not**
  `getBoundingClientRect()` — the latter reflects Framer's presentational transform, which can
  disagree with the true, settled layout position while an animation is in flight.
- Nudge scroll through **Lenis's own `scrollTo`**, not `window.scrollBy`/`scrollTo` — Lenis tracks
  its own animated scroll position separately from the native one; a raw native scroll call gets
  silently overridden on Lenis's next tick.

**3D model framing (`ModelLayer.tsx`) — a real bug found from a user report**
The camera used to frame itself symmetrically around the model's volume-weighted spin centre,
sized to fit whichever of "up" or "down" reached further from that point. For a model whose parts
reach much further one way than the other (the conveyor cart's legs reach far below its centre;
its frame only reaches a little above), that leaves the *shorter* side with wasted headroom instead
of using it — looked like "the model is too low, cut off at the bottom, space at the top."
- **Fix:** decoupled vertical framing from the horizontal. Horizontally, framing must still be
  symmetric around the spin centre — a model's furthest-out horizontal part (e.g. the Cooling
  Unit's towing handle) sweeps a full circle as it turns, so the camera has to fit that whole
  swing regardless of current rotation. Vertically, there's no such swing (turning around a
  *vertical* axis never changes a point's height), so it now frames to the model's true top-to-
  bottom **midpoint** instead, using the frame evenly regardless of how lopsided a model is.
- **A real bug in the first version of that fix:** the framing code derives the camera's *viewing
  angle* as `camera.position - target`. Changing `target`'s Y without also re-seeding
  `camera.position` *offset by that target* skewed the actual viewing angle for any model with a
  non-zero vertical offset — not just the Cooling Unit's cover but its whole apparent orientation
  changed. **Always seed `camera.position` as `fixedDirection.add(target)`**, never as the raw
  fixed vector alone, whenever `target` might be non-zero.

**Two more `ModelLayer` findings from adding the coffee cup gripper (2026-09-18)**
- *Cropped bottom on a wide, low model.* The framing only fits the model's height and swing
  radius, not the camera's downward tilt, so the gripper's near base corner projected below the
  canvas at some spin angles. A strict fit (every part's box corners × every spin angle, with
  perspective) was tried: it wants 30–40% more distance for **all three** models, which would
  visibly shrink the covers he already approved, so it was reverted. Instead `StepModel` has an
  optional `margin` (multiplier on camera distance); the gripper uses 1.25. Use it for any future
  wide/low model that crops.
- *Blank cover after a tile was expanded and closed.* Resizing a WebGL canvas clears it, and a
  still (not spinning) model is only drawn once, so the cover stayed blank until hovered.
  `resize()` now triggers one redraw. This affected every cover model, not just the gripper.

**Model animations (`src/components/visuals/modelAnimations.ts`, added 2026-09-21)**
A model can carry a looping animation of its own moving parts: `animation: 'ptu-gear-cutting'` on
the `StepModel` in `projects.ts`. `ModelLayer` loads `modelAnimations.ts` lazily (~0.8 kB gzip)
once the model is in, creates a paused GSAP timeline (plain timeline, **no ScrollTrigger**), and
plays it only while the model is on screen/visible (`draw()` calls `setPlaying`); every frame is
drawn while it plays. Not created under reduced motion (the model just sits in its start pose).
OrbitControls / auto-rotate are untouched, so visitors can still rotate it freely mid-animation.

**Auto-rotate speed is time-based (2026-09-21).** He reported models spinning fast on his monitor
and slow on his phone. Cause: OrbitControls' `autoRotate` turns a fixed step **per call** to
`update()` unless you pass the elapsed seconds, so speed scaled with the screen's refresh rate
(a 144 Hz monitor spun 2.4× a 60 Hz phone). `ModelLayer.draw()` now passes real elapsed time
(capped at 0.1 s so a hiccup can't jump), and `autoRotateSpeed` is 2 = **12°/s, one turn per 30 s**
(it was 1.2 per-frame, which is 7.2°/s at 60 Hz). Checked by driving the installed OrbitControls at
30/60/144 fps: all give exactly 12°/s (the old way gave 6/12/28.8 at that speed). `frameModel()`
calls `controls.update(0)` so re-framing doesn't nudge the spin. To change the pace, change
`autoRotateSpeed` (one number). The GSAP animation was already time-based. Any other per-frame
animation would have the same problem — use elapsed time.
- **PTU gear-cutting fixture:** the source is a static SolidWorks export (kept in
  `content/models/ptu-gear-cutting-fixture.glb`, compressed with `npm run model`). Nodes after
  export/three's name-sanitising: `Fixture^new_assembly` (never moves), `Moving_Group^new_assembly`
  (ring gear weldment, `Shaft-1`, spline locking shaft), and `Cutter-1` (a thin saw-blade disc;
  there is no separate "Cutter" group). The compressor's instancing pass moved the two static Rib
  Supports out of `Fixture` to a top-level node — harmless. Units are **metres** in the file
  (SolidWorks mm × 0.001). Names are matched on the text before `^`.
- **Directions, derived from the model:** the slot in the back plates is horizontal with its end
  arcs centred at x = ±29.55 mm and the shaft starts at the +X end, so "left" = −X, hence the
  front view looks from +Z toward −Z and "counter-clockwise from the front" = a positive turn about
  +Z. The axle is along Z (shaft is 118 mm long in Z) through the shaft bounding box's centre;
  `Moving_Group` is re-parented into a pivot group there, so it turns about the axle. The module
  warns in the console if the shaft isn't ~118 mm along Z (wrong units/axis).
- **Timeline (11 s, then 0.5 s pause, repeat):** cutter down 33 mm (1.5 s) / hold 0.5 s / up
  (1.5 s) → group slides 59.108814 mm toward −X (1.5 s) then turns **−75.09° about +Z** (1 s) →
  cutter down 35.79 mm / hold / up → group slides back toward +X and turns back to 0° together
  (1.5 s; an unwind). `power2.inOut` on every move.
- **The rule for the turn direction (final, 2026-09-21): sliding RIGHT → COUNTER-clockwise,
  sliding LEFT → CLOCKWISE.** It holds from any viewing side (viewing from the back flips
  left/right and CW/CCW together). In model terms, seen from +Z: slide −X (left) then turn
  clockwise (−75.09°); return slide +X (right) with a counter-clockwise unwind. Seen from −Z (the
  side he was evidently watching from): first slide appears to go right and the turn after it
  counter-clockwise. **History — this took three tries:** his original spec said "slide left, then
  75.09° counter-clockwise as seen from the front" (that is left ↔ CCW, the opposite of the rule).
  He then said "when it moves right it must rotate CCW, currently clockwise"; that was misread as
  being about the return move, which got a 285° CCW spin (reverted). His third message ("rotating
  clockwise after the first slide to the right") showed he meant the *first* slide + turn: from his
  side the first slide appears to go right and the turn after it looked clockwise. The model
  auto-rotates, so left/right/clockwise flip with the viewing angle — **when he describes a
  direction, ask/derive which side he's looking from, or use the view-independent rule above.**
- **Verifying it (dev server only):** `await window.__gearCuttingTest()` in the console runs one
  small move of each part and returns the measured world-space deltas (cutter −5 mm Y, part −5 mm
  X, +15° about +Z). `window.__gearCuttingTimeline` / `__gearCuttingParts` expose the timeline and
  nodes so you can seek (`tl.pause(); tl.time(t)`) and measure. These are stripped from the
  production build (`import.meta.env.DEV`). Result on 2026-09-21: every distance, the 75.09° turn
  and the fixed axle position checked out exactly.
- The cover and the card each run their own copy of the timeline (they aren't synchronised).
- **Oiling sensor (`oiling-sensor`, 2026-09-21):** nodes after export: `Sensor-1` (the only moving
  part, 4 meshes — found by name starting `Sensor-`), `Fixture^Speed Sensor Oiling Assembly`
  (stand, sponge press outer, sponge outer: static) and a stray "current camera". Units are metres
  (stand 70 mm wide; the module warns if not). 1.25 in = 25.4 × 1.25 mm; down = −Y (the parent
  is untransformed, so local Y = world Y). Timeline: down 1.5 s → hold 0.5 s → up 1.5 s = 3.5 s,
  `repeat: -1`, **no** `repeatDelay`, `power2.inOut`. Verified in world space at t = 0/0.75/1.5/
  1.75/2/2.75/3.5: offsets 0, −0.625, −1.25, −1.25, −1.25, −0.625, 0 in. The lowered sensor sits
  inside the sponge ring (that is the point). Its `margin: 1.35` is still needed — 1.2 crops the base
  of the cylinder (tried 1.1 this session and reverted without a visual check; the pane wouldn't
  paint). Dev console: `window.__oilingSensor` = `{ timeline, sensor }`.

**Model compression script (`scripts/optimize-model.mjs`) — two real fixes for a non-SolidWorks source**
The conveyor cart's uploaded `.glb` wasn't a plain SolidWorks export like the Cooling Unit's, and
broke the pipeline twice:
1. It's Draco-compressed. Added a `draco3d.decoder` dependency (package: `draco3dgltf`) to read
   it, and explicitly disposes the `KHR_draco_mesh_compression` extension after reading — geometry
   is already decoded to plain arrays by then, and without dropping the extension marker the
   writer tries to *re-encode* with Draco (needing an encoder we don't otherwise use) instead of
   the meshopt encoding the rest of the pipeline expects.
2. Two of its materials' normal maps are raw **DDS texture data mislabeled as `image/png`**
   (confirmed by checking the actual bytes: `44 44 53 20` = "DDS "). Neither gltf-transform's own
   size reader nor `sharp` can parse that; `textureCompress` crashed trying to resize to the
   bogus `[131072, 0]` gltf-transform's reader produced. The script now checks each texture's real
   bytes against its declared MIME type before compressing, and drops (with a console warning) any
   texture that doesn't match, unassigning it from whatever material slot pointed to it. The model
   keeps its geometry and base colors; it just loses that one (unreadable anyway) detail map.
3. Added a `--no-resize` flag as a general escape hatch for sources with unreliable texture-size
   metadata, independent of the above.
If a future upload from a *different* tool breaks the pipeline again, check for these same two
patterns (Draco compression, mislabeled texture format) before assuming something new is wrong.

**The HTML section animation (`public/animations/cart-section.html`)**
User-authored in his own tool, uploaded as a full file each time (not something Claude edits
directly). **Important: each fresh export from his tool is a plain, undecorated file** — white
background, default font, whatever labels/sizing his tool currently produces. Before treating a
new upload as broken or unfinished, diff it against what's currently deployed — geometry-wise it's
often identical, and the only real gap is the site-specific treatment below, which needs
reapplying every time:
- `html,body { background: ... }` must match **`--surface` (`#14161f`), not `--bg` (`#090a0f`)** —
  the embed sits inside a `.step-visual` panel (which is `--surface`-coloured), not directly on
  the page background. Getting this wrong shows as a visible dark box around the animation.
- `font-family` should match the site body font exactly: `system-ui, -apple-system, 'Segoe UI',
  Roboto, sans-serif` (not a close-but-different stack).
- **Do NOT overwrite his own centering, font sizing, or which labels appear** — he now does this
  himself in his own tool and it's deliberate; a past mistake was silently replacing his choices
  with older site-tuned values. Only touch background color and font-family unless he asks for
  more.
- Still needed, added back on top of his file each time (invisible, technical, not a design
  choice): the path-sampling lookup table (`pointAt()` — avoids a real ~25ms/frame cost from
  calling `getPointAtLength` every frame) and the `window.__setPaused` API (`EmbedLayer` calls this
  to pause the animation while it's not the active/visible step).
- Bump `?v=N` on the embed URL in `projects.ts` after any edit, or browsers serve the cached file.
  Currently at `?v=8`.

**Tile micro-interactions and accessibility**
`.bento-tile__hit` uses `all: unset` (to strip default button styling), which **silently also
stripped the native keyboard focus outline** — there was no visible focus indicator at all for
keyboard users beyond the same faint scrim-darkening as hover. Fixed with an explicit
`outline: 2px solid var(--accent); outline-offset: -2px;` on `:focus-visible`. Worth checking for
this same silent side effect anywhere else `all: unset` gets used.

**Video pipeline (`scripts/optimize-video.mjs`, `VideoLayer.tsx`) — added 2026-09-21, first use:
Kinder Toy Plane**
He dropped an 841-frame SolidWorks Motion Study export (`PlaneAssembly-0000.tga` … `-0840.tga`,
2560×931, 30 fps he stated directly, RLE-compressed TGA — 1.1 GB total) straight into
`public/animations/`, which would have committed 1.1 GB of raw frames to git if left there.
- **Moved the raw sequence to `content/animations/toy-plane/`** (new gitignore rule, mirroring
  `content/models/`) before doing anything else — treat any large raw asset a user saves into
  `public/` this way as a mistake to fix immediately, not a place to build from.
- **No system ffmpeg in this environment.** Added `ffmpeg-static` (a devDependency that bundles a
  prebuilt binary — `npm install` printed an `allowScripts` warning about its postinstall script,
  but the binary was already present at `node_modules/ffmpeg-static/ffmpeg.exe` and ran fine;
  didn't chase the warning further). `optimize-video.mjs` calls it directly via
  `execFileSync`, the same style `optimize-model.mjs` uses for its own tools.
- **Output format: H.264 in an MP4 container, not WebM.** One `<source>`, no fallback needed —
  MP4/H.264 is the one thing every target browser (including iOS Safari) plays natively. Encoded
  at `--width 1280` (half the 2560 source) and `crf 23`: the 1.1 GB sequence became a 1.3 MB
  video. `-movflags +faststart` so playback can start before the whole file has downloaded;
  `-an` since this is a silent, muted, autoplaying loop like every other animation on the site,
  not a video with sound.
- **The frame-number pattern is read from the files themselves** (`^(.+?)(\d+)\.tga$` on the
  first sorted filename), not hardcoded — `PlaneAssembly-0000.tga` gives ffmpeg the pattern
  `PlaneAssembly-%04d.tga` and `-start_number 0` automatically. A future sequence with a
  different name or digit count needs no script changes.
- **`VideoLayer.tsx` mirrors `EmbedLayer.tsx`** exactly: `<video muted loop playsInline
  preload="metadata">`, played/paused by an `active` prop (same `useOnScreen` IntersectionObserver
  gating everything else already uses), reusing the `.photo-visual__frame` CSS class an iframe
  also uses (`object-fit: contain` was added to that shared rule — a no-op for an iframe, but
  letterboxes a video whose aspect ratio doesn't match the 4:3 box, which this one, at roughly
  2.7:1, very much doesn't).
- **A real environment trap, not an app bug: repeatedly hot-reloading `BentoGrid.tsx` while a tab
  stayed open left `AnimatePresence`'s `onAnimationComplete` silently never firing again** — even
  for tiles/content that had nothing to do with the edit (re-tested cooling-unit, unrelated to the
  video work, and it broke too). Cost real time debugging what looked like a video-specific bug
  (`ready` stuck `false`, nothing ever mounted) before realizing it reproduced identically on
  totally unrelated content. **A genuinely fresh tab (`tabs_close` + `tabs_create` +
  `navigate`), not `location.reload()` on a tab that's had source edits hot-reload into it
  mid-session, is the only reliable way to test a `ready`/animation-gated feature after editing
  the component that gates it.** `location.reload()` alone was NOT enough to reset the stuck
  state in this session, even though it's a real navigation.
- Verified: `readyState: 4` (fully loaded) and playing once mounted, `paused` toggles correctly on
  scroll in/out, reduced motion mounts no `<video>` at all and shows the existing `plane-exploded`
  photo instead, and a screenshot mid-playback visibly shows different frames a few seconds apart
  (parts in different positions) — real playback, not a frozen poster.

**Propeller spin (`propeller-spin`, 2026-09-21) — a continuous spin, and finding an axis that
isn't aligned to anything**
His `Kinder_Toy_Plane_Model.glb` is a single flat node list (25 meshes, no sub-assembly grouping)
under a root `PlaneAssembly` node — `Propeller-1` is one rigid mesh among them, nothing else on
the model moves. Compressed with the *default* settings (instancing is fine here — it only
merged the 4 wheels/legs into batches, `Propeller-1` stayed its own untouched node; confirmed by
re-reading the compressed file before wiring anything up, the same check that caught the
conveyor-cart instancing problem last session).
- **This is the first *continuous* model animation** — the other four all move to a pose, hold,
  and return; this one spins forever with no start/end pose to get backwards. So no "does it
  match the spec" direction check applies the way it did for the others — only "is it spinning
  about the right axis, in place, without disturbing where the propeller sits."
- **The node's own placement isn't axis-aligned**, and neither is the mesh's own geometry in its
  local (pre-placement) space — there's no clean world- or even local-axis spin direction to read
  off a bounding box the way the earlier animations could. Found the true spin axis by computing
  the **standard deviation of the propeller mesh's own vertex positions along each local axis**
  (not just min/max range, which a tapered blade can make misleading): local Z had by far the
  widest spread (~0.027, the blade span/sweep direction), local X was next (~0.008, the blade's
  chord/width), and local Y the narrowest (~0.006) — the direction perpendicular to the flat
  blade plane, i.e. the hub axis a real 2-blade prop turns on. Used local **Y**.
- **To spin "in place" without disturbing the mounted orientation**, the node's original
  (placement) quaternion is captured once and kept fixed; every frame,
  `propeller.quaternion.copy(placement).multiply(spinQuaternion(angle))` — the spin is applied
  *before* the placement (right-multiplied), i.e. it happens in the propeller's own pre-mount
  frame, then that spinning propeller gets placed at its mounted angle — not the same thing as
  spinning about a world or even the node's *current* local axis, which would slowly drift the
  mounting angle itself if done via repeatedly incrementing `.rotation.y`/similar Euler math
  instead of quaternion composition.
- Driven by a GSAP tween of a plain `{ angle: 0 → 2π }` value with `repeat: -1`, `ease: 'none'`
  (constant angular speed, not eased — matches a motor, not a bounce) and an `onUpdate` doing the
  quaternion math above — a different shape from the other four animations' `gsap.timeline().to()`
  chains on `.position`/`.rotation` directly, since composing quaternions isn't something a plain
  property tween can do. 1.25 rotations/second (one lap every 0.8 s) is an arbitrary, easily
  adjusted choice (the constant is commented) — picked slow enough to read clearly as spinning
  rather than blurring/strobing on screen, not because of anything mechanically meaningful.
- **Verified by seeking the timeline** (`tl.pause(); tl.time(t)` at t = 0, 0.1, 0.2, 0.4, 0.6,
  0.8 s — the same deterministic technique used for every other animation, more reliable here
  than real-time playback given the pane's rAF throttling, see the environment-trap note above):
  the quaternion changes smoothly across those samples, `propeller.position` never changes at
  all (confirms it only spins, doesn't wander), and at t = 0.8 s (one full lap at 1.25 rev/s) the
  quaternion is the exact negation of its t = 0 value component-wise — a quaternion and its
  negation represent the identical rotation, so this confirms the loop returns to exactly the
  start orientation with no seam or drift.

## 8. Known issues / debts

1. **Cleaned up (2026-09-18):** the pinned-chapter code is gone — `Chapter.tsx`,
   `ProjectCard.tsx`, `visuals/{index,types,PhotosVisual,PlaceholderVisual}`, `lib/progress.ts`,
   the `visual` config field and ~400 lines of unused `site.css`. `CLAUDE.md` was rewritten for the
   bento architecture the same day. `<main>` in `App.tsx` still gets `site` / `is-animated`
   classes; nothing styles them any more (harmless, remove if you touch that file anyway).
2. **The `gallery` photos on Small Fixtures & Tooling are never displayed.** The old grid card
   showed them; the bento tile only uses `gallery` as cover candidates, so its four CAD/drawing
   images (`shaft-puller-cad`, `shaft-puller-drawing`, `saw-fixture-cad`, `oil-fixture-cad`) are
   invisible on the site. Decide with the user whether to show them (e.g. as extra steps, or a
   gallery row in the expanded tile) or drop them.
3. **Three photos are still low-resolution**, extracted from his PDF: `hydraulic-hand/
   part-drawing`, `reef-rover/collection-mechanism`, `coffee-cup-gripper/built-gripper`.
   (`conveyor-cart/shaft-assembly-render` was the fourth — resolved this session by the new
   conveyor cart model, though the low-res photo file itself is still there as the reduced-motion
   fallback.) **He'll send replacement photos as the site gets finalized** — don't chase him for
   these, wire them in when they arrive.
4. **Reduced-motion layout has never been seen in a real browser** — only via the dev flag and DOM
   checks. Worth a real check with the OS setting on, especially given how much changed this
   session.
5. **No Lighthouse/field performance run** has been done on the bento grid version. The always-
   mounted cover models (see §4) are a new, not-yet-measured cost on top of the existing 3D chunk
   and image weight. There are now **six live WebGL canvases on the page at load** (cooling unit,
   conveyor cart, gripper, and the three fixtures), plus more while a tile is open. Browsers cap
   active WebGL contexts (~16), and phones are the worry — measure before adding more cover models.
6. `split` (visuals in one row) supports N items and mixed photo/model; only Cooling Unit's 2-photo
   CFD step uses it now (a row of only models gets a wider box, `0.9 × count : 1`, in
   `StepVisual`; `.step-visual--split .model-layer` resets `grid-area` so models don't stack).
   `stack` (visuals one under another, each full size) is what Small Fixtures uses. A tile cover
   shows all models of its first model/split/stack step (`coverModels()` in `BentoGrid.tsx`).
   Observed, not caused by this work: on a phone (DPR 2) every model box is 294×455 rather than
   4:3 — taller than on desktop. All model boxes behave the same, so nothing looks inconsistent.
7. The conveyor-cart photo `handle-installed` is converted but unused.
8. The `motion` package added ~30 KB gzip to the main bundle; not code-split, since the expand
   interaction is core to every page view (unlike the 3D/GLTF chunk, which only loads once a model
   is actually needed).

## 9. What's actually next (not open questions — these are decided, just not done)

- **Coffee Cup Gripper animation (optional):** the 3D model is in (§5). If he later makes an
  animation, wire it in the same way as the others.
- **Remaining low-res photos:** he'll send replacements as the site gets finalized (see §8.3).
- **Custom domain:** deliberately the **final** step, once everything else is done. Don't raise it
  early.
- **Replace `qtaha@uoguelph.ca`:** he'll do this eventually, before graduating. Not urgent, no
  action needed unless he brings it up.
- **Scroll-scrubbed SolidWorks image sequences** (from the original brief): **decided against —
  he will not be doing this.** Don't suggest it or plan for it; 3D models/animations are the
  path for CAD visuals now, not image sequences.
- **Decide what to do with the hidden `gallery` photos** (§8.2) — needs his call.
- **Real-browser checks:** reduced-motion layout (§8.4) and a Lighthouse/mobile performance run
  (§8.5). Neither has been done on the bento version.
