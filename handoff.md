# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold. Read `CLAUDE.md` first
(project rules, architecture, stack) — this doc is the "how we got here and what to watch for"
companion to it, not a replacement.

Last updated: 2026-09-23. Full rewrite — the previous version covered up through the bento-grid
build-out and the first round of 3D-model animations; this one folds that history in condensed
form and adds everything from the session that followed (visual polish, the expandable mini-card
content system, the shadcn integration, several project-content passes). Section numbers changed
again — trust *this* file's numbers over memory of an older one.

---

## 1. What this is, and where it lives

Single-page portfolio for Qasim Taha, final-year Mechanical Engineering co-op student at the
University of Guelph. 10 projects, defined in one config file, rendered as a bento grid: every
project is a same-sized tile; tapping one expands it in place to show its steps.

- **Live:** https://qtaha.com — his own domain, DNS pointed at Vercel, deploy is live there.
  https://portfolio-site-qasim-1db5.vercel.app/ still works too (Vercel's own domain, unchanged).
- **Repo:** https://github.com/qasimtaha5253-maker/portfolio-site — work directly on `main`.
- **Local:** `C:\Users\qasim\Documents\portfolio-site` (moved off OneDrive on purpose — don't move
  it back, OneDrive syncing `node_modules` caused file locks).
- **Old versions, tagged, not deleted:** `pinned-chapter-version` (the block-by-block scrollytelling
  layout the bento grid replaced), `vanilla-js-version` (the original pre-React build).
- The About area's **Experience section (work history) was removed** at his request this session —
  don't reintroduce it. The component (`Experience.tsx`), its data file (`experience.ts`) and CSS
  were deleted outright, not just unmounted. Page order is now: Intro → About → BentoGrid (`#work`)
  → footer (`#contact`).

## 2. How the user works — read this before doing anything else

- He gives direction; you write all the code and explain anything he must do himself in plain
  terms — **he is not a web developer**, so no unexplained jargon.
- **Push automatically once a change builds and passes checks, then report what went live.** Don't
  sit on finished work waiting for approval. The one established exception: a handoff-doc rewrite
  itself, where he wants clarifying questions *before* you write it, not after — see the next
  bullet, and this doc is itself an example of that pattern working well (he answered a 3-question
  batch, including a free-typed correction, in one shot).
- For a large or ambiguous ask, a short batch of up-front clarifying questions is welcomed. Don't
  guess at scope on something like "rewrite X" when a quick question would remove the guesswork.
- **He iterates in small, sequential asks**, not one big spec — this has been true all along and
  was true for essentially this entire session (a long run of single-feature requests back to
  back: one visual tweak, one content restructure, one bug report, repeat). Don't try to
  anticipate or batch-ahead of where he's headed; just do the current ask well.
- **Once a content *pattern* is established for one project, he expects it carried over to others
  on request, without having to re-specify the pattern each time.** "Do the same for the conveyor
  cart" or "now do the same stat box expanding thing for X and Y, for each of their sections"
  means: apply the exact same structure already built for the reference project (see §8) —
  What?/How?/Results get the same treatment, same component reuse, same visual language — not a
  freshly-designed variant. When he gives this kind of request, look at what the reference project
  actually has and mirror it faithfully; inventing a "similar but different" version is the wrong
  move even if it seems reasonable in isolation.
- **He pastes exact source text to work from** — e.g. handing over the literal bullet strings to
  combine into a card, or a literal (sometimes garbled) preview line to use. Reproduce the real
  bold-markup and figures from that text rather than paraphrasing from memory of the project copy.
  If a fragment is genuinely unparseable (this session: "WILLQR 48 V, 80 Ah LiFePO₄" in a request),
  infer the most sensible reading, use it, and say plainly what you guessed and why — he'll correct
  it if wrong rather than wanting you to stop and ask. (That specific guess — reading it as a
  "Battery:" label — went unchallenged, so treat it as settled, not still open.)
- He describes symptoms precisely ("it expands the other 2 as well but they don't show any text")
  — reproduce *exactly* what he describes rather than guessing at a nearby-sounding bug. This
  session that level of precision was the key clue in a couple of real CSS bugs (see §7c).
- He's comfortable with real changes (new libraries, downgrading a core dependency, reworking a
  layout) as long as the reasoning is explained, and isn't precious about existing code.
