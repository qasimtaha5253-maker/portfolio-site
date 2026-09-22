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
- `src/components/visuals/` — `ModelLayer.tsx` (Three.js .glb viewer) and `EmbedLayer.tsx`
  (HTML animation in an iframe).
- `src/components/sections/` — `Intro` (uses HelixChronoMatrix, headline "Qasim Taha", no
  controls), `About`, `ContactLinks`.
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
- Most photos are the user's originals. Still PDF-extracted (low-res): coffee-cup-gripper/
  built-gripper, hydraulic-hand/part-drawing, reef-rover/collection-mechanism, and
  conveyor-cart/shaft-assembly-render (now only the reduced-motion fallback). The user will
  send replacements; don't chase him for them.
- Cooling unit: `final-design` is the dimensioned towable cart (the actual final design);
  `interim-concept` is the earlier solar-lid concept the team pivoted away from.

## Step visuals
A step in projects.ts can show a photo (`image`), a standalone HTML animation (`embed`), a
rotatable 3D model (`model`), or several side by side (`split`).
- `embed: { src: 'animations/<file>.html?v=N', title }` — file lives in public/animations/,
  runs in an iframe so its CSS/JS can't clash. Bump `?v=N` after editing the file or browsers
  serve the cached copy. `cart-section.html` is user-authored in his own tool; see handoff.md §7
  before touching it (background must be `--surface`, and two helper hooks must stay).
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
  Priority: `split` > `stack` > `model` > `embed` > `image`.
- Cooling unit (showpiece): model → section animation → CFD plot + strawberry flat → model.
  Conveyor cart has an animated model on its "Reverse engineering the line" step.
- Camera framing in `ModelLayer` is symmetric horizontally but centred on the model's true
  vertical midpoint; always seed `camera.position` as `fixedDirection.add(target)`. It fits the
  model's height and swing radius but not the camera's downward tilt, so a wide, low model can get
  its near edge cropped as it spins: give that model a `margin` in its config (multiplier on camera
  distance; the gripper uses 1.25). Don't "fix" this globally — an exact fit zooms every existing
  model out 30–40% (tried and reverted).
- A model can play a looping animation of its parts: `animation: '<name>'` in its config, run by
  `src/components/visuals/modelAnimations.ts` (a plain GSAP timeline, no ScrollTrigger; loaded on
  demand, only plays while on screen, off under reduced motion). Currently three:
  `ptu-gear-cutting` (cutter, sliding and turning gear group), `oiling-sensor` (sensor lowered
  1.25 in and raised) and `conveyor-shaft` (the drive-shaft sub-assembly turned 90° and back).
  Directions/axes are derived in handoff.md §7, and a dev-only `window.__gearCuttingTest()`
  checks the gear one. **Node names: three.js sanitizes every one on load** (whitespace → `_`;
  `[ ] . : /` are deleted, not replaced) — match against the sanitized form, not the name a
  gltf-transform-based inspector script reports; see handoff.md §7, "Node names three.js actually
  produces" for two real bugs this caused. Add new animations as a case in `createModelAnimation`
  plus a name in `ModelAnimationName` (types.ts).
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
  full size on its first step and side by side on its cover. Six WebGL canvases are live on the page at
  load, so measure phone performance before adding more cover models.
- The "Choosing a concept" step was deleted from Cooling Unit at his request; don't reintroduce it.
- Contact on the public site: LinkedIn + email only (no phone number). The email
  (`qtaha@uoguelph.ca`) will be replaced before he graduates; not urgent.
- Text is condensed from the user's PDF; keep steps short.
- Custom domain is deliberately the last step; don't raise it early.

## Hosting
- Repo: https://github.com/qasimtaha5253-maker/portfolio-site (branch `main`)
- Live site (Vercel, auto-deploys on push to `main`):
  https://portfolio-site-qasim-1db5.vercel.app/
- Project lives at `C:\Users\qasim\Documents\portfolio-site` (moved out of OneDrive; don't
  move it back — OneDrive syncing `node_modules` caused file locks).
- Push automatically once a change builds and passes checks, then report what went live.
  Vercel can take several minutes to publish.

## Commands
- `npm run dev` — dev server, exposed on the local network (open from phone)
- `npm run build` — type-check (`tsc -b`, TypeScript 7) then build; run before every push.
  `npm run preview` serves the build.
- `npm run typecheck`
- `npm run images` — convert new/changed photos in `content/photos` to WebP
- `npm run model -- <in.glb> <out.glb>` — compress a 3D model (see Step visuals)
- On Windows, stopping a background `npm run dev` task can leave `vite` holding port 5173;
  find it with `Get-NetTCPConnection -LocalPort 5173` and stop that process.

## Verifying in the Browser pane
The Claude Browser pane pauses rendering (rAF, ResizeObserver, animations) when it isn't the
displayed pane, so screenshots can be blank or frozen mid-animation and `javascript_tool`
calls that wait on rAF can time out. Check DOM state (class lists, `getBoundingClientRect`,
element counts) before concluding something is broken, and say so when something couldn't be
verified. `?reduced-motion` on the dev URL previews the reduced-motion layout.

## Status
- 2026-09-18: bento grid is the live site on `main`. Pinned-chapter code, its CSS and the
  `visual` config field have been deleted.
- Open items (see handoff.md §8): the reduced-motion layout has only been checked via the dev
  flag and DOM, never in a real browser with the OS setting on; no Lighthouse/performance
  run yet on the bento version; the four `gallery` photos on the Small Fixtures & Tooling project are not
  rendered by the bento tile (only used as cover candidates).
