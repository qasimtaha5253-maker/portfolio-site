# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold. Read `CLAUDE.md` first
(project rules, architecture, stack) — this doc is the "how we got here and what to watch for"
companion to it, not a replacement.

Last updated: 2026-09-22. This is a condensed rewrite of a rewrite — a full session-by-session
history existed before this and was trimmed twice now; nothing load-bearing was cut, but if
something here seems to skip a step, check the git log (`git log --oneline`) rather than assuming
it was missed. **Section numbers changed in this pass** — CLAUDE.md's own cross-references
("see handoff.md §7...") were written against an even older numbering and had drifted; they're
realigned to this version's §7, so trust the numbers in *this* file over memory of an older one.

---

## 1. What this is, and where it lives

Single-page portfolio for Qasim Taha, final-year Mechanical Engineering co-op student at the
University of Guelph. 10 projects, defined in one config file, rendered as a bento grid: every
project is a same-sized tile; tapping one expands it in place to show its steps. An Experience
section (work history, stacked cards) sits in the About area, above the grid.

- **Live:** https://portfolio-site-qasim-1db5.vercel.app/ — Vercel auto-deploys on push to `main`
  (can take several minutes to actually publish; don't assume a push failed just because the live
  site hasn't updated yet — see §5 for how to actually confirm what's live instead of guessing).
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
  project and he's explicitly asked for it. The one exception seen so far: he asked for a handoff
  doc and explicitly wanted clarifying questions *before* the rewrite, not after — see the next
  bullet.