- **Report honestly, including what couldn't be verified.** See §5's Browser-pane caveats.
- He uploads 3D models as files from his own tools, usually `Downloads\Motion Study\` or the chat
  upload path. He describes the motion he wants in plain terms ("rotate the X subassembly 90° in
  1 sec, pause, return in 1 sec, repeat") — see §7b for turning that into working code without
  guessing the axis.

## 3. Commands

```
npm run dev          # dev server, exposed on the LAN (he opens it on his phone)
npm run build         # tsc -b (TypeScript 7) then vite build — run before every push
npm run typecheck     # tsc -b only
npm run images        # content/photos/** -> public/projects/**/*.webp (deletes orphaned output)
npm run model  -- <in.glb> <out.glb> [--ratio 0.2] [--no-resize] [--no-instance]
npm run video  -- <frames-dir> <out.mp4> [--fps 30] [--width 1280] [--crf 23] [--poster]
```

No new scripts this session. The model/video pipelines and their flags are unchanged — see §7b for
the recipe. Windows note still applies: a killed background `npm run dev` can leave vite holding
port 5173 — `Get-NetTCPConnection -LocalPort 5173` and stop that process.

## 4. Architecture

Vite + React 19.2.8 (**pinned on purpose** — Framer Motion 13.4.0 crashes on React 19.3.0+) +
TypeScript + Tailwind v4, shadcn layout (`@/` → `src/`).

```
index.html                     shell, <html class="dark">, <link rel="icon" href="/favicon.svg">
src/main.tsx → src/App.tsx     Intro, About, BentoGrid, footer (Experience section removed)
src/data/projects.ts           THE content file — every project's copy, photos, models, animations
src/data/types.ts              field docs — read this before adding a field to Step/MiniCard/StepModel
src/components/
  BentoGrid.tsx                the grid: tiles, expand/collapse, scroll-follow, self-spinning covers
  StepContent.tsx               body/stats/bullets, PLUS the mini-card and summary-card system (§8)
  StepVisual.tsx                a step's own visual inside an expanded tile
  Photo.tsx                    responsive WebP <img>
  ui/
    button.tsx                 shadcn Button (originui variant) — see §9
    toggle.tsx                 shadcn Toggle, installed as a Button registry dependency — nothing
                                 in the app actually renders it yet, it's just sitting there
    helix-chrono-matrix.tsx    user-supplied intro canvas
  icons/
    RotateLeft03Icon.tsx       user-supplied icon, used as the model rotate-hint (§ current content)
  sections/                    Intro (canvas), About, ContactLinks
  visuals/
    ModelLayer.tsx             Three.js .glb viewer (see §7) — now also handles pinch-to-zoom (§7d)
    modelAnimations.ts         per-model built-in animations (see §7b) — 7 now, see §6
    EmbedLayer.tsx             HTML animation in an iframe
    VideoLayer.tsx             plain looping <video>
