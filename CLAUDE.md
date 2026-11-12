# Portfolio Site — Project Brief

> See `handoff.md` for current state, lessons learned (read §7 before touching the expand
> animation, scroll-follow, 3D framing or the model script) and next steps.

Personal engineering portfolio for a Mechanical Engineering co-op student at the
University of Guelph. The user gives direction; Claude writes the code and explains
anything the user must do on their end in plain terms (he is not a web developer).

## Concept
- Single-page portfolio: Intro (animated canvas) -> About -> a bento grid of projects -> footer.
  Must work well on mobile and desktop.
- **Bento grid:** every project is a same-sized tile (two columns × two rows) in one grid.
  Tapping a tile expands it in place to show its steps (Introduction -> How it
  works -> What it achieved, or whatever the project needs), each with its own photo, 3D model,
  HTML animation or side-by-side split. Tapping again, or another tile, collapses it.
- A project with a 3D model shows that live model as its tile cover, turning on its own (no hover
  needed; paused while the tile is open or scrolled off-screen, and still under reduced motion).
  If its first model step is a `split` or `stack` of models, all of them
  sit side by side on the cover (Small Fixtures & Tooling has three).
- Data-driven: each project is defined in one config file (title, steps, images, models,
  animations), so adding a project never requires touching component code.
- Respect `prefers-reduced-motion`: no tile reveal or expand animation, and every step falls
  back to its plain photo.
- Performance matters on phones: WebP images, lazy loading, 3D code loaded on demand.
- History: the site used to be a pinned, block-by-block scrollytelling layout. The user
  disliked it and it was replaced by the bento grid (2026-09-18). The old version is tagged
  `pinned-chapter-version`; the vanilla-JS original is tagged `vanilla-js-version`.
- Scroll-scrubbed SolidWorks image sequences were considered and decided against. CAD visuals
  are 3D models or HTML animations.

