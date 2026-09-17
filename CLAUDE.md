# Portfolio Site — Project Brief

Personal engineering portfolio for a Mechanical Engineering co-op student at the
University of Guelph. The user gives direction; Claude writes the code and explains
anything the user must do on their end in plain terms.

## Concept
- Single-page scrollytelling portfolio. Must work well on mobile and desktop.
- Opens on an introduction/hero section about the user.
- Each project is a "chapter." On scroll, the chapter pins and steps through
  sub-sections one at a time: Introduction -> How it works -> What it achieved
  (some projects may have more steps). When the steps finish, it unpins and the
  next project comes in. Should feel continuous and smooth.
- Desktop: visual pinned on one side, text steps changing on the other.
  Mobile: visual sticky at the top, text steps below it.
- Every project will have photos. Some will have scroll-driven CAD animations
  (exploded views / parts assembling). Plan: most use scroll-scrubbed image
  sequences rendered from SolidWorks; one showpiece uses a real-time .glb model in
  Three.js where parts move along explode vectors as you scroll.
- Data-driven: each project is defined in one config file (title, steps, images,
  animation type), so adding a project never requires touching animation code.
- Respect `prefers-reduced-motion` (all content readable without animation).
- Performance matters on phones: WebP images, lazy loading.

## Stack
- Vite + vanilla HTML/CSS/JavaScript (no React)
- GSAP + ScrollTrigger, Lenis for smooth scroll, Three.js for 3D
- Git + GitHub, deployed on Vercel

## Code layout
- `index.html` — page shell: hero/intro, `#chapters`, `#more-projects-grid`, footer
- `src/data/projects.js` — **the only file to edit to add/change projects** (shape documented at top).
  `featured: true` → pinned scrollytelling chapter; `false` → card in the "More projects" grid.
- `src/chapters.js` — builds featured chapters from the config
- `src/cards.js` — builds the "More projects" grid (`<details>` cards, no JS needed)
- `src/step-content.js` — shared rendering of step body / bullets / stats
- `src/scroll.js` — Lenis + GSAP ScrollTrigger pinning/step logic
- `src/visuals/` — one module per visual type (`photos`, `placeholder`; `sequence`, `model`
  later). Each exports `create(project)` returning `{ el, setProgress(stepIndex, progress) }`,
  registered in `src/visuals/index.js`.
- `src/images.js` — responsive lazy `<img>` helper; widths in `src/image-widths.js`
- `src/style.css` — layout and reduced-motion rules. Side-by-side layout applies at
  `(min-width: 768px) and (orientation: landscape), (min-width: 1100px)`; everything else
  (phones, portrait tablets) uses the stacked visual-on-top layout.

## Photos
- Source photos: `content/photos/<project-id>/<name>.(jpg|png|...)`
- `npm run images` converts them to `public/projects/<project-id>/<name>-{480,960,1600}.webp`
  (commit both). Config refers to photos by `<name>` only.
- The script has no pixel limit (SolidWorks renders can be huge, e.g. 24000×19000), refuses
  to run if two files in a folder share a name, and deletes WebP files whose source is gone.
- Most photos are now the user's originals. Still PDF-extracted (low-res): coffee-cup-gripper/
  built-gripper, conveyor-cart/shaft-assembly-render, hydraulic-hand/part-drawing,
  reef-rover/collection-mechanism.
- Cooling unit: `final-design` is the dimensioned towable cart (the actual final design);
  `interim-concept` is the earlier solar-lid concept the team pivoted away from.

## Content decisions
- Featured (pinned chapters): Cooling Unit, Conveyor Cart, Coffee Cup Gripper. The other 7 are grid cards.
- Contact on the public site: LinkedIn + email only (no phone number).
- Text is condensed from the user's PDF; keep steps short enough to fit a 375x667 phone
  when pinned (tallest step must not push the progress dots off-screen).

## Hosting
- Repo: https://github.com/qasimtaha5253-maker/portfolio-site (branch `main`)
- Live site (Vercel, auto-deploys on push to `main`):
  https://portfolio-site-qasim-1db5.vercel.app/
- Project lives at `C:\Users\qasim\Documents\portfolio-site` (moved out of OneDrive).

## Commands
- `npm run dev` — dev server, exposed on the local network (open from phone)
- `npm run build` / `npm run preview`
- `npm run images` — convert new/changed photos in `content/photos` to WebP

## Status
- Session 1 (2026-09-16): skeleton only — hero, two placeholder chapters with
  coloured boxes, pinned step scrolling, config structure, git init.
  Pushed to GitHub and deployed on Vercel; verified live on desktop and mobile.
- Session 2 (2026-09-16): real content from the PDF portfolio (10 projects, 3 featured + 7 cards), photo
  visual + WebP pipeline, orientation-aware layout. Verified fit at 360x740, 375x667,
  768x1024, 1024x768, 1280x720.
- Not started yet: visual design pass, image sequences, Three.js model, high-res photos.