- For a large or ambiguous ask, a short batch of up-front clarifying questions (via whatever your
  tool's equivalent of `AskUserQuestion` is) is welcomed, not seen as friction — he answered a
  4-question batch in one shot without pushback. Don't guess at scope on something like "rewrite
  X" or "send me Y" when a quick question would remove the guesswork.
- He describes symptoms precisely ("the screen moves up and down when...", "cropped at the
  bottom, space on top") — reproduce *exactly* what he describes rather than guessing at a
  nearby-sounding bug, and expect pushback, correctly, if a fix doesn't match what he's actually
  seeing on his own device.
- He's comfortable with real changes when they're the right fix (new libraries, downgrading a core
  dependency, reworking a layout, swapping an approach mid-stream) as long as the reasoning is
  explained, and isn't precious about existing code.
- **Report honestly, including what couldn't be verified.** See §5's Browser-pane caveats — this
  environment's testing has real limits and he already knows it; say so rather than overclaiming.
  This came up a lot in practice: several turns had long stretches of blank/frozen screenshots,
  and the honest move was leaning on DOM/computed-style checks and saying plainly what a
  screenshot did and didn't confirm.
- He uploads 3D models, images and frame sequences as files from his own tools (SolidWorks Motion
  Study exports, phone photos/screenshots, mostly), usually from `Downloads\Motion Study\` or via
  the chat upload path (`C:\Users\qasim\.claude\uploads\...` — a one-off temp location per
  attachment, not a folder to treat as permanent storage). He describes the motion or change he
  wants in plain terms ("moves inwards by 1.5 in", "rotated on its side, fix it", "make the
  fixture transparent") — see §7 for how to turn that into working code without guessing.
- **He iterates on 3D content in small follow-up steps**, not one big spec up front: a model gets
  added, then he asks to tweak its framing, then add transparency, then swap in an updated export,
  then add a second (differently-configured) instance of the same model for an exploded view. Each
  of those was a separate, short request. Expect this pattern to continue — build the generic,
  reusable `StepModel` knob (see §7) rather than a one-off hack, since the next ask is often "now
  do a variant of that."

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
  model's built-in animation (or an `explode`/`transparentParts` config — see §7) looks up a part
  by name and that part is duplicated elsewhere in the file — instancing collapses duplicates into
  anonymous nodes with nothing left to find by name. Costs little to nothing in file size in
  practice so far (every model built this way used it from the start once a repeated part was
  spotted in the raw inspection step); default to trying *without* it first, re-read the
  compressed file to confirm the part you need is still a named node, and only add the flag if it
  isn't.
- `npm run video` needs no system ffmpeg — it uses the bundled `ffmpeg-static` binary. Always
  encodes H.264/MP4 (not WebM): the one format that plays natively everywhere, including iOS
  Safari, so there's never a second `<source>` to maintain. The same bundled binary is also used
  ad hoc (not through this script) for one-off jobs like trimming a video's start or grabbing a
  new poster frame — see the toy-plane trim and coffee-cup-gripper video in the git log for the
  exact `ffmpeg-static` invocation pattern (a small inline Node script via `execFileSync`, not a
  new npm script, since it was a one-time edit, not a repeatable pipeline step).
- Windows: a killed background `npm run dev` can leave vite still holding port 5173 — find it with
  `Get-NetTCPConnection -LocalPort 5173` and stop that process.

## 4. Architecture

Vite + React 19.2.8 (**pinned on purpose** — Framer Motion 13.4.0 crashes on React 19.3.0+;
check Motion's compatibility before ever bumping React) + TypeScript + Tailwind v4, shadcn layout
(`@/` → `src/`).

```
index.html                     shell, <html class="dark">
src/main.tsx → src/App.tsx     Intro, About, Experience, BentoGrid, footer
src/data/projects.ts           THE content file — every project's copy, photos, models, animations
src/data/experience.ts         work history shown in the About section — same data-driven pattern
src/data/types.ts              field docs for both of the above — read this before adding a field
src/components/
  BentoGrid.tsx                the grid: tiles, expand/collapse, scroll-follow, self-spinning covers
  StepVisual.tsx                a step's own visual inside an expanded tile
  StepContent.tsx               body / stats / bullets — parses *single-asterisk* bold (see below)
  Photo.tsx                    responsive WebP <img>
  sections/                    Intro (canvas), About, Experience, ContactLinks
  ui/helix-chrono-matrix.tsx   user-supplied intro canvas
  visuals/
    ModelLayer.tsx             Three.js .glb viewer (see §7)
    modelAnimations.ts         per-model built-in animations (see §7)
    EmbedLayer.tsx             HTML animation in an iframe
    VideoLayer.tsx             plain looping <video>
src/hooks/                     useMotionAllowed, useSmoothScroll (Lenis), useScrollFade
src/styles/site.css            all site CSS, in @layer base/components — see §7 for two real
                                specificity/cascade bugs found in here this pass
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

**Step headings can be blank.** `Step.label` is normally a heading string, but an **empty string**
renders no `<h4>` at all (`BentoGrid.tsx`: `{step.label && <h4>...}`) — used when a project needs
more visual "slots" than distinct headings (e.g. Cooling Unit's "How?" section needs two visuals —
the airflow embed and a follow-up photo — but only one "How?" heading should show; the second step
object has `label: ''` and its content just reads as a continuation). Because of this, **step keys
are `${label}-${index}`, not just `label`** — two steps can legitimately share a label (including
both being empty), and React needs a unique key regardless.

**A step's visual:** `image`, `embed` (HTML animation, iframe), `video` (plain `<video>`), `model`
(.glb), `stack` (several full-size, stacked), or `split` (several side by side, smaller). Priority
when more than one is set: `split` > `stack` > `model` > `embed` > `video` > `image`. Reduced
motion always shows `image` regardless of what else is set — always keep a step's original photo
even after adding a model/video/embed to it, as the fallback.

**Bold text in copy:** `StepContent.tsx` parses `*single asterisks*` in a step's `body`/`bullets`
into `<strong>` (plain weight, no colour — "the site's existing bold styling"). This was added
specifically because the full copy rewrite (§6) needed it; no project's copy used literal
asterisks before, so this was safe to add without touching old content. **Don't confuse this with
Experience's own convention**: `Experience.tsx` parses `**double asterisks**` in a highlight into a
*gradient-coloured* `<strong>` (matching the stat-number gradient), a separate, deliberately
different micro-syntax for a separate component/purpose.

**Cover images:** a project's tile cover comes automatically from **every distinct model used
across its steps**, not just the first one. `coverModels()` in `BentoGrid.tsx`: a `split`/`stack`
on any step still wins outright and supplies every model in it; otherwise it walks every step's own
single `model` field and collects one instance per distinct `src` (a project that repeats the same
model on two steps — e.g. Cooling Unit, or the oiling tool's animated + exploded pair — only gets
it once). This was a real fix, not the original design: reusing a project's cover-photo-via-first-
image logic (`coverImage()`) the same way used to make a photo used on two different steps look
"consumed by the cover" and get silently hidden on whichever step wasn't first — see §7. Several
cover models sit side by side (`.bento-tile__model--row`); they **spin on their own**, not on
hover, pausing while their tile is open or scrolled off-screen, still under reduced motion (unless
a specific model has `autoRotate: false` — see §7, that's an opt-out per model, not global).

## 5. Environment traps — read before spending time debugging "it doesn't work"

- **The Browser pane pauses rendering when it isn't the actively displayed pane** — screenshots
  come back blank, stale, or frozen mid-animation. Check DOM/JS state directly
  (`getBoundingClientRect`, class lists, element counts, computed styles, or seeking a GSAP
  timeline) before concluding something is broken from a screenshot alone. This pass had long
  stretches (most of two separate tasks) where screenshots reliably came back blank even after
  waiting; a **genuinely fresh tab** (`tabs_close` the stuck one, then `tabs_create` + `navigate` a
  new one) was the most reliable unstick, but sometimes needed 2–3 tries before a screenshot
  actually rendered. When it stays stuck, fall back to DOM/computed-style verification and say so
  plainly rather than waiting indefinitely.
- **`window.scrollTo()` / `element.scrollIntoView()` called from `javascript_exec` fights the
  site's Lenis smooth-scroll** and gets snapped back almost immediately — it's not a reliable way
  to bring something into view before a screenshot. Either drive scrolling with the Browser tool's
  own wheel-scroll action (`computer` tool, `scroll` action — this goes through real wheel events,
  which Lenis listens to correctly), or just click a tile's toggle and let `BentoGrid`'s own
  scroll-follow (already Lenis-aware) bring it into view on its own.
- **A `.click()` on a tile toggle, followed only by `javascript_exec`-based `setTimeout` waits, can
  leave the Framer Motion expand animation stuck at `height: 0; opacity: 0` indefinitely** — the
  detail panel never actually opens, which looks exactly like a real "tile won't expand" bug but
  isn't one. Pairing the click with at least one `computer` tool `wait` + `screenshot` (even if the
  screenshot itself comes back blank per the point above) reliably lets the animation actually
  progress; a bare `javascript_exec` polling loop does not reliably do this in this environment.
  Don't conclude the expand interaction is broken from a stuck `height: 0` without trying this
  first — check `detail.style.height`/`opacity` directly if unsure whether it's genuinely stuck.
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
- **Don't poll the live production URL aggressively.** A background script checking the live site
  every few seconds (even just a plain `curl`/`fetch` loop, meant well, to confirm a deploy had
  landed) tripped Vercel's bot-mitigation and put up a challenge page for that traffic — a real,
  if temporary, side effect, not just a theoretical risk. If you need to confirm a deployment
  landed, check once, or space checks out by minutes; the real Browser pane (a genuine browser)
  passes the challenge fine, `curl` does not.
- **A push can sit "succeeded" but stale on Vercel for several minutes**, and the live page can
  *look* unchanged while actually still serving the previous build. Don't judge "is my latest
  commit live" from how the page looks — compare the deployed HTML's referenced main JS bundle
  filename (it's content-hashed, e.g. `assets/index-C5k3pAVM.js`) against the filename your own
  most recent local `npm run build` just produced. If they match, the latest commit is live; if
  they don't, it isn't yet, regardless of how long ago you pushed.
- Cross-checking real behavior sometimes needs his own report from his actual phone/desktop —
  this environment's testing isn't always sufficient proof, and it's fine to say so.

## 6. Current content state

All 10 projects now share a consistent **What? / How? / Results** heading pattern (Assembly Line
Fixtures & Tooling is the one exception — its three headings are each tool's own name, by design,
not What/How/Results). Every bullet was rewritten this pass with `*bold*` markers on the key
figures (see §4). Visuals (images/models/embeds/video) were **not** changed by the copy rewrite
itself — only by the separate, later requests noted below.

| Project | Headings/visual per step | Cover |
|---|---|---|
| Mobile Harvest Buffer Cooling Unit | What?(model+image) · How?(embed+image) · How?→cont.(image, no heading) · Results(stats, no visual) | model |
| Detachable Conveyor Belt Cart | What?(image) · How?(model, animated `conveyor-shaft`, +image) · How?→cont.(image, no heading) · Results(stats+image) | model |
| Assembly Line Fixtures & Tooling | Shaft Removal Tool(model, `shaft-puller`) · Saw-Cut Fixture(model, `ptu-gear-cutting`) · Oiling Fixture(model, `oiling-sensor`) — each with its own image fallback | all 3 models, side by side |
| Coffee Cup Gripper | What?(model+image) · How?(image) · Results(stats+image+**video**, the user's own phone recording) | model |
| ANSYS Stress Analysis | What?/How?/Results, all image-only | **photo** (new transparent render, gallery-only — see §7) |
| Spring-Loaded Inside-Out Oiling Tool | What?(model, animated `oiling-tool-coil`, +image) · How?(**second, static** model of the same file — exploded view, `autoRotate:false`, +image) · Results(stats+image) | model (the animated one; dedup by src — see §4) |
| Autonomous Reef Rover | What?/How?/Results, all image-only | **photo** (new transparent render, gallery-only) |
| Kinder Toy Plane | What?(model, animated `propeller-spin`, +image) · How?(video+image) · Results(image) | model |
| Meccano Car Ball Launcher | What?(model, `rotation`-corrected, +image) · How?/Results(image) | model |
| Reverse-Engineered Hydraulic Hand | What?/How?/Results, all image-only | **photo** (new transparent render, gallery-only) |

Every model/video step keeps its original photo as the reduced-motion fallback. A "Choosing a
concept" step existed on Cooling Unit once and was **deleted at the user's request** — don't
reintroduce it.

Two photos are still low-resolution (PDF-extracted) and **he'll send replacements himself — don't
chase him for them**: `hydraulic-hand/part-drawing`, `reef-rover/collection-mechanism`. (A third —
`coffee-cup-gripper/built-gripper` — was still low-res as of the last full content pass; check
before assuming, it may have been replaced along with the gripper's new video.)

**6 model animations now exist** (all in `modelAnimations.ts`, one `case` each in
`createModelAnimation`, one name in `ModelAnimationName`): `ptu-gear-cutting`, `oiling-sensor`,
`conveyor-shaft`, `shaft-puller`, `propeller-spin`, and the newest, `oiling-tool-coil`.

## 7. Sensitive code — read before touching the expand animation, scroll-follow, 3D framing,
##    the model script, or a model's built-in animation/config

This is the section CLAUDE.md's own top banner and several inline comments point at as "§7" — if
you found this doc via one of those pointers, you're in the right place.

### 7a. The expand animation and scroll-follow

Covered by §4's "bento tile mechanic" paragraph and §5's Framer-Motion/hot-reload bullets above —
read both before changing `BentoGrid.tsx`'s toggle/scroll-follow logic. The short version: the
expand transition is Framer Motion (not GSAP) on purpose, scroll-follow re-measures every frame
because a one-shot measurement mid-transition is wrong, and this environment's own pane-pause
quirks can make a perfectly working expand look stuck — verify with DOM state, not just a
screenshot, before "fixing" it.

### 7b. 3D framing and the model script — the recipe that's worked every time

Across every model animation and config built so far, **skipping any of these steps has caused a
real, reproducible bug**:

1. **Copy the uploaded file into `content/models/<name>.glb`, never `public/`.** A raw export
   landing directly in `public/` is a mistake to fix immediately (move it to `content/`), not a
   place to build from — it'll get committed to the repo at full size otherwise.
2. **Inspect the raw node tree first**, with a throwaway script using `@gltf-transform/core`'s
   `NodeIO` (reads raw glTF names/transforms/bounds — *not* what three.js will actually load, see
   step 4). A Draco-compressed source needs a decoder registered to even read it
   (`draco3dgltf`'s `createDecoderModule()`, same as `optimize-model.mjs` does); a *compressed*
   output (after `npm run model`) needs a **meshopt** decoder registered instead
   (`meshoptimizer`'s `MeshoptDecoder`) — these are two different dependencies for two different
   stages of the same file, easy to mix up. Delete the throwaway script when done; it's scratch
   work, not part of the codebase.
3. **Never guess a direction, axis, or spatial relationship from the node's placement transform,
   from eyeballing a screenshot, or from a *previous* export of the "same" model.** Every real bug
   in this project's model animations came from skipping this — and a model can be re-exported
   with a changed node structure (the oiling tool's "Fix" group was later split into "Holder" +
   "Fixed" in an updated export), so re-derive axes/relationships against *this* file's own
   geometry every time, even for a model you've built before:
   - **Find axes from the geometry itself**, not assumptions. A spin axis is usually the direction
     with the *narrowest spread* of the mesh's own local vertex positions (not just min/max
     range — a tapered part can make range misleading; use standard deviation per axis).
   - **A "which way is up" or "which part sits above/below which" question** is answered by
     computing actual **world-space bounding boxes** (compose each node's transform up through its
     full ancestor chain, then find min/max of every vertex) and comparing them — not by reading a
     single node's own local translation, which can be misleading in isolation (e.g. two parts can
     have very similar local Y offsets from their *own* parent while one is still meaningfully
     "above" the other once every ancestor transform is composed in). The oiling-tool coil's
     "starts above and descends into the tool" direction, and the exploded view's whole ordering,
     were both worked out this way, not from local transforms alone.
   - **A described direction ("clockwise", "moves right", "down") is relative to a specific
     viewing angle**, and the model auto-rotates, so ask which side he was actually looking from,
     or find something in the file itself to anchor it — the `.glb`'s own embedded "current
     camera" node (every SolidWorks export carries the viewport that was active on export) is a
     reasonable proxy when the geometry gives no better cue.
4. **Match node names as three.js will actually produce them, not as the raw file has them.**
   `GLTFLoader` sanitizes every name on load: whitespace → `_`, and `[ ] . : /` are **deleted**,
   not replaced. Two real, silent (`find()` → `undefined`, no thrown error) bugs came from this in
   earlier work: comparing against a name with un-sanitized spaces, and assuming a slash-joined
   path (which `dedup()` produces for a merged/deduped mesh) survives as separate segments — it
   doesn't, the segments end up glued together with no separator. Match with `.includes()` on a
   sanitized substring for a loose match (used by `sanitizedIncludes()` and `transparentParts`), or
   with `baseName()`/`.startsWith()` when you specifically need to avoid matching a child whose own
   label happens to contain the parent group's name — **this exact trap bit the `explode` feature**:
   `transparentParts: ['Holder']` matching both the "Holder" group *and* its own child mesh named
   "Design 2 Holder" is harmless there (idempotent — setting the same material property twice does
   nothing extra), but the same loose match for `explode` (which *adds* a position offset) would
   have shifted that child mesh **twice** — once directly, once again by inheriting its
   already-shifted parent's position. `explode` matches with `.startsWith()` specifically because
   of this; don't loosen it to `.includes()` without re-checking for the same trap.
5. **Compress with `npm run model` and re-read the output before wiring anything up.** Try default
   settings first; if the part you need has vanished into an anonymous instanced batch node, add
   `--no-instance` and recompress (see §3). Re-inspect the *compressed* output specifically (not
   just the raw source) before writing any code against its node names — compression can reshape
   the hierarchy even without instancing being the cause.
6. **Verify by seeking the GSAP timeline** (`tl.pause(); tl.time(t)` at several points, comparing
   exact numeric values — e.g. millimetres of travel — against the spec), not by watching real-time
   playback or comparing screenshots taken moments apart — see §5, the Browser pane's rendering
   pauses and the self-rotating camera both make real-time/screenshot checks unreliable here in
   ways that look exactly like a real bug but aren't. This caught a real bug directly: a GSAP
   position-parameter mistake (`'<'` meant "align with the *first* tween added to the timeline",
   not "align with whatever was just added") made three moves overlap instead of sequencing —
   invisible on a quick screenshot glance, obvious immediately once the timeline was seeked to
   each phase boundary and the numbers didn't match the spec.
7. **Check the browser console, not just the DOM, when something new touches `ModelLayer`'s draw
   loop.** A `RangeError: Maximum call stack size exceeded` inside `ModelLayer.tsx`, with the
   model showing "Model unavailable", is what a JS-level bug in the render loop looks like — it
   won't show up as a DOM/CSS problem, so `getBoundingClientRect` checks alone can miss it. This
   happened once: adding an `OrbitControls` `'change'` listener (needed so a *non*-auto-rotating
   model — see `autoRotate` below — still redraws while being dragged, since the render loop
   otherwise only keeps re-scheduling itself while `autoRotate` or a built-in animation is active)
   re-entered `draw()` from *inside* `draw()`'s own `controls.update()` call, because
   `controls.update()` can synchronously fire `'change'` (it does, every single frame, for any
   *other* model on the page that's still genuinely auto-rotating) before the loop had marked
   itself "busy." Fixed by setting `frame` to a busy sentinel *before* calling `controls.update()`,
   not after. If you add another listener or side effect to the draw loop, ask specifically
   "can this re-enter `draw()` while `draw()` is already running, and does my in-progress guard
   actually cover that window?"
8. **A resize wipes the WebGL canvas**, and a still (non-spinning) cover model only draws once —
   `ModelLayer.resize()` redraws after every resize, or a cover goes blank after its tile opens
   and closes. Already fixed; don't reintroduce the bug if touching that code.

**`ModelLayer` / `StepModel` config knobs** (`src/data/types.ts` has the authoritative field docs —
read them before adding a new one; several were added this pass and are genuinely generic, not
one-off hacks, so reach for an existing knob before inventing a new mechanism):
- `margin` — multiplier on camera distance, for a wide/low model whose near edge crops as it
  spins (the auto-framing fits height and horizontal swing radius, not the camera's downward
  tilt). Try 1.15–1.4 first depending on how squat/tall the model is.
- `brightness` — multiplier on the shared tone-mapping exposure (0.68 default), for a model whose
  pale parts wash out to white.
- `rotation` — `[x, y, z]` Euler degrees, a one-time correction applied before centring/framing,
  for a source export that wasn't saved upright.
- `transparentParts` (+ `transparentOpacity`, default 0.3) — named parts (and everything nested
  inside them) render see-through: `transparent = true`, reduced `opacity`, `depthWrite = false`
  (so it doesn't hide what's behind it in the depth buffer regardless of draw order) and
  `side = THREE.DoubleSide` (so the inside face still renders — a CAD export's shell is usually
  front-face-only). Matched loosely (`.includes()`), which is fine here since it only ever sets
  the same properties, idempotently, even on a double match.
- `explode` — `{ part, offset: [x,y,z] }[]`, a **one-time static** position shift per named part,
  applied once right after load, before centring/framing measures the model — for pulling a
  model's assemblies apart into an exploded view. Matched with `.startsWith()`, not `.includes()`
  (see point 4 above for why). Work out each offset from the parts' actual world-space bounding
  boxes (heights and current positions), stacked with a consistent gap in the requested order —
  don't eyeball it.
- `autoRotate` — `false` turns off a model's own self-spin while leaving drag-to-rotate fully
  working (default `true`, i.e. unchanged behaviour, when motion is allowed). For a model meant to
  be inspected by hand rather than passively watched — the oiling tool's exploded view is the only
  user of this so far.
- Auto-rotate (when on) is **time-based** (12°/s, `controls.update(elapsedSeconds)`), so it's the
  same speed regardless of the viewer's screen refresh rate — this was a real, reported bug (spun
  2.4× faster on a 144 Hz monitor than a 60 Hz phone) before it was fixed. Any future per-frame
  animation needs the same treatment: always pass elapsed time, never a fixed per-frame step.

### 7c. CSS gotchas found this pass (both silent — no error, just visibly wrong)

- **Two equal-specificity rules for the same property resolve by source order, not by which one
  "sounds like" the override.** `.step-visual__img.is-transparent { background: none }` and
  `.photo-visual__split-img.is-transparent { background: none }` were both defined *earlier* in
  `site.css` than their corresponding "give this a white panel" base rules
  (`.bento-tile__step .step-visual__img { background: var(--photo-bg) }` and
  `.step-visual--split .photo-visual__split-img { ... }`) — both pairs have identical specificity
  (two classes each), so the later-defined base rule silently won, and every "transparent" cut-out
  photo shown as a plain step image or in a split row was quietly getting its white panel back.
  This had been true for a while before it was noticed, because the bug is invisible unless you
  already know the image *should* be transparent. Fixed by qualifying the override selectors with
  the same context class the base rule uses, so the override structurally outranks it regardless
  of where either is written in the file. If you add a new `background`/similar rule for an
  existing class in a more specific context, check whether an `.is-transparent`-style override for
  that same class exists elsewhere and would now lose to it.
- **Tailwind's preflight sets `img { display: block }`**, so a layout that relies on a parent's
  `text-align: center` to centre an `<img>` silently does nothing — text-align only affects inline
  content, and `display: block` makes the browser ignore it for that element. `.step-visual__img`
  was flush-left inside its (correctly centred) container for this reason; fixed with
  `margin: auto` instead of relying on the inherited `text-align`. Worth checking anywhere else in
  `site.css` that centres an `<img>` — this bug is easy to reintroduce by copying the "just use
  text-align" pattern that works fine for actual inline/text content.

## 8. Known debts

- No Lighthouse/field performance run has been done. There are now **9 live WebGL canvases on the
  page at load** (Cooling Unit, Conveyor Cart, Assembly Line Fixtures & Tooling ×3, Coffee Cup
  Gripper, the Spring-Loaded Oiling Tool, Kinder Toy Plane, Meccano Car — ANSYS, Reef Rover and
  Hydraulic Hand now use photo covers, not models), up from 8 before this pass (the oiling tool
  gained a model). Browsers cap active WebGL contexts (~16) — measure phone performance before
  adding more cover models, and keep this in mind if a future project's cover would push the count
  much higher.
- Reduced-motion layout has never been checked in a real browser with the OS setting on, only via
  the dev flag and DOM checks.
- The `motion` package adds ~30 KB gzip to the main bundle, not code-split (the expand interaction
  is core to every page view, unlike the 3D chunk which only loads once a model is needed).
- On a phone (DPR 2), model boxes render taller than the desktop 4:3 (294×455 observed) — not
  inconsistent (every model box does this the same way), just worth knowing if it comes up.
- Two low-res, PDF-extracted photos are still waiting on replacements he'll send himself (see §6)
  — don't chase him for them.

## 9. What's next

**His stated priorities, in no particular order (ask him which first if it matters):**
1. **Replace the remaining low-res photos** once he sends them (§6/§8) — `hydraulic-hand/part-drawing`
   and `reef-rover/collection-mechanism` for sure; double-check whether `coffee-cup-gripper/built-gripper`
   still needs one too, it may already be covered by the new gripper video.
2. **More 3D models/animations for the remaining photo-only projects.** ANSYS Stress Analysis,
   Autonomous Reef Rover and Reverse-Engineered Hydraulic Hand are the ones left with no 3D model
   (they got new transparent-render photo covers this pass, but that's not the same thing — see
   §6). Follow the §7b recipe exactly if/when a model arrives for one of these; don't skip steps
   just because it's been done several times now.
3. **Custom domain** — deliberately the **final** step once everything else is done. Don't raise
   it early.

**Already decided, not yet done:**
- Replace `qtaha@uoguelph.ca` — he'll do this himself before graduating, no action needed unless
  he brings it up.
- Scroll-scrubbed SolidWorks image sequences (from the original brief) — **decided against, he
  will not be doing this.** 3D models/animations are the path for CAD visuals now.