src/hooks/                     useMotionAllowed, useSmoothScroll (Lenis), useScrollFade
src/index.css                  Tailwind import + the shadcn theme-token @theme block (§9)
src/styles/site.css            all site CSS, in @layer base/components
content/photos/<project>/      source images (committed)
content/models/                source .glb (GITIGNORED — can be huge)
content/animations/<name>/     source frame sequences, e.g. .tga (GITIGNORED — can be 1 GB+)
public/projects/, public/models/, public/animations/   generated/served assets (committed, small)
public/favicon.svg             new this session — the site had no favicon before
scripts/optimize-model.mjs     .glb -> compressed .glb
scripts/optimize-video.mjs     numbered frame sequence -> compressed .mp4
```

**The bento tile mechanic** is unchanged in its core (Framer Motion `layout` + `AnimatePresence` for
expand/collapse, Lenis-aware scroll-follow re-measured every frame, heavy visuals deferred until
`ready`) — see the previous version of this doc's description if you need the full FLIP-vs-Framer
reasoning; it's still accurate. What *did* change this session:

- **The "+"/"×" toggle is now an animated hamburger-to-"×" SVG** (originui's pattern: three line
  `<path>`s using Tailwind's `group-aria-expanded:` variants), not a plain "+" glyph CSS-rotated
  45°. It's keyed off the hit button's own `aria-expanded` attribute — no React-driven CSS class
  needed for the morph itself anymore. Styled via `buttonVariants({variant:'secondary',
  size:'icon'})` (shadcn) + `rounded-full`, not bespoke CSS for shape/colour. See §9 for why the
  hover/focus orange swap had to move to `group-hover:`/`group-focus-visible:` Tailwind variants
  instead of a custom CSS rule.
- **Cover models can now opt out**: `StepModel.excludeFromCover` (new field) skips a model when
  `coverModels()` collects every distinct model across a project's steps for the tile cover. Added
  because the conveyor cart's new crank-handle model (different `src` from its main model) was
  otherwise joining the cover as an unintended second side-by-side model — see §6.
- **Cover models pan the page normally on touch now.** `OrbitControls` sets `touch-action: none`
  on its canvas unconditionally on connect, regardless of `enableRotate` — a non-interactive cover
  (rotation already off) was still swallowing the scroll gesture. `ModelLayer.tsx` overrides
  `touch-action` back to `pan-y` for non-interactive instances. The interactive, drag-to-rotate
  model inside an *expanded* tile keeps `touch-action: none` on purpose (that's the intended
  "swipe on the model rotates it" behaviour).
- **A step's own interactive model supports pinch-to-zoom** (touch only — see §7d for why it's
  gated to touch and not also the mouse wheel) and shows a small rotate-hint icon bottom-right
  (`RotateLeft03Icon`, white, `.model-layer__rotate-hint`) once loaded, so the affordance is
  visible without the visitor having to discover it by accident. Tile covers get neither.

## 5. Environment traps — read before spending time debugging "it doesn't work"

Everything from the previous version still applies (Browser-pane rendering pauses when not the
displayed pane; `window.scrollTo`/`scrollIntoView` fights Lenis, use the `computer` tool's wheel
scroll or let scroll-follow do it; a bare `.click()` + only `javascript_exec` waits can leave the
Framer Motion expand stuck, pair it with a real `computer` `wait` + `screenshot`; two screenshots
seconds apart can show a self-rotating model from different angles; WebGL canvases can't be
pixel-inspected; don't poll the live production URL aggressively — it can trip Vercel's bot check;
a push can sit stale on Vercel for several minutes, compare the deployed JS bundle's content hash
to your own last local build to know for sure). One new, sharp-edged variant found this session:

- **A CSS `transition`-driven value (not just a Framer Motion layout animation) can also freeze
  mid-progress when the pane's rendering is paused — including a GSAP count-up tween's displayed
  number.** After expanding a tile and immediately reading a `.stats__value`'s `textContent`, it
  showed "1 s" / "17%" (genuinely mid-tween values, not the target) and **stayed** stuck there
  across a 2-second `wait` and a re-check — because no real paint had happened in between, so the
  tween's `requestAnimationFrame` never advanced. The fix was the same as always: close the tab,
  open a fresh one, redo the interaction, and the values settled correctly on the next real paint.
  If a value looks "stuck" instead of just "wrong", suspect the pane before suspecting the code.

## 6. Current content state

All 10 projects still share the **What? / How? / Results** heading pattern (Fixtures & Tooling is
still the one exception, three tool-name headings by design). What changed this session, project
by project:

| Project | What changed |
|---|---|
| Mobile Harvest Buffer Cooling Unit | "What?" bullets moved behind an expandable summary card (§8). "How?"'s old flat 5-bullet list is now 3 mini-cards: **Refrigeration Cycle**, **Battery and Power System** (one original bullet split into two), **Validation** (absorbed from the old unheaded continuation step, which no longer exists as a separate step). "What It Achieved" stats rounded (2.2 hr / 1600 W / 6 hours / $6,500 / 2 years) and its 7 bullets moved behind a plain "View Details" button (`bulletsCollapsed`, no summary card here — that's a deliberate difference from "What?", see §8). |
| Detachable Conveyor Belt Cart | **3D model moved from "How?" to "What?"** (was requested standalone). "How?"'s two photos and its unheaded continuation step are **gone**, replaced by a new animated model of the crank handle sub-assembly (`crank-rotate`, §7b) plus 2 mini-cards (**Frame & Conveyor Fit**, **Attach/Detach Mechanism**). "What?" and "Results" both got the summary-card / collapsed-bullets treatment. The crank model has `excludeFromCover: true` (§4) — without it, it joined the tile cover unintentionally. |
| Assembly Line Fixtures & Tooling | Untouched this session (still 3 tool-name headings, no cards, its own established pattern). |
| Coffee Cup Gripper | "What?" and "Results" got summary-card / collapsed-bullets. "How?" is 2 mini-cards (**Drivetrain**, **Fabrication** — "Shop" spec now reads *CNC Tooling*, was "University shop"). Results cycle-time stat corrected to **5 s** (was 4 s, now matches the bullet text below it, which already said "5-second"). |
| Spring-Loaded Inside-Out Oiling Tool | "What?" (1 bullet) got the summary-card treatment anyway, for consistency. "How?"'s 1 bullet (which actually covered two distinct mechanisms) split into 2 mini-cards (**Spring & Guides**, **Sponges**) the same way the cooling unit's battery bullet was split. "Results" bullets moved behind "View Details"; **its photo was replaced by a third model instance** of the same `oiling-tool.glb` — `autoRotate: false` (drag only), no `transparentParts`, no `explode` (a plain assembled view, unlike the other two instances). |
| ANSYS Stress Analysis | Gained a stat box (`<2%`, "Error vs. theory") pulled from existing copy. No card treatment. |
| Autonomous Reef Rover | Gained a stat box (`3rd`, "Place"). No card treatment. |
| Kinder Toy Plane | Untouched. No stat box added — nothing quantifiable in its existing copy to pull without inventing a number. |
| Meccano Car Ball Launcher | Gained a stat box (`2nd`, "Place"). No card treatment. |
| Reverse-Engineered Hydraulic Hand | Gained a stat box (`200+`, "Parts modeled", pulled from its own "What?" copy). No card treatment. |

So: **4 projects now use the mini-card/summary-card system** (cooling unit, conveyor cart, coffee
cup gripper, oiling tool); the other 6 still use plain bullets. That's simply where requests
stopped this session, not a deliberate "these get it, those don't" split — a natural next ask if
he wants visual consistency across every project (see §11; not currently on his stated list).

**7 model animations now exist** in `modelAnimations.ts`: `ptu-gear-cutting`, `oiling-sensor`,
`conveyor-shaft`, `shaft-puller`, `propeller-spin`, `oiling-tool-coil`, and the newest,
**`crank-rotate`** (the conveyor cart's crank handle, §7b).

**9 live WebGL canvases at page load**, unchanged from before this session (Cooling Unit, Conveyor
Cart, Fixtures & Tooling ×3, Coffee Cup Gripper, Oiling Tool, Toy Plane, Meccano Car) — the crank
model briefly made it 10 until `excludeFromCover` fixed that; see §4.

## 7. Sensitive code — read before touching the expand animation, scroll-follow, 3D framing,
##    the model script, a model's built-in animation, or the card/toggle CSS

### 7a. The expand animation and scroll-follow

Unchanged from before — Framer Motion (not GSAP) on purpose, scroll-follow re-measures every
frame, this environment's own pane-pause quirks can make a working expand look stuck (§5).

### 7b. 3D framing and the model script — the recipe, still holding

The 8-step recipe from the previous version of this doc (copy the export into `content/models/`,
never `public/`; inspect the raw node tree with a throwaway `@gltf-transform/core` script and
delete it when done; **never guess a direction/axis from the node's placement transform, a
screenshot, or a previous export of "the same" model** — derive it fresh from *this* file's own
geometry every time; match node names as three.js actually sanitizes them, not as the raw file has
them; compress with `npm run model`, try default settings first, re-inspect the *compressed*
output before wiring anything up; verify by seeking the GSAP timeline, not by watching playback;
check the browser console for render-loop errors; redraw once after every resize — is still
exactly right and was followed for the new `crank-rotate` animation this session. One addition:

**A rotation axis found in a node's own local space isn't automatically the axis to animate
directly on that node** — worth understanding before you take a shortcut here. For the conveyor
cart's crank handle, the shaft's mesh geometry (measured in the "rotate" group's own local frame)
showed it was long along local Y. It would have been tempting to just tween that node's own
`.rotation.y` directly. Instead the same **pivot-group pattern already used for `conveyor-shaft`**
was followed: measure the shaft's world-space bounding box, create a fresh pivot `Group` at its
centre, `pivot.attach(group)` to reparent without moving anything, then animate the *pivot's*
rotation. This is more robust than editing the loaded node's own Euler rotation in place, because
that node may already have a non-identity base rotation from the source export (this one did — a
pure 90° rotation about X) and depends on the export's Euler decomposition working out cleanly
(verified here with an actual `three.js` `Euler.setFromQuaternion` + matrix-composition check, not
assumed — see the git history for `crankRotate` if you want the exact reasoning). The pivot
approach sidesteps that entirely: it doesn't matter what the animated node's own starting
orientation was, only where its geometry actually sits in world space. **Default to the pivot
pattern**, not direct-node-rotation, even when the direct approach can be proven to work for one
specific export.

**A model you add to a step can silently join the tile's cover if it has a different `src` from
that project's other models.** `coverModels()` collects every *distinct* model across a project's
steps, deduped only by `src` — adding a second, differently-named model file to any step (even one
meant as a small supplementary visual, not a "this represents the whole project" cover) makes it
show up side by side on the collapsed tile. This bit the crank handle model directly. If a new
model is a close-up/supplementary visual rather than a project-representative one, set
`excludeFromCover: true` on it and *check the actual collapsed tile* afterward — don't assume a
single new model addition is cover-neutral just because it "looks like a normal StepModel."

### 7c. CSS gotchas found this session (all silent — no error, just visibly wrong)

Two from the previous version of this doc still stand (equal-specificity rules resolving by
source order for `.is-transparent` overrides; Tailwind preflight's `img { display: block }`
silently breaking `text-align: center` as a centring trick). New this session:

- **CSS Grid stretches every item to the tallest one in its row by default** (`align-items:
  stretch`), and an accordion-style expand/collapse card sitting in a grid will visibly "grow" its
  row-mates even though their own content stays collapsed. This is exactly the bug he reported as
  "when I click to expand one of the 3 cards, it expands the other 2 as well but they don't show
  any text" — the sibling cards' *boxes* grew (to match the newly-tall opened card's row height),
  while their own internal accordion panel correctly stayed at 0 height inside that now-taller
  box. Fixed with `align-items: start` on `.mini-cards`. If you build another grid of
  independently-expanding items, set this from the start rather than waiting for the same bug
  report.
- **A capture-phase event listener on the same element the event fires *at* does not run before a
  bubble-phase listener already registered on that same element** — capture vs. bubble only
  affects ordering across *ancestors* on the way down to the target; at the target itself,
  listeners run in registration order regardless of the `capture` flag. This broke the
  touch-vs-mouse toggle for pinch-zoom's `enableZoom`: a capture-phase `pointerdown` listener was
  added directly on the model's `<canvas>` (the same element `OrbitControls`' own bubble-phase
  listener was already on, registered first in its constructor), so it never actually ran first.
  Moving the listener to `host` (the canvas's *actual parent* — a genuine ancestor) fixed it
  immediately, since a capture-phase listener on a real ancestor does run before the target's own
  listeners. If you need to intercept/modify state before a third-party library's own same-element
  listener reads it, you need an ancestor, not just the `capture: true` flag on the same node.
- **Tailwind's own `@layer utilities` always wins over this project's `@layer components`
  (site.css), regardless of selector specificity** — CSS `@layer` order overrides specificity
  entirely once *any* layers are in play. This meant the original custom-CSS approach for the
  toggle's orange hover swap (`.bento-tile__hit:hover .bento-tile__toggle { background: ... }`,
  living in `@layer components`) could never reliably beat a Tailwind background utility class
  applied to the same element (`@layer utilities`), even though the custom rule looked more
  specific by eye. Once the toggle started getting its base styling from `buttonVariants()`
  (§9), the hover swap had to move to Tailwind's own `group-hover:`/`group-focus-visible:`
  variants instead — pure Tailwind utilities, same layer, normal cascade rules apply. **Any time
  you mix a Tailwind-utility-styled element with a custom `site.css` rule targeting the same
  property, assume the Tailwind utility wins** and either express the whole thing in Tailwind
  (`group-*:` variants, arbitrary values) or keep the custom CSS to properties Tailwind isn't
  touching on that element (position, transitions on non-utility properties, etc. — see
  `.mini-card__toggle`/`.bento-tile__toggle` in site.css for what's left to plain CSS there).

### 7d. Why pinch-to-zoom is touch-only, not also the mouse wheel

`OrbitControls.enableZoom` is a single flag gating *both* the mouse wheel and touch-pinch dolly —
there's no separate flag per input method. Turning it on outright would let a desktop visitor's
page-scroll wheel get captured by the model instead of scrolling the page whenever the cursor
happens to be over it, the same class of bug as the tile-cover touch-action issue in §4. Instead,
`ModelLayer.tsx` toggles `controls.enableZoom` per-gesture based on `PointerEvent.pointerType`,
using a listener on `host` (the canvas's parent — see the capture/bubble note in §7c for why not
the canvas itself). Verified end-to-end by dispatching real synthetic two-finger pinch gestures at
the running code (not just reading it) and confirming the camera distance moves to the clamped
`minDistance`/`maxDistance` bounds in both directions, and that a mouse `pointerdown` leaves
`enableZoom` false. If you ever want wheel-zoom too, you'd need to intercept and stop propagation
of wheel events specifically when the pointer *last seen* was a mouse, not just toggle the same
flag — non-trivial, hasn't been attempted.

## 8. The mini-card / expandable-summary content system

New this session, and now the single biggest addition to the data-driven content model since the
bento grid itself. Three related `Step` fields (full docs in `types.ts`), all optional, all
composable independently:

- **`cards?: MiniCard[]`** — a row of small, `.stats__item`-styled boxes (`MiniCard = { title,
  preview?: Stat[], bullets: string[] }`), each collapsed to just its `title` until tapped, then
  expanding in place to add its `bullets` below. `preview` (optional) is a few label/value spec
  lines shown *even while collapsed* — plain text, not count-up animated like a `Stat` box in the
  achievement grid, since most preview values aren't pure numbers ("R-290 (propane)", "Pulley
  train"). Use this for a "How?" step's methodology bullets when there are 2+ natural subtopics —
  group each subtopic's bullets under a short (2-4 word) title, and pull 1-4 crisp spec facts
  already present in that subtopic's bullet text into `preview`. Rendered by `MiniCardItem` in
  `StepContent.tsx`, styled by the `.mini-card*` classes in site.css (surface panel, hairline
  gradient top border — matches `.stats__item`'s look, per his explicit request).
- **`bulletsCollapsed?: boolean`** — hides `bullets` behind a plain "View Details" button (the
  shadcn `Button`, §9) instead of always showing them. Use for a long, undifferentiated list (the
  cooling unit's 7-bullet achievement rundown) that would otherwise dominate the step.
- **`bulletsSummary?: string[]`** — only meaningful alongside `bulletsCollapsed: true`. Instead of
  a plain button, renders a single `.mini-card`-styled box whose *always-visible* header is this
  condensed version of `bullets`; tapping it adds the full `bullets` below (additive — the summary
  doesn't disappear, matching how `cards`' own `preview` stays visible when its `bullets` open).
  Use for a "What?" step: write 1-2 short bullets that compress the real ones (drop throat-
  clearing like "Designed a mobile..." down to the concrete noun phrase, keep any bolded figures).

**Which combination goes where** (the pattern he's asked to be mirrored across projects, §2):
"What?" → `bulletsCollapsed` + `bulletsSummary` (a summary card). "How?" → `cards` (subtopic mini-
cards, `preview` filled from real numbers/specs already in that subtopic's own bullet text — never
invent a number). "Results"/"What It Achieved" → `bulletsCollapsed` alone (plain button, *no*
`bulletsSummary` — that's the one deliberate asymmetry: a results rundown doesn't get a condensed
teaser, it's just hidden until asked for). If a "How?" step only has one bullet but it actually
covers two distinct ideas, split it into two short bullets across two `cards` entries rather than
forcing one oversized card (done for both the cooling unit's battery/inverter bullet and the
oiling tool's spring/sponges bullet).

Both `MiniCardItem` and the summary card's panel share one small `ExpandPanel` component (the
0fr→1fr CSS grid-row accordion trick, no JS height measurement) — reuse it for any future
expand/collapse box rather than re-deriving the technique.

## 9. shadcn / Tailwind integration

The project had shadcn's `components.json` scaffolding (alias, `cn()` helper) from the start but
had never actually had a component added — this session added the first one.

- **`npx shadcn@latest add "https://21st.dev/r/<user>/<slug>"` needs an API key query param the
  plain CLI doesn't have.** The `21st` CLI (`@21st-dev/cli`) knows the account's key, but its
  `21st add` command has a bug in this environment — it tries to spawn `npx` as a child process
  and fails (`spawn npx ENOENT`), a Windows-specific child-process quirk, not an auth problem.
  **Workaround: `21st search <query>` for the item's numeric id, then `21st get <id> --json`**,
  which prints the actual component source directly (no shell-out involved) — write that to
  `src/components/ui/<name>.tsx` by hand. Works reliably; used for both `button.tsx` and
  `toggle.tsx` this session.
- **This project's dark palette (`--bg`, `--fg`, `--surface`, `--accent`, etc. in `site.css`) had
  to be aliased into shadcn's expected token names** (`--color-primary`, `--color-secondary`, …)
  via an `@theme inline` block added to `index.css`, since no shadcn component had ever been added
  before and the usual `shadcn init` scaffolding that normally sets this up never ran. Mapping used:
  `--color-primary` → `var(--accent)` (the orange), `--color-secondary`/`--color-accent` (shadcn's
  own "accent" meaning — a neutral hover tint, *not* the site's own `--accent` brand colour, a
  naming collision to keep straight) → `var(--surface)`, `--color-background` → `var(--bg)`,
  `--color-ring` → `var(--accent)`. If you add another shadcn component that needs a token not yet
  in that `@theme inline` block, add it there rather than inventing a new colour.
- **`npm install <pkg>` on an already-present dependency (`lucide-react` was already there for the
  intro canvas's Play/Pause icons) bumps it to latest and rewrites its `package.json` range even
  if you only meant to *ensure* it's installed.** Harmless here (patch-level bump, nothing broke),
  but don't be surprised by an unrelated version diff showing up in `git diff package.json` after
  installing a batch of deps that happens to include something already present.
- `toggle.tsx` (`@radix-ui/react-toggle`) was pulled in as a registry dependency of the Button
  component and installed for completeness, but **nothing in the app renders a `Toggle` yet** —
  don't assume it's wired up anywhere if you go looking for where it's used.

## 10. Known debts

- No Lighthouse/field performance run has been done, still. 9 live WebGL canvases at page load
  (§6) — unchanged this session, but watch this number every time a model is added to any step;
  it's easy to accidentally add a 10th via the cover-dedup mechanism (§7b) without meaning to.
- Reduced-motion layout has never been checked in a real browser with the OS setting on, only via
  the dev flag and DOM checks.
- The `motion` package (~30 KB gzip) and now `class-variance-authority` + `@radix-ui/react-slot` +
  `@radix-ui/react-toggle` (small, but not code-split) all sit in the main bundle.
- Two low-res, PDF-extracted photos are still waiting on replacements he'll send himself:
  `hydraulic-hand/part-drawing`, `reef-rover/collection-mechanism` — don't chase him for them.
- `public/projects/conveyor-cart/drive-shaft-exploded-*.webp` and its source photo are now
  **unreferenced** (the step that showed it was removed, §6) — left on disk, not deleted; low-
  priority cleanup if you're ever tidying unused assets.
- Only 4 of 10 projects use the mini-card/summary-card system (§8, §6) — not a bug, just not yet
  asked for on the other 6.
- On a phone (DPR 2), model boxes render taller than the desktop 4:3 (294×455 observed) — not
  inconsistent (every model box does this the same way), just worth knowing if it comes up.

## 11. What's next

**His stated priorities, in order (confirmed this session — unchanged from before, minus the
domain item, which is now done):**
1. **Replace the remaining low-res photos** once he sends them (§10) — `hydraulic-hand/part-
   drawing` and `reef-rover/collection-mechanism`.
2. **More 3D models/animations for the remaining photo-only projects** — ANSYS Stress Analysis,
   Autonomous Reef Rover and Reverse-Engineered Hydraulic Hand still have no 3D model (they have
   stat boxes now, §6, but that's not the same thing). Follow §7b exactly when a model arrives for
   one of these.

**Done, no longer "next":**
- ~~Custom domain~~ — **qtaha.com is registered, DNS points at Vercel, and the deploy is live
  there.** Confirmed directly by him this session. No action needed; both `qtaha.com` and the
  `.vercel.app` URL work.
- Replace `qtaha@uoguelph.ca` — he'll do this himself before graduating, no action needed.
- Scroll-scrubbed SolidWorks image sequences — decided against; 3D models/animations are the path
  for CAD visuals now.

**Not on his list, but worth knowing it's an option**: rolling the mini-card/summary-card system
(§8) out to the other 6 projects, for visual consistency. Don't do this unprompted — he's been
asking for it project-by-project on purpose, so wait for the ask rather than assuming he wants it
everywhere at once.
