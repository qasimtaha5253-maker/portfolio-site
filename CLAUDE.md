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
- `index.html` — page shell (hero + empty `#chapters` container)
- `src/data/projects.js` — **the only file to edit to add/change projects**
- `src/chapters.js` — builds chapter DOM from the config
- `src/scroll.js` — Lenis + GSAP ScrollTrigger pinning/step logic
- `src/visuals/` — one module per visual type (`placeholder` now; `image`,
  `sequence`, `model` later). Each exports `create(visual)` returning
  `{ el, setProgress(stepIndex, progress) }`, registered in `src/visuals/index.js`.
- `src/style.css` — layout (desktop split / mobile sticky) and reduced-motion rules

## Commands
- `npm run dev` — dev server, exposed on the local network (open from phone)
- `npm run build` / `npm run preview`

## Status
- Session 1 (2026-09-16): skeleton only — hero, two placeholder chapters with
  coloured boxes, pinned step scrolling, config structure, git init.
- Not started yet: real content, visual design, image sequences, Three.js model.
