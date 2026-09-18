# Handoff — Qasim Taha portfolio site

Written for a fresh Claude Code / Cowork session picking this up cold.
Read `CLAUDE.md` first (project rules), then this (state, history, traps).

Last updated: 2026-09-18, after session 3.

---

## 1. What this is

Single-page scrollytelling portfolio for Qasim Taha, final-year Mechanical
Engineering co-op student at the University of Guelph. Built from his PDF
portfolio: 10 projects, 3 as full pinned chapters, 7 as cards.

- **Live:** https://portfolio-site-qasim-1db5.vercel.app/ (auto-deploys from `main`)
- **Repo:** https://github.com/qasimtaha5253-maker/portfolio-site
- **Local:** `C:\Users\qasim\Documents\portfolio-site` (moved off OneDrive — don't move it back;
  OneDrive syncing `node_modules` caused file locks)

## 2. How the user works

- He gives direction; Claude writes all code and explains anything he must do in plain terms
  (he is not a web developer — no jargon without a one-line explanation).
- **Push automatically** once a change builds and passes checks, then report what went live.
  Don't sit on finished work waiting for approval. He says "keep this local" when he wants it held.
- He iterates fast and visually: expect "make it bigger / dimmer / centred" follow-ups. Measure
  rather than guess, and say what was measured.
- Report honestly, including when something couldn't be verified.

## 3. Commands

```
npm run dev        # dev server, exposed on the LAN (he opens it on his phone)
npm run build      # tsc -b (TypeScript 7) then vite build — run before every push
npm run images     # content/photos/** -> public/projects/**/*.webp (+ transparent-photos.json)
npm run model -- <in.glb> <out.glb> [--ratio 0.15]   # compress a SolidWorks export
```

## 4. Architecture

Vite + React 19 + TypeScript + Tailwind v4, shadcn layout (`@/` → `src/`).
Switched from vanilla JS mid-project; the old version is tagged `vanilla-js-version`.

```
index.html                     shell, <html class="dark">
src/main.tsx → src/App.tsx     Intro, About, Chapters, "More projects", footer
src/data/projects.ts           THE content file — all copy, photos, models, animations
src/data/types.ts              field docs for the above
src/components/
  Chapter.tsx                  pinned chapter; ScrollTrigger per chapter, one step per viewport
  ProjectCard.tsx              grid card (<details>)
  Photo.tsx                    responsive WebP <img>, adds `is-transparent` from a generated list
  StepContent.tsx              body / stats / bullets
  sections/                    Intro (canvas), About, ContactLinks
  ui/helix-chrono-matrix.tsx   user-supplied intro canvas, modified (see §7)
  visuals/                     PhotosVisual (layer switcher), ModelLayer (3D), EmbedLayer (iframe)
src/hooks/                     useMediaQuery/useMotionAllowed, useSmoothScroll, useScrollFade
src/styles/site.css            all site CSS, in @layer base/components
content/photos/<project>/      source images (committed)
content/models/                source .glb (GITIGNORED — 200MB files, GitHub rejects >100MB)
public/projects/, public/models/, public/animations/   generated/served assets (committed)
```

### Chapter visual layers
A step in `projects.ts` can set `image`, `embed` (HTML animation in an iframe), `model` (.glb),
or `split: [...]` (several side by side). `PhotosVisual` stacks every layer in one grid cell and
cross-fades; each carries forward until a later step changes it. Heavy layers (embed, model)
mount only once their step is reached.

## 5. Current content state

Cooling Unit chapter (the showpiece), 4 steps:
1. The problem → 3D model (`public/models/cooling-unit.glb`)
2. How it works → HTML animation (`public/animations/cart-section.html`)
3. Validation → CFD plot + strawberry flat, side by side
4. What it achieved → 3D model again, stats tiles

