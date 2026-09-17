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
- Vite + React 19 + TypeScript + Tailwind CSS v4, shadcn project structure
  (switched from vanilla JS on 2026-09-16 so shadcn/21st.dev-style components can be
  dropped in; the vanilla version is tagged `vanilla-js-version`)
- GSAP + ScrollTrigger (via `@gsap/react` `useGSAP`), Lenis for smooth scroll,
  Three.js for 3D (planned; React Three Fiber is a good fit)
- Git + GitHub, deployed on Vercel

## Adding shadcn / React components
- shadcn config: `components.json`; alias `@/` → `src/`; UI components go in
  `src/components/ui/` (the shadcn default, imported as `@/components/ui/...`);
  `cn()` helper in `src/lib/utils.ts`; icons from `lucide-react`.
- `npx shadcn@latest add <component>` works; it may add theme variables to `src/index.css`.
- Tailwind `dark:` follows the system colour scheme (Tailwind default). Don't add a
  class-based dark variant unless the site gets a theme toggle.

## Code layout
- `index.html` — shell with `#root`; `src/main.tsx` mounts `src/App.tsx`
- `src/App.tsx` — page order: Intro, About, featured Chapters, "More projects" grid, footer.
  Adds `is-animated` to `<main class="site">` when motion is allowed.
- `src/data/projects.ts` — **the only file to edit to add/change projects**; field docs and
  types in `src/data/types.ts`. `featured: true` → pinned chapter; `false` → grid card.
- `src/components/ui/helix-chrono-matrix.tsx` — the intro canvas component (user-supplied),
  with added `showControls` and `children` props, off-screen pause and reduced-motion still frame.
- `src/components/sections/` — `Intro` (uses HelixChronoMatrix, headline "Qasim Taha", no
  controls), `About`, `ContactLinks`
- `src/components/Chapter.tsx` — pinned step-by-step chapter (ScrollTrigger in `useGSAP`);
  shows all steps stacked with inline photos when not animated
- `src/components/ProjectCard.tsx` — grid card (`<details>`), `StepContent.tsx`, `Photo.tsx`
  (responsive lazy WebP; widths in `src/image-widths.json`, shared with the image script)
- `src/components/visuals/` — one component per visual type (`photos`, `placeholder`;
  `sequence`, `model` later), registered in `index.ts`. Props: `{ project, step, progress }`
  where `progress` is a subscribe-able store (`src/lib/progress.ts`) for per-frame visuals.
- `src/hooks/` — `useMediaQuery`/`useMotionAllowed` (dev-only `?reduced-motion` URL flag
  previews the reduced-motion layout), `useSmoothScroll` (Lenis + GSAP ticker)
- `src/styles/site.css` — site styles in `@layer base/components` (so Tailwind utilities
  win). Side-by-side layout applies at
  `(min-width: 768px) and (orientation: landscape), (min-width: 1100px)`; everything else
  (phones, portrait tablets) uses the stacked visual-on-top layout. Tailwind's preflight
  resets lists/headings/links, so site.css sets bullets, heading weight and link underline.

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
- `npm run build` — type-check (`tsc -b`, TypeScript 7) then build; `npm run preview`
- `npm run typecheck`
- On Windows, stopping a background `npm run dev` task can leave `vite` holding port 5173;
  find it with `Get-NetTCPConnection -LocalPort 5173` and stop that process.
- `npm run images` — convert new/changed photos in `content/photos` to WebP

## Status
- Session 1 (2026-09-16): skeleton only — hero, two placeholder chapters with
  coloured boxes, pinned step scrolling, config structure, git init.
  Pushed to GitHub and deployed on Vercel; verified live on desktop and mobile.
- Session 2 (2026-09-16): real content from the PDF portfolio (10 projects, 3 featured + 7 cards), photo
  visual + WebP pipeline, orientation-aware layout. Verified fit at 360x740, 375x667,
  768x1024, 1024x768, 1280x720.
- Session 2 (cont.): user's high-res photos; animated HelixChronoMatrix intro; migrated to
  React + TypeScript + Tailwind + shadcn structure. Re-verified layout at the same sizes,
  every chapter step (pin, text, dot, photo), reduced-motion layout, all 111 photo URLs.
  JS bundle is ~139 KB gzip (was ~58 KB before React).
- Not started yet: visual design pass, image sequences, Three.js model, remaining high-res photos.