## Stack
- Vite + React 19 + TypeScript + Tailwind CSS v4, shadcn project structure.
- **React is pinned to 19.2.8 on purpose**: Motion 13.4.0 crashes on React 19.3.0 ("Invalid hook
  call"). Don't upgrade React without checking Motion supports the new version first. The
  package.json uses `^`, so `npm update` would pull 19.3; the lockfile is what holds it.
- `motion` (Framer Motion) for the tile expand/collapse (`layout` + `AnimatePresence`).
- GSAP + ScrollTrigger (via `@gsap/react` `useGSAP`) for the tile scroll-reveal and the
  intro/About crossfade; Lenis for smooth scroll (`useSmoothScroll` returns the Lenis ref).
- Three.js for 3D models, loaded on demand (its own ~187 KB gzip chunk).
- Git + GitHub, deployed on Vercel.

## Adding shadcn / React components
- shadcn config: `components.json`; alias `@/` → `src/`; UI components go in
  `src/components/ui/` (the shadcn default, imported as `@/components/ui/...`);
  `cn()` helper in `src/lib/utils.ts`; icons from `lucide-react`.
- `npx shadcn@latest add <component>` works; it may add theme variables to `src/index.css`.
- The site is ALWAYS dark: `<html class="dark">` in index.html, and index.css defines
  `@custom-variant dark` so Tailwind's `dark:` follows that class, not the system setting.
  The intro canvas reads the same class. Shadcn components should work unchanged.

## Code layout
- `index.html` — shell with `#root`; `src/main.tsx` mounts `src/App.tsx`.
- `src/App.tsx` — page order: Intro, About, BentoGrid (`#work`), footer (`#contact`).
- `src/data/projects.ts` — **the only file to edit to add/change projects**; field docs and
  types in `src/data/types.ts`. `featured` is currently unused (all tiles are the same size).
- `src/components/BentoGrid.tsx` — the whole grid: tiles, expand/collapse (Framer Motion),
  scroll-follow to the opening tile (Lenis, re-measured every frame), scroll-reveal (GSAP),
  cover models that spin on their own, deferred mounting of heavy visuals until the expand settles.
- `src/components/StepVisual.tsx` — a step's own visual inside an expanded tile. Priority when
  a step sets several: `split` > `model` > `embed` > `image`. Reduced motion: always `image`.
- `src/components/StepContent.tsx` — body / stats / bullets. `Photo.tsx` — responsive lazy WebP
  `<img>`; widths in `src/image-widths.json` (shared with the image script); adds
  `is-transparent` from `src/transparent-photos.json`.
- `src/components/SectionIndicator.tsx` — the "About me — Projects" pill fixed to the bottom of
  the screen while About is being read (added 2026-11-12 at his request, so visitors know to keep
  scrolling). Shown only while About crosses the middle of the screen and the projects don't;
  "Projects" is a plain `#work` link, which Lenis's `anchors: true` turns into a smooth scroll.
- `src/components/visuals/` — `ModelLayer.tsx` (Three.js .glb viewer), `EmbedLayer.tsx`
  (HTML animation in an iframe) and `VideoLayer.tsx` (a plain looping `<video>`).
- `src/components/sections/` — `Intro` (uses HelixChronoMatrix, headline "Qasim Taha", no
  controls), `About`, `ContactLinks`, `ResumePreview`, `Certifications` (data in
  `src/data/certifications.ts`).
- `src/components/ui/helix-chrono-matrix.tsx` — the intro canvas component (user-supplied),
  with added `showControls` and `children` props, off-screen pause and reduced-motion still frame.
- `src/hooks/` — `useMediaQuery`/`useMotionAllowed` (dev-only `?reduced-motion` URL flag
  previews the reduced-motion layout), `useSmoothScroll` (Lenis + GSAP ticker),
  `useScrollFade` (scroll-scrubbed opacity; the intro fades out as About fades in).
- `src/styles/site.css` — site styles in `@layer base/components` (so Tailwind utilities win).
  Tailwind's preflight resets lists/headings/links, so site.css sets bullets, heading weight
  and link underline. Grid is 4 columns (2 under 900px); every tile spans 2 columns.
  **`.bento-tile__hit` uses `all: unset`, which strips the native focus outline** — it has an
  explicit `:focus-visible` outline; check for the same side effect anywhere else `all: unset`
  is used.

## Theme
- Always dark, matching the intro: `--bg #090a0f`, `--surface #14161f` (tiles, stat boxes),
  `--fg #f2f3f5`, `--muted #9aa0ad`, `--accent #fb923c` (orange), `--navy #3b5cc4`.
- `--photo-bg #ffffff`: opaque photos get a white panel (set on the img, not the container).
  Transparent cut-out renders are listed in `src/transparent-photos.json` (written by
  `npm run images`) and get `is-transparent`, so they sit straight on the dark page.
- Small labels (eyebrow, tile context, stat labels) use `--font-mono` uppercase, echoing the
  intro type.
- Intro gradient stops live in `src/components/sections/Intro.tsx`.

## Photos
- Source photos: `content/photos/<project-id>/<name>.(jpg|png|...)`
- `npm run images` converts them to `public/projects/<project-id>/<name>-{480,960,1600}.webp`
  (commit both). Config refers to photos by `<name>` only.
- The script has no pixel limit (SolidWorks renders can be huge, e.g. 24000×19000), refuses
  to run if two files in a folder share a name, and deletes WebP files whose source is gone.
- Most photos are the user's originals. Still PDF-extracted (low-res), waiting on replacements:
  hydraulic-hand/part-drawing and reef-rover/collection-mechanism. The user will
  send replacements; don't chase him for them.
- Cooling unit: `final-design` is the dimensioned towable cart (the actual final design);
  `interim-concept` is the earlier solar-lid concept the team pivoted away from.

## Step visuals
A step in projects.ts can show a photo (`image`), a standalone HTML animation (`embed`), a
looping video (`video`), a rotatable 3D model (`model`), or several side by side (`split`).
- `embed: { src: 'animations/<file>.html?v=N', title }` — file lives in public/animations/,
  runs in an iframe so its CSS/JS can't clash. Bump `?v=N` after editing the file or browsers
  serve the cached copy. `cart-section.html` is user-authored in his own tool; see handoff.md §7
  before touching it (background must be `--surface`, and two helper hooks must stay).
- `video: { src: 'animations/<file>.mp4', poster?, title }` — public/animations/. A plain,
  silent, looping `<video>` (`VideoLayer.tsx`; same on-screen-only playback and reduced-motion
  fallback as the other visuals). For a numbered frame-sequence export (e.g. a SolidWorks Motion
  Study's `.tga` frames): `npm run video -- content/animations/<name> public/animations/<name>.mp4
  --fps <N> [--width 1280] [--poster]` (`scripts/optimize-video.mjs`) encodes H.264/MP4 with
  `ffmpeg-static` (bundled, no system ffmpeg needed) — that one container plays natively
  everywhere, including iOS Safari, so there's no second `<source>` to maintain. Keep the raw
  frames in `content/animations/<name>/` (gitignored — a sequence can be 1 GB+). `--poster` also
  writes a WebP still of frame 0 for the `poster` attribute.
- `model: { src: 'models/<file>.glb', title }` — public/models/. `ModelLayer.tsx` loads
  three.js + GLTFLoader + OrbitControls on demand. Self-rotates (12°/s, time-based so it's the
  same on any refresh rate — always pass elapsed time to `controls.update()`); drag rotates with
  mouse or finger; pauses when off-screen; no self-rotation under reduced motion.
- `npm run model -- <in.glb> <out.glb> [--ratio 0.2] [--no-resize] [--no-instance]` cleans and
  quantizes an export (three reads quantized meshes natively — no decoder download). It handles
  Draco-compressed sources and drops textures whose bytes don't match their declared MIME type.
  Keep source exports in `content/models/` (gitignored). **`--no-instance` skips turning repeated
  parts into GPU instances — required for a model whose animation looks a part up by name if
  that part is duplicated elsewhere in the file** (the default instancing pass collapses
  duplicates into anonymous batch nodes with no named children left to find; see handoff.md §7,
  "Conveyor shaft").
- `split: [{ image } | { model }, ...]` — several visuals side by side in one row (small).
  `stack: [...]` — several visuals one under another, each full size (Small Fixtures uses it).
  Priority: `split` > `stack` > `model` > `embed` > `video` > `image`.
- Cooling unit (showpiece): model → section animation → CFD plot + strawberry flat → model.
  Conveyor cart has an animated model on its "Reverse engineering the line" step.
- Camera framing in `ModelLayer` is symmetric horizontally but centred on the model's true
  vertical midpoint; always seed `camera.position` as `fixedDirection.add(target)`. It fits the
  model's height and swing radius but not the camera's downward tilt, so a wide, low model can get
  its near edge cropped as it spins: give that model a `margin` in its config (multiplier on camera
  distance; the gripper uses 1.25). Don't "fix" this globally — an exact fit zooms every existing
  model out 30–40% (tried and reverted).
- A source export that wasn't saved upright gets `rotation: [x, y, z]` in its config (Euler XYZ
  degrees, applied once before framing/centring — a fixed correction, not an ongoing tilt). The
  Meccano car ball launcher needed this (`[68.83, 27.793, 39.712]`, worked out from the wheels'
  and a chassis part's own geometry, not guessed — see handoff.md §7, "Meccano car orientation").
- A model can play a looping animation of its parts: `animation: '<name>'` in its config, run by
  `src/components/visuals/modelAnimations.ts` (a plain GSAP timeline, no ScrollTrigger; loaded on
  demand, only plays while on screen, off under reduced motion). Currently seven (the five below,
  plus `oiling-tool-coil` and `crank-rotate`, both in handoff.md §6/§7b):
  `ptu-gear-cutting` (cutter, sliding and turning gear group), `oiling-sensor` (sensor lowered
  1.25 in and raised), `conveyor-shaft` (the drive-shaft sub-assembly turned 90° and back),
  `shaft-puller` (adaptor A pulled in, sleeve down, then both back out) and `propeller-spin` (the
  toy plane's propeller, spinning continuously about its own hub axis — the only one of the five
  that never stops/reverses; see handoff.md §7 for how its axis was found from the mesh's own
  local geometry, not the node's placement transform).
  Directions/axes are derived in handoff.md §7, and a dev-only `window.__gearCuttingTest()`
  checks the gear one. **Node names: three.js sanitizes every one on load** (whitespace → `_`;
  `[ ] . : /` are deleted, not replaced) — match against the sanitized form, not the name a
  gltf-transform-based inspector script reports; see handoff.md §7, "Node names three.js actually
  produces" for two real bugs this caused. Add new animations as a case in `createModelAnimation`
  plus a name in `ModelAnimationName` (types.ts).
- **3D performance (2026-11-09; full reasoning in handoff.md §7e and §7f — read them before
  touching how covers mount).** Every cover model is a **still image first**
  (`public/models/stills/`, rendered by the dev tool at `tools/stills.html` — re-render after any
  change to a cover model, its config, ModelLayer's camera/lighting or the tile shape). The live
  `ModelLayer` is built over the still **ahead of the visitor** — once the tile is within two
  screens of the viewport, nearest first, one tile at a time, starting when the page has loaded and
  gone idle (`src/lib/coverLive.ts`) — then kept. **He requires a model to be already turning when
  its tile first appears; a still that is visible while scrolling is not acceptable** (handoff.md
  §7h). Viewers are evicted only to stay under a per-device cap (`src/lib/device.ts`: 9 on a
  full-tier device, 4/3 on `mid`, none on `lite` or under reduced motion; disposal uses
  `forceContextLoss`). The scheduler is an external store read with `useSyncExternalStore`, so
  scrolling never re-renders the grid. Viewers share one environment map (read back from the
  first), whose shaders are pre-compiled in the background through PMREMGenerator's private fields
  — re-check that after any three.js upgrade (handoff.md §7h). Covers draw at ~30 fps
  and a capped pixel ratio; a tile's cover is released 400 ms after the tile opens (`coverFreed`);
  there is no separate prefetch — the scheduler preloads the model files of tiles it is about to
  build (`preloadModel()` in ModelLayer.tsx). A lost WebGL context or failed load falls back to
  the step's photo (covers keep their still).
- Lighting is one shared setup (tone-mapping exposure 0.68). A model whose pale parts wash out to
  white gets `brightness` in its config (multiplier on that exposure; the three Small Fixtures
  models use 0.5). Applies to the cover too, unlike `margin`.
- A resize wipes the WebGL canvas, so `ModelLayer` redraws once after every resize (otherwise a
  still cover model is blank after its tile is expanded and closed).

## Content decisions
- All tiles are the same size (the Cooling Unit's), set at the user's request 2026-09-20.
- Coffee Cup Gripper has its 3D model on its first step and as its tile cover; the user may add an
  animation later.
- The saw fixture model there is animated (`animation: 'ptu-gear-cutting'`; see Step visuals).
- Small Fixtures & Tooling has three 3D models (shaft tool, saw fixture, oiling fixture) stacked
  full size on its first step and side by side on its cover. Up to nine cover canvases end up live
  as you scroll down the page (see "3D performance" under Step visuals), so measure phone performance
  before adding more cover models.
- The "Choosing a concept" step was deleted from Cooling Unit at his request; don't reintroduce it.
- Contact links are centred, in About and the footer. About: LinkedIn + email (the resume preview
  card covers the resume there). Footer: LinkedIn, Resume, email (`qasim.taha5253@gmail.com`, switched from
  his Guelph address at his request 2026-11-12). **No phone number** anywhere on the site.
- **Resume** (added 2026-11-12): the "Resume" link (in `ContactLinks`, so it shows in About and the
  footer) opens `public/Qasim-Taha-Resume.pdf`, built by `npm run resume` from
  `content/resume/resume.tex`. That .tex is the web copy of his own LaTeX resume with the phone
  number removed and a PDF title added; his standard version (with phone) stays off the repo.
  About also shows a thumbnail card of the top of page 1, to the right of the About text above
  900px wide and under it on phones (he found it too tall below the text) (`ResumePreview.tsx`,
  `public/resume-preview-{400,800}.webp`), rendered from the PDF by the same script.
  To update: apply his edits to the web .tex (keep the phone out), `npm run resume`, commit the
  .tex, PDF and both previews. Needs `pdflatex` and `pdftoppm`; a cloud session must install them
  (`texlive-latex-extra texlive-fonts-extra texlive-plain-generic tex-gyre poppler-utils` via apt;
  output was checked text- and font-identical to his PDF).
- **About text** was rewritten by him 2026-11-12 (one paragraph: Guelph 2027, CSWP, design loop,
  3D-printing side business, manufacturing side). Use his wording; don't re-add the old second
  paragraph.
- **Certifications** (added 2026-11-12) sit under About in a row of cards: CSWP plus three
  SOLIDWORKS Associate certificates (Electrical Design, Sustainability, Additive Manufacturing).
  Each card has its badge (cut from the certificate by `scripts/extract-cert-badge.py`), a link to
  the certificate PDF (`public/certifications/<slug>.pdf`) and "Verify", the issuer's page from the
  certificate's QR code. His CSWA (Nov. 2023, on his resume) isn't shown: no certificate file yet.
- Text is condensed from the user's PDF; keep steps short.
- Custom domain is deliberately the last step; don't raise it early.
- Kinder Toy Plane's "Process" step has a video of the assembly exploding apart (from a SolidWorks
  Motion Study frame sequence); the `plane-exploded` photo stays as the reduced-motion fallback.
  Its "Idea" step (and, automatically, its tile cover) has a 3D model with the propeller spinning
  continuously (`animation: 'propeller-spin'`); `plane-photo` stays as the reduced-motion fallback.
- Meccano Car Ball Launcher's "Idea" step (and, automatically, its tile cover) has a 3D model —
  needs the `rotation` correction above; `car-photo` stays as the reduced-motion fallback.

## Hosting
- Repo: https://github.com/qasimtaha5253-maker/portfolio-site (branch `main`)
- Live site (Vercel, auto-deploys on push to `main`): **https://qtaha.com** (his own domain, DNS
  pointed at Vercel) — https://portfolio-site-qasim-1db5.vercel.app/ also still works.
- Project lives at `C:\Users\qasim\Documents\portfolio-site` (moved out of OneDrive; don't
  move it back — OneDrive syncing `node_modules` caused file locks).
- Push automatically once a change builds and passes checks, then report what went live.
  Vercel can take several minutes to publish. Exception: changes he'll judge by feel on his phone
  (3D, scrolling, animation) go to a preview branch first and are merged when he says so
  (handoff.md §2).
- **Always push to `main`, in cloud sessions too** (his standing instruction, 2026-11-12: "always
  push on main"). A cloud session is handed its own branch; this is his explicit permission to
  override that: once a change builds and passes checks, merge it into `main` and push `main` so
  it goes live. The preview-branch exception above still applies.
- Work can happen in a cloud session or on his PC; GitHub is the meeting point. Some jobs need his
  PC (model exports, cover stills, GPU checks) — **handoff.md §12** says which. Read it first if
  you are a cloud session.

## Commands
- `npm run dev` — dev server, exposed on the local network (open from phone)
- `npm run build` — type-check (`tsc -b`, TypeScript 7) then build; run before every push.
  `npm run preview` serves the build.
- `npm run typecheck`
- `npm run images` — convert new/changed photos in `content/photos` to WebP
- `npm run model -- <in.glb> <out.glb>` — compress a 3D model (see Step visuals)
- `npm run video -- <frames-dir> <out.mp4>` — encode a frame sequence to video (see Step visuals)
- `npm run resume` — rebuild the resume PDF from `content/resume/resume.tex` (see Content decisions)
- On Windows, stopping a background `npm run dev` task can leave `vite` holding port 5173;
  find it with `Get-NetTCPConnection -LocalPort 5173` and stop that process.

## Verifying in the Browser pane
The Claude Browser pane pauses rendering (rAF, ResizeObserver, animations) when it isn't the
displayed pane, so screenshots can be blank or frozen mid-animation and `javascript_tool`
calls that wait on rAF can time out. Check DOM state (class lists, `getBoundingClientRect`,
element counts) before concluding something is broken, and say so when something couldn't be
verified. `?reduced-motion` on the dev URL previews the reduced-motion layout.

## Status
- 2026-09-23: bento grid is the live site on `main`, now at its own domain (qtaha.com). The About
  area's Experience section was removed at his request. Four projects (Cooling Unit, Conveyor
  Cart, Coffee Cup Gripper, Oiling Tool) now use a new expandable content system — "What?" points
  collapse into a tappable summary card, "How?" bullets group into small stat-box-styled mini-cards
  with always-visible spec previews, "Results" bullets hide behind a "View Details" button (see
  handoff.md §8 for the full system and which field combination goes where). The other 6 projects
  still use plain bullets — not done yet, not declined, just not asked for. A first shadcn
  component (Button) was integrated, including the theme tokens it needed (handoff.md §9). Five
  more projects picked up a stat box pulled from existing copy (ANSYS, Reef Rover, Hydraulic Hand,
  Meccano Launcher, plus a correction on Coffee Cup Gripper's). The conveyor cart gained a new
  animated 3D model (its crank handle) and moved its main model to the "What?" step. (See
  handoff.md §6 for the current state of each project, §7 for the model-animation recipe and the
  bugs found this pass, §8–9 for the two new systems.)
- 2026-11-09: Vercel Web Analytics added (`<Analytics />` in `main.tsx`; he must still enable it
  in the Vercel dashboard — unconfirmed). The "Tap a project to see how it works" hint is now a
  gradient callout box styled like the stat tiles. A performance pass on 3D loading and scrolling
  (lazy cover set-up, 30 fps covers, cover released while its tile is open, idle prefetch) went
  live after he reported lag; unverified on a real phone. (The film-grain overlay question raised
  then is settled: it was removed on `perf-pass`, see the third-pass bullet below.)
- 2026-11-09, later — branch `perf-pass` (**merged into `main` the same day, at his say-so, after
  the fourth pass below**): second performance pass (handoff.md §7f).
  Cover stills + rationed live views, device tiers, lazy grid chunk, `preload="none"` videos,
  lighter helix loop, WebGL context-loss fallback. Lighthouse mobile 79 -> 97, 4.1 MB -> 0.5 MB.
  (The stills-first behaviour described here was changed twice more before the merge; the bullets
  below and handoff.md §7h describe what is live.)
- Next up (see handoff.md §11 for detail): replace the two still-low-res photos once he sends
  them, then add 3D models/animations for the remaining photo-only projects (ANSYS, Reef Rover,
  Hydraulic Hand). The custom domain is done (qtaha.com, live) — no longer on this list.
- 2026-11-09, third pass on `perf-pass` (handoff.md §7g) after he said "still laggy": Vercel had
  never built the branch preview, so he was on the old site — but a scroll profile also showed the
  second pass rebuilt 3D viewers mid-scroll. Now: viewers build only at rest and are kept, shared
  environment map, async shader compile, the invisible film-grain overlay is gone (measured: at most
  3/255 difference), helix capped near 60 fps. (Its "build only at rest" rule was replaced in the
  fourth pass, below.)
- 2026-11-09, fourth pass on `perf-pass` (handoff.md §7h): he rejected the third pass's
  stills-while-scrolling ("ruins the entire aesthetic"). Covers are now built ahead of the scroll
  and model files preloaded in parallel; the first-viewer freeze is gone. Measured: every model
  live at first sight after 3 s on the intro, zero long tasks while scrolling, Lighthouse 96, but
  2.8 MB transferred on a phone's first load (models for the first tiles, in the background).
- Open debts (handoff.md §10): the performance work is live but was measured only in headless
  Chrome on a fast desktop, never profiled on a real phone (he tried the preview and said to merge);
  reduced-motion layout only checked via the dev flag and DOM, never a real browser with the OS
  setting on; still-image sizes not tuned; CSS is render-blocking.