Conveyor Cart and Coffee Cup Gripper are photo-only chapters. The other 7 projects are cards.
A "Choosing a concept" step existed and was **deleted at his request** — he doesn't want to
discuss alternative concepts. Don't reintroduce it.

## 6. Asset pipelines

**Images.** Drop files in `content/photos/<project-id>/`, run `npm run images`. The script:
keeps transparency (writes `src/transparent-photos.json`; those photos render with no white
panel), has no pixel limit (a render arrived at 24000×19000), refuses to run if two files in a
folder share a base name, and deletes WebP whose source is gone. Commit source and output.

**Models.** SolidWorks exports arrive at ~200 MB / 4–5M triangles. `npm run model` instances
repeated parts, simplifies (`--ratio 0.15`), shrinks textures, quantizes and meshopt-compresses:
197 MB → 0.6 MB, 4.7M → 41k triangles, with no visible loss at this size. Keep sources in
`content/models/` (gitignored); commit only the compressed file in `public/models/`.

## 7. Lessons learned — read before touching these

**3D (ModelLayer.tsx)**
- CAD materials are often `metalness: 1`. Metal shows only reflections, so with no environment
  map it renders **black**. Fix is a `RoomEnvironment` + PMREM. Current look: environment 0.18,
  exposure 0.68 — he asked repeatedly for dimmer; below this the metal goes black again.
- Measure metal brightness **with non-metal parts hidden**. Averaging the whole model counts the
  black tyres and makes it look like you've gone too dark when you haven't.
- Framing must measure reach **from the point the model spins around**, not the bounding-box
  centre — the model is centred on its volume-weighted centre (so the long towing handle doesn't
  drag it off-centre), which leaves the box lopsided. Padding 1.12 keeps ~10px margin at every
  angle; 1.06 clipped.
- Touch rotation is **on** (`controls.touches.ONE = TOUCH.ROTATE`). Trade-off he accepted: a
  swipe starting on the model rotates instead of scrolling; the text below still scrolls.
- three.js + loaders are dynamically imported (~187 KB gzip chunk), out of the main bundle.

**Performance (this caused a "why is it so laggy" report)**
- The section animation cost **25.6 ms/frame** — more than the whole 16.7 ms budget — because it
  called `getPointAtLength` for 360 circles every frame. Sampling each path once into a lookup
  table took it to **0.33 ms**. Look for per-frame DOM/geometry queries first.
- Invisible things still cost. Layers faded to `opacity: 0` kept animating; the animation now
  pauses via `window.__setPaused` (driven by `EmbedLayer`) and the 3D viewer stops drawing when
  it isn't the active step or is off-screen.
- Invisible layers also **swallow clicks**. `.photo-visual > *` gets `pointer-events: none`
  unless active — without it the model couldn't be dragged on the last step.
- Symptom pattern worth remembering: "first slide fine, last slide laggy" = something created
  earlier is still running behind the current visual.

**The HTML animation (`public/animations/cart-section.html`)**
User-authored, edited in place. If he sends a new export, these edits must be reapplied:
dark background (`#090a0f` — a transparent embedded page falls back to **white**, which he
reported twice), white labels/leaders, larger type with a `max-width: 560px` bump for phones,
only 4 labels kept (Warm air exhaust, Condenser and fan, Evaporator, Air return channel) plus
the legend, per-width label position tables, `fitViewBox()` centring on the cart, the path
lookup tables, and the pause API. Bump `?v=N` on the embed URL in `projects.ts` after editing,
or browsers serve the old file.

**Layout**
- The tallest step must fit a 375×667 phone with the progress dots visible. Monospace uppercase
  labels made the stats taller and broke this once — re-measure after type changes.
- Side-by-side layout applies at `(min-width: 768px) and (orientation: landscape), (min-width: 1100px)`;
  portrait tablets use the phone layout.

**Environment traps**
- The preview browser pane **pauses rAF, ResizeObserver and lazy loading when hidden**, and
  screenshots come back blank or stale. Don't trust a blank screenshot — verify by reading the
  DOM and computed styles, or by measuring canvas pixels. Much of this project was verified that
  way; say so when reporting.
