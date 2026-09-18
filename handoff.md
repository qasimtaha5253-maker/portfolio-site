# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold.
Read `CLAUDE.md` first (project rules — **note: it's stale, see §0**), then this.

Last updated: 2026-09-18, after session 4 (the bento-grid rebuild).

---

## 0. Read this first: CLAUDE.md is out of date

`CLAUDE.md`'s "Concept" and "Code layout" sections still describe the **old pinned-chapter
scrollytelling** site. That architecture is superseded. The site is now a **bento grid** — every
project is a tile in one grid, sized by `featured`; tapping a tile expands it in place. This
handoff describes the real, current state. Don't trust CLAUDE.md's architecture description until
someone refreshes it (flagged as a to-do in §8).

## 1. What this is, and where it lives

Single-page portfolio for Qasim Taha, final-year Mechanical Engineering co-op student at the
University of Guelph. 10 projects, loaded from one config file, rendered as a bento grid.

- **Live (main, still the old pinned-chapter version):** https://portfolio-site-qasim-1db5.vercel.app/
- **Branch preview (bento grid — this is the current direction):**
  https://portfolio-site-git-bento-layout-qasim-1db5.vercel.app/
  Auto-deploys on every push to `bento-layout`, same as main auto-deploys on push to `main`.
- **Repo:** https://github.com/qasimtaha5253-maker/portfolio-site — branch `bento-layout`
- **Local:** `C:\Users\qasim\Documents\portfolio-site` (moved off OneDrive — don't move it back;
  OneDrive syncing `node_modules` caused file locks)

**The bento grid is the new direction, not an experiment under review.** main/the pinned-chapter
version is superseded. `bento-layout` hasn't been merged to main yet — that's still ahead of us,
once remaining content (see §7) is in and the user is happy with it. Until then, main stays live
and untouched; all work happens on `bento-layout`.

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
npm run model -- <in.glb> <out.glb> [--ratio 0.2] [--no-resize]
```

`--no-resize` on the model script is new (§7) — skips the texture-resize step for sources whose
texture size metadata is unreliable. Default ratio is 0.2, not 0.15 as an older note said — check
`scripts/optimize-model.mjs` if in doubt rather than trusting a stale comment.

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
  BentoGrid.tsx                the whole grid: tiles, expand/collapse, scroll-follow, hover-spin
  StepVisual.tsx                a step's own visual inside an expanded tile (model/embed/split/photo)
  Photo.tsx                    responsive WebP <img>, adds `is-transparent` from a generated list
  StepContent.tsx              body / stats / bullets
  sections/                    Intro (canvas), About, ContactLinks
  ui/helix-chrono-matrix.tsx   user-supplied intro canvas, modified
  visuals/                     ModelLayer (3D), EmbedLayer (iframe)
  Chapter.tsx, ProjectCard.tsx  DEAD CODE — unused pinned-chapter/card components, not imported
                                 anywhere. Delete these and their site.css rules as a first task
                                 (see §8) — kept only because deleting them wasn't this session's job.
src/hooks/
  useMediaQuery.ts              useMotionAllowed (dev-only `?reduced-motion` flag)
  useSmoothScroll.ts            Lenis + GSAP ticker; now RETURNS a RefObject<Lenis|null> (see §7)
  useScrollFade.ts              Intro/About crossfade on scroll
src/styles/site.css            all site CSS, in @layer base/components
content/photos/<project>/      source images (committed)
content/models/                source .glb (GITIGNORED)
public/projects/, public/models/, public/animations/   generated/served assets (committed)
scripts/optimize-model.mjs     model compression — see §7 for two real fixes made this session
```

### How a tile works (`BentoGrid.tsx`)

- Every project is a tile, `grid-column: span 2`; `featured` projects also get `grid-row: span 2`
  (bigger tile). Tapping one sets `expanded` (a single `string | null`) and it grows in place;
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
- **Cover model / hover-to-spin:** a project whose first model-bearing step has a `.model` shows
  that live, rotatable model as its tile cover (instead of a plain photo), static until hovered,
  spinning while hovered. Fully data-driven via `coverModel()` (mirrors `coverImage()`) — no
  per-project code. See `ModelLayer`'s `spin`/`interactive` props in §7.
- **Deferred heavy visuals:** opening a tile with a 3D model/embedded animation used to visibly lag
  (loading them competed with the expand animation for frames). `StepVisual`'s `ready` prop defers
  mounting the actual `ModelLayer`/`EmbedLayer` until the expand animation's `onAnimationComplete`
  fires — but the *sized wrapper* (aspect-ratio based, not content-based) always renders
  immediately, or the tile would measure short, animate to the wrong height, then jump again once
  the heavy content mounted. Both halves matter; see §7 if this needs touching again.

### A step's visual (`StepVisual.tsx`)

A step in `projects.ts` can set `image`, `embed` (HTML animation in an iframe), `model` (.glb), or
`split: [...]` (several side by side, model and/or photo). Priority when a step sets more than one:
`split` > `model` > `embed` > `image`. Under reduced motion, always the plain `image` regardless.
Unlike the old pinned-chapter layout, there's no shared cell to crossfade between steps — the
bento tile shows every step's own visual, stacked, all at once, when expanded.

## 5. Current content state

- **Featured (large tiles):** Cooling Unit, Conveyor Cart, Coffee Cup Gripper.
- **Cooling Unit** — 4 steps, showpiece: 3D model → HTML section animation → CFD plot + strawberry
  flat split → 3D model again + stats. Has a cover model (hover-spins on its tile).
- **Conveyor Cart** — got a real 3D model this session (step 2, "Reverse engineering the line"),
  replacing what had been a plain (low-res) photo there. Also picked up a cover model automatically.
- **Coffee Cup Gripper** — still photo-only. **He'll send a model/animation for this when he makes
  one** — don't build a placeholder or ask again, just wire it in when it arrives (see §5 of the
  old process: add to the right step in `projects.ts`, run `npm run model`, done).
