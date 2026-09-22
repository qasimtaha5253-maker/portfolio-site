# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold. Read `CLAUDE.md` first
(project rules, architecture, stack) — this doc is the "how we got here and what to watch for"
companion to it, not a replacement.

Last updated: 2026-09-21. This is a condensed rewrite — a full session-by-session history existed
before this and was trimmed; nothing load-bearing was cut, but if something here seems to skip a
step, check the git log (`git log --oneline`) rather than assuming it was missed.

---

## 1. What this is, and where it lives

Single-page portfolio for Qasim Taha, final-year Mechanical Engineering co-op student at the
University of Guelph. 10 projects, defined in one config file, rendered as a bento grid: every
project is a same-sized tile; tapping one expands it in place to show its steps.

- **Live:** https://portfolio-site-qasim-1db5.vercel.app/ — Vercel auto-deploys on push to `main`
  (can take several minutes to actually publish; don't assume a push failed just because the live
  site hasn't updated yet).
- **Repo:** https://github.com/qasimtaha5253-maker/portfolio-site — work directly on `main`.
- **Local:** `C:\Users\qasim\Documents\portfolio-site` (moved off OneDrive on purpose — don't move
  it back, OneDrive syncing `node_modules` caused file locks).
- **Old versions, tagged, not deleted:** `pinned-chapter-version` (the block-by-block scrollytelling
  layout the bento grid replaced), `vanilla-js-version` (the original pre-React build).

## 2. How the user works — read this before doing anything else

- He gives direction; you write all the code and explain anything he must do himself in plain
  terms — **he is not a web developer**, so no unexplained jargon.
- **Push automatically once a change builds and passes checks, then report what went live.** Don't
  sit on finished work waiting for approval — this has been the working pattern for the whole
  project and he's explicitly asked for it.
- He describes symptoms precisely ("the screen moves up and down when...", "cropped at the
  bottom, space on top") — reproduce *exactly* what he describes rather than guessing at a
  nearby-sounding bug, and expect pushback, correctly, if a fix doesn't match what he's actually
  seeing on his own device.
- He's comfortable with real changes when they're the right fix (new libraries, downgrading a core
  dependency) as long as the reasoning is explained, and isn't precious about existing code — when
  an approach kept fighting back after honest attempts, "undo everything and start from scratch"
  was the right call once, and will be again if it comes to that.
- **Report honestly, including what couldn't be verified.** See §5's Browser-pane caveats — this
  environment's testing has real limits and he already knows it; say so rather than overclaiming.
- He uploads 3D models and frame sequences as files from his own tools (SolidWorks Motion Study
  exports, mostly), usually from `Downloads\Motion Study\`. He describes the motion he wants in
  plain terms ("moves inwards by 1.5 in", "rotated on its side, fix it") — see §4 for how to turn
  that into working code without guessing.

## 3. Commands

```
npm run dev          # dev server, exposed on the LAN (he opens it on his phone)
npm run build         # tsc -b (TypeScript 7) then vite build — run before every push
npm run typecheck     # tsc -b only
npm run images        # content/photos/** -> public/projects/**/*.webp (deletes orphaned output)
npm run model  -- <in.glb> <out.glb> [--ratio 0.2] [--no-resize] [--no-instance]
npm run video  -- <frames-dir> <out.mp4> [--fps 30] [--width 1280] [--crf 23] [--poster]
```

- `--no-instance` (on `npm run model`) skips GPU-instancing repeated parts. Needed whenever a
  model's built-in animation looks up a part by name and that part is duplicated elsewhere in the
  file — instancing collapses duplicates into anonymous nodes with nothing left to find by name.
  Costs little to nothing in file size in practice so far; default to trying *without* it first,
  re-read the compressed file to confirm the part you need is still a named node, and only add the
  flag if it isn't.
- `npm run video` needs no system ffmpeg — it uses the bundled `ffmpeg-static` binary. Always
  encodes H.264/MP4 (not WebM): the one format that plays natively everywhere, including iOS
  Safari, so there's never a second `<source>` to maintain.
- Windows: a killed background `npm run dev` can leave vite still holding port 5173 — find it with
  `Get-NetTCPConnection -LocalPort 5173` and stop that process.

## 4. Architecture

Vite + React 19.2.8 (**pinned on purpose** — Framer Motion 13.4.0 crashes on React 19.3.0+;
check Motion's compatibility before ever bumping React) + TypeScript + Tailwind v4, shadcn layout
(`@/` → `src/`).

```
index.html                     shell, <html class="dark">
src/main.tsx → src/App.tsx     Intro, About, BentoGrid, footer
src/data/projects.ts           THE content file — every project's copy, photos, models, animations
src/data/types.ts              field docs for the above — read this before adding a new field
src/components/
  BentoGrid.tsx                the grid: tiles, expand/collapse, scroll-follow, self-spinning covers
  StepVisual.tsx                a step's own visual inside an expanded tile
  Photo.tsx                    responsive WebP <img>
  StepContent.tsx              body / stats / bullets
  sections/                    Intro (canvas), About, ContactLinks
  ui/helix-chrono-matrix.tsx   user-supplied intro canvas
  visuals/
    ModelLayer.tsx             Three.js .glb viewer (see §4b)
    modelAnimations.ts         per-model built-in animations (see §4b)
    EmbedLayer.tsx             HTML animation in an iframe
    VideoLayer.tsx             plain looping <video>
src/hooks/                     useMotionAllowed, useSmoothScroll (Lenis), useScrollFade
src/styles/site.css            all site CSS, in @layer base/components
content/photos/<project>/      source images (committed)
content/models/                source .glb (GITIGNORED — can be huge)
content/animations/<name>/     source frame sequences, e.g. .tga (GITIGNORED — can be 1 GB+)
public/projects/, public/models/, public/animations/   generated/served assets (committed, small)
scripts/optimize-model.mjs     .glb -> compressed .glb
scripts/optimize-video.mjs     numbered frame sequence -> compressed .mp4
```

**The bento tile mechanic:** every project is the same size tile (`grid-column: span 2`,
`grid-row: span 2` — the `featured` field in `projects.ts` no longer does anything, kept in case
size tiers come back). Tapping one expands it in place; the expand/collapse animation is **Framer
Motion, not GSAP** (`motion.article` + `layout`, `AnimatePresence` for the detail panel) — a
deliberate choice after a hand-built GSAP Flip approach kept producing real, reproducible bugs.
Opening or switching tiles also **scroll-follows**: `BentoGrid` re-measures the opening tile's
position every frame and re-issues `lenis.scrollTo(..., {immediate:true})` until it holds steady,
because a one-shot scroll measured mid-transition lands in the wrong place (`AnimatePresence` keeps
the *previous* tile mounted through its own exit animation). Heavy visuals (models, embeds, video)
wait for the expand animation's `onAnimationComplete` before actually mounting (`ready` prop), so
loading them doesn't compete with the animation for frames — but the *sized wrapper* always renders
immediately, or the tile measures short and jumps once the real content arrives.

**A step's visual:** `image`, `embed` (HTML animation, iframe), `video` (plain `<video>`), `model`
(.glb), `stack` (several full-size, stacked), or `split` (several side by side, smaller). Priority
when more than one is set: `split` > `stack` > `model` > `embed` > `video` > `image`. Reduced
motion always shows `image` regardless of what else is set — always keep a step's original photo
even after adding a model/video/embed to it, as the fallback.

**Cover images:** a project's tile cover comes automatically from its first step with a model (or
`split`/`stack` of models) — `coverModels()` in `BentoGrid.tsx`, no per-project code needed. Cover
models **spin on their own**, not on hover, pausing while their tile is open or scrolled
off-screen, still under reduced motion.

### 4b. Model animations, and how to build one without guessing

`StepModel` (in `projects.ts`) can carry a built-in animation via `animation: '<name>'`, run by
`src/components/visuals/modelAnimations.ts` — a plain GSAP timeline (**no ScrollTrigger**), lazily
loaded, only playing while the model is on screen, off entirely under reduced motion. Five exist
today: `ptu-gear-cutting`, `oiling-sensor`, `conveyor-shaft`, `shaft-puller` (all move to a pose,
hold, and return), and `propeller-spin` (the one exception — spins forever, never stops/reverses).
Each is a case in `createModelAnimation()`; add a new one there plus a name in
`ModelAnimationName` (`types.ts`).

**The recipe that's worked every time, across five different files, five different requested
motions, and one orientation fix** — don't skip steps, each one has caught a real bug in practice:

1. **Copy the uploaded file into `content/models/<name>.glb`, never `public/`.** He sometimes
   drops raw exports straight into `public/animations/` or similar — if a large raw asset ever
   lands in `public/`, that's a mistake to fix immediately (move it to the matching `content/`
   folder), not a place to build from, or it ends up committed to the repo at full size.
2. **Inspect the raw node tree first**, with a throwaway script using `@gltf-transform/core`'s
   `NodeIO` (reads raw glTF names/transforms/bounds — *not* what three.js will actually load, see
   step 4). Find the part(s) that need to move by name, and read their transforms/bounding boxes.
3. **Never guess a direction or axis from the node's placement transform or from eyeballing a
   screenshot.** Every real bug in this project's model animations came from skipping this:
   - **Find axes from the geometry itself**, not assumptions. A spin axis is usually the direction
     with the *narrowest spread* of the mesh's own local vertex positions (not just min/max
     range — a tapered part can make range misleading; use standard deviation per axis).
   - **A "which way is up" question** (the Meccano car) can be answered the same way: find one
     part that's rigidly constrained to one axis (wheels spinning = their axle axis is fixed),
     derive a second axis from two named parts that should differ along it (front vs. rear axle),
     and resolve the sign of the third (true "up") by checking which side something unambiguous —
     electronics mounted on a deck, a roof — sits on. `THREE.Quaternion().setFromUnitVectors(...)`
     gives the minimal correction with no unwanted twist (twist doesn't matter; the camera
     auto-rotates regardless of which way the model initially faces).
   - **A described direction ("clockwise", "moves right") is relative to a specific viewing
     angle**, and the model auto-rotates, so ask which side he was actually looking from, or find
     something in the file itself to anchor it — the `.glb`'s own embedded `"current camera"` node
     (every SolidWorks export carries the viewport that was active on export) is a reasonable
     proxy when the geometry gives no better cue.
4. **Match node names as three.js will actually produce them, not as the raw file has them.**
   `GLTFLoader` sanitizes every name on load: whitespace → `_`, and `[ ] . : /` are **deleted**,
   not replaced. Two real, silent (`find()` → `undefined`, no thrown error) bugs came from this:
   comparing against a name with un-sanitized spaces, and assuming a slash-joined path (which
   `dedup()` produces for a merged/deduped mesh) survives as separate segments — it doesn't, the
   segments end up glued together with no separator. Match with `.includes()` on a sanitized
   substring, not a path split or an un-sanitized literal.
5. **Compress with `npm run model` and re-read the output before wiring anything up.** Try default
   settings first; if the part you need to animate has vanished into an anonymous instanced batch
   node, add `--no-instance` and recompress.
6. **Verify by seeking the GSAP timeline** (`tl.pause(); tl.time(t)` at several points), not by
   watching real-time playback or comparing screenshots taken moments apart — see §5, the
   Browser pane's rAF throttling and the self-rotating camera both make real-time/screenshot
   checks unreliable here in ways that look exactly like a real bug but aren't. Check exact
   distances/angles at key times, and that the pose returns exactly to the start (or, for a
   continuous spin, that one full lap returns to the exact start orientation).
7. **A resize wipes the WebGL canvas**, and a still (non-spinning) cover model only draws once —
   `ModelLayer.resize()` redraws after every resize, or a cover goes blank after its tile opens
   and closes. Already fixed; don't reintroduce the bug if touching that code.

**Other `ModelLayer` config knobs**, all on `StepModel`:
- `margin` — multiplier on camera distance, for a wide/low model whose near edge crops as it
  spins (the auto-framing fits height and horizontal swing radius, not the camera's downward
  tilt). Try 1.2–1.35 first.
- `brightness` — multiplier on the shared tone-mapping exposure (0.68 default), for a model whose
  pale parts wash out to white.
- `rotation` — `[x, y, z]` Euler degrees, a one-time correction applied before centring/framing,
  for a source export that wasn't saved upright (see the Meccano car recipe above).
- Auto-rotate is **time-based** (12°/s, `controls.update(elapsedSeconds)`), so it's the same speed
  regardless of the viewer's screen refresh rate — this was a real, reported bug (spun 2.4× faster
  on a 144 Hz monitor than a 60 Hz phone) before it was fixed. Any future per-frame animation needs
  the same treatment: always pass elapsed time, never a fixed per-frame step.

## 5. Environment traps — read before spending time debugging "it doesn't work"

- **The Browser pane pauses rendering when it isn't the actively displayed pane** — screenshots
  come back blank, stale, or frozen mid-animation. Check DOM/JS state directly
  (`getBoundingClientRect`, class lists, element counts, or seeking a GSAP timeline) before
  concluding something is broken from a screenshot alone. A fresh tab and/or a screenshot
  (which seems to force a repaint) sometimes unsticks it; waiting longer alone often doesn't.
- **Two screenshots taken even seconds apart can show a self-rotating model from different camera
  angles**, making a real, correct move look reversed or unchanged. Trust a measured world-space
  transform over a pixel comparison across separate tool calls; if a visual check matters, batch
  the seek-and-screenshot pairs together (`browser_batch`) to minimize the gap.
- **Repeatedly hot-reloading a component that gates content behind `ready`/`onAnimationComplete`
  (e.g. editing `BentoGrid.tsx`) while a tab stays open can leave that gate permanently stuck**,
  even for unrelated content on the same page — reproduced identically on a totally different
  tile than the one being worked on. `location.reload()` alone did not reliably clear this. A
  genuinely fresh tab (close + create + navigate) is the only reliable fix once it's happened.
- WebGL canvases can't be pixel-inspected after their frame (no `preserveDrawingBuffer`) — don't
  try to verify a render by reading canvas pixels.
- Bash heredocs mangle backticks — use the Write/Edit tools for anything with backticks or
  template literals, not `node -e` through bash.
- `?reduced-motion` on the dev URL previews the reduced-motion layout (dev only).
- Cross-checking real behavior sometimes needs his own report from his actual phone/desktop —
  this environment's testing isn't always sufficient proof, and it's fine to say so.

## 6. Current content state

All 10 projects, current visuals:

| Project | Visual | Notes |
|---|---|---|
| Cooling Unit | model → embed → split photos → model + stats | showpiece, 4 steps; cover model |
| Conveyor Cart | model, **animated** (`conveyor-shaft`) | drive shaft turns 90° and back; cover model |
| Coffee Cup Gripper | model | no animation yet — optional, he may send one later |
| Small Fixtures & Tooling | 3 models, all **animated**, `stack`ed | shaft puller (`shaft-puller`), saw fixture (`ptu-gear-cutting`), oiling fixture (`oiling-sensor`); all `brightness: 0.5`; cover shows all 3 side by side |
| Kinder Toy Plane | model, **animated** (`propeller-spin`, continuous) + video on "Process" (assembly exploding apart) | cover comes from the model step |
| Meccano Car Ball Launcher | model, orientation-corrected (`rotation`) | needed the up-axis correction recipe in §4b |
| ANSYS Stress Analysis, Autonomous Reef Rover, Reverse-Engineered Hydraulic Hand, Spring-Loaded Oiling Tool | photo-only | no models sent yet |

Every model/video step keeps its original photo as the reduced-motion fallback. A "Choosing a
concept" step existed on Cooling Unit once and was **deleted at his request** — don't reintroduce
it, he doesn't want to discuss alternative concepts.

Three photos are still low-resolution (PDF-extracted): `hydraulic-hand/part-drawing`,
`reef-rover/collection-mechanism`, `coffee-cup-gripper/built-gripper`. **He'll send replacements
as the site gets finalized — don't chase him for these.**

## 7. Known debts

- No Lighthouse/field performance run has been done. There are now **eight-plus live WebGL
  canvases on the page at load** (every project with a cover model, several projects have more
  than one), plus more while a tile is open. Browsers cap active WebGL contexts (~16) — measure
  phone performance before adding more cover models, and keep this in mind if a future project's
  cover would push the count much higher.
- Reduced-motion layout has never been checked in a real browser with the OS setting on, only via
  the dev flag and DOM checks.
- The `motion` package adds ~30 KB gzip to the main bundle, not code-split (the expand interaction
  is core to every page view, unlike the 3D chunk which only loads once a model is needed).
- On a phone (DPR 2), model boxes render taller than the desktop 4:3 (294×455 observed) — not
  inconsistent (every model box does this the same way), just worth knowing if it comes up.

## 8. What's next

**His stated priority, in this order — start here:**
1. **Resize and reorder the cover cards.** Not yet scoped — ask him what sizes/order he has in
   mind before starting (the grid is currently 4 tiles wide, all tiles the same size at
   `grid-column: span 2` / `grid-row: span 2`; reordering is just reordering the `projects` array
   in `projects.ts` unless he wants something more structural).
2. **Fix the template inside the cards.** Also not yet scoped — ask what specifically looks wrong
   (layout, spacing, which projects) before making changes; don't guess at a "nearby-sounding" fix
   (see §2).
3. **Update photos and videos.** Likely the remaining low-res photos (§6) and/or new
   models/animations for the photo-only projects — confirm which before starting.
4. **Rewrite the bullet points for each project.** Copywriting pass across `projects.ts` — ask if
   he has new source material (an updated PDF/résumé) or wants a rewrite of the existing text, and
   whether tone/length constraints from the original brief ("keep steps short") still apply.

**Already decided, not yet done:**
- Custom domain — deliberately the **final** step once everything else is done. Don't raise it
  early.
- Replace `qtaha@uoguelph.ca` — he'll do this himself before graduating, no action needed unless
  he brings it up.
- Coffee Cup Gripper animation — optional, only if he sends one.
- Remaining low-res photos — he'll send replacements, don't chase him.
- Scroll-scrubbed SolidWorks image sequences (from the original brief) — **decided against, he
  will not be doing this.** 3D models/animations are the path for CAD visuals now.