- WebGL canvases can't be copied after their frame unless created with `preserveDrawingBuffer`.
  To inspect a render, build a separate renderer in-page rather than screenshotting.
- Bash heredocs mangle backticks — writing Markdown/CSS/JS through `node -e` in bash repeatedly
  ate them. Use the Write/Edit tools for anything containing backticks or template literals.
- Windows: stopping a background `npm run dev` can leave vite holding port 5173. Find it with
  `Get-NetTCPConnection -LocalPort 5173` and stop that process.
- `?reduced-motion` on the dev URL previews the reduced-motion layout (dev only).

## 8. Known issues / debts

1. **The HC²RPS concept diagram was removed**, but note for future: it came from a file named
   `Gemini_Generated_Image…`, and contained misspellings ("Hybnd", "Refrngerated") and a
   duplicated label. If he wants AI-made illustrations on the site, flag both the spelling and
   the question of presenting generated images as his own CAD work.
2. **Four photos are still low-resolution**, extracted from his PDF: `coffee-cup-gripper/
   built-gripper`, `conveyor-cart/shaft-assembly-render`, `hydraulic-hand/part-drawing`,
   `reef-rover/collection-mechanism`.
3. **Detailed drawings are unreadable at panel size.** Anything with fine labels (~2800px wide
   artwork in a ~500px panel) needs either a simplified version with large labels, a
   click-to-enlarge, or a full-width step. Solved for the section animation only.
4. **Reduced-motion layout has never been seen in a real browser** — only via the dev flag and
   DOM checks. Worth a real check with the OS setting on.
5. **No Lighthouse/field performance run** has been done; the 3D chunk and 6.7 MB of images are
   untested on a slow phone network.
6. `split` supports N items and mixed photo/model; only the 2-photo case is currently used.
7. The conveyor-cart photo `handle-installed` is converted but unused.

## 9. Where he left off (this is the live question)

He said he **doesn't like the block-by-block pinned scroll** and wants more animation. I built a
throwaway prototype at `alt.html` + `src/alt/` showing three directions, he looked, and it was
**deleted at his request** (recoverable from this session's history only — it was never committed):

- **A — Editorial scroll:** nothing pins; alternating photo/text rows, lines rising in, photos
  parallaxing. The direct answer to his complaint.
- **B — Horizontal run:** scrolling down moves projects sideways (still pins, but reads as one
  continuous move).
- **C — Bento grid:** all projects visible at once as tiles that lift in, visitor chooses.

**No direction has been chosen yet.** That's the first thing to settle. Note 21st.dev has good
components for all three (Scroll Horizontal Gallery, Parallax Grid Scroll, Text Reveal (Mask),
several bento grids) but nearly all use Framer Motion, and this project already has GSAP — adding
a second animation library needs justifying. He is logged into the 21st CLI; his plan is free
(2 component downloads/day, marketplace items blocked).

### Suggested order once a direction is picked
1. Rebuild the three featured chapters in the chosen format, keeping the 3D model and animation.
2. Decide what happens to `Chapter.tsx` (keep as an option per project, or delete).
3. Replace the four low-res photos.
4. A real design pass: type scale, spacing, section rhythm (the theme exists, the design doesn't).
5. Scroll-scrubbed SolidWorks image sequences — in the original brief, never started.
6. Accessibility and performance pass on a real phone.

## 10. Open questions for him

- Which layout direction (or mix)? A mixed page — editorial for featured, a horizontal run for
  the smaller projects — is probably the strongest option.
- Should `qtaha@uoguelph.ca` be replaced with a personal address before he graduates?
- Does he want a shorter Vercel address (e.g. `qasim-taha.vercel.app`) or a custom domain?
- Do the other two featured projects deserve 3D models or animations, or stay photo-only?