- The other 7 projects are smaller tiles, photo-only.
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

## 8. Known issues / debts

1. **`Chapter.tsx`, `ProjectCard.tsx` and their site.css rules are dead code** — not imported
   anywhere, safe to delete. Do this as an early task on this branch; it wasn't done yet because
   this session's focus was the new interaction, not cleanup.
2. **`CLAUDE.md` describes the old pinned-chapter architecture** and needs a rewrite once the
   bento direction is confirmed stable — see §0.
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
   and image weight.
6. `split` supports N items and mixed photo/model; only the 2-photo case is currently used
   (Cooling Unit's CFD step).
7. The conveyor-cart photo `handle-installed` is converted but unused.
8. The `motion` package added ~30 KB gzip to the main bundle; not code-split, since the expand
   interaction is core to every page view (unlike the 3D/GLTF chunk, which only loads once a model
   is actually needed).

## 9. What's actually next (not open questions — these are decided, just not done)

- **Coffee Cup Gripper model/animation:** he'll send it when he makes one. Wire it in the same way
  Conveyor Cart's was done this session (§7's model-script section covers likely gotchas).
- **Remaining low-res photos:** he'll send replacements as the site gets finalized (see §8.3).
- **Custom domain:** deliberately the **final** step, once everything else is done. Don't raise it
  early.
- **Replace `qtaha@uoguelph.ca`:** he'll do this eventually, before graduating. Not urgent, no
  action needed unless he brings it up.
- **Scroll-scrubbed SolidWorks image sequences** (from the original brief): **decided against —
  he will not be doing this.** Don't suggest it or plan for it; 3D models/animations are the
  path for CAD visuals now, not image sequences.
- **Delete the dead pinned-chapter code** (§8.1) and eventually **refresh CLAUDE.md** (§8.2) —
  both housekeeping, do whenever convenient, not urgent.
- **Merge `bento-layout` to main** once the above is in good enough shape and he's happy with it —
  no timeline given, follow his lead.
