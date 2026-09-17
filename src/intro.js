/**
 * Full-screen opening animation: stacked, counter-rotating rings drawn in
 * perspective with a double-helix wave. Rings near the pointer brighten and
 * ripple; small particles travel along the rings.
 *
 * Vanilla-JS port of the "HelixChronoMatrix" React component (Double Helix
 * mode only, no controls). Follows the system light/dark theme, pauses while
 * off-screen, and draws a single still frame when reduced motion is preferred.
 */

const RING_COUNT = 28;
const POINTS_PER_RING = 120;
const PARTICLE_COUNT = 45;
const FOV = 600;
const CAMERA_DIST = 550;
const POINTER_RADIUS = 220;

const THEMES = {
  light: { bg: '#f4f4f1', stroke: '15, 23, 42', excited: '0, 0, 0', dot: '#ffffff', dotHover: '#000000', dotEdge: 'rgba(0,0,0,0.4)' },
  dark: { bg: '#090a0f', stroke: '255, 255, 255', excited: '255, 255, 255', dot: '#000000', dotHover: '#ffffff', dotEdge: 'rgba(255,255,255,0.4)' },
};

export function initIntro(section) {
  const canvas = section.querySelector('canvas');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!ctx) return;

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const pointer = { x: -2000, y: -2000, targetX: -2000, targetY: -2000 };
  let width = 0;
  let height = 0;
  let rings = [];
  let particles = [];
  let time = 0;
  let frame = 0;
  let visible = true;

  function buildRings() {
    rings = [];
    for (let r = 0; r < RING_COUNT; r++) {
      const progress = r / RING_COUNT;
      rings.push({
        vy: new Float32Array(POINTS_PER_RING),
        excitation: new Float32Array(POINTS_PER_RING),
        radius: Math.min(width, height) * 0.35 * (0.4 + progress * 0.6),
        yOffset: (progress - 0.5) * (height * 0.45),
        rotationSpeed: (r % 2 === 0 ? 1 : -1) * (0.002 + progress * 0.0025),
        angle: (r * Math.PI) / RING_COUNT,
        harmonicOffset: r * 0.2,
      });
    }
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      ringIndex: Math.floor(Math.random() * RING_COUNT),
      progress: Math.random(),
      speed: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 1.5 + 1.5,
    }));
  }

  // Point on a ring (3D, double-helix wave) projected to the screen.
  function project(ring, theta, extraY = 0) {
    const x = Math.cos(theta) * ring.radius;
    const z = Math.sin(theta) * ring.radius;
    const y = ring.yOffset + Math.sin(theta * 2 + time * 2 + ring.harmonicOffset) * 45;
    const scale = FOV / (CAMERA_DIST + z);
    return { x: width / 2 + x * scale, y: height / 2 + (y + extraY) * scale, scale };
  }

  function draw() {
    const theme = darkQuery.matches ? THEMES.dark : THEMES.light;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    pointer.x += (pointer.targetX - pointer.x) * 0.1;
    pointer.y += (pointer.targetY - pointer.y) * 0.1;

    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const ring = rings[rIdx];
      ring.angle += ring.rotationSpeed;
      let avgExcitation = 0;

      ctx.beginPath();
      for (let p = 0; p < POINTS_PER_RING; p++) {
        const theta = (p / POINTS_PER_RING) * Math.PI * 2 + ring.angle;
        const pt = project(ring, theta, ring.vy[p]);

        const dist = Math.hypot(pt.x - pointer.x, pt.y - pointer.y);
        if (dist < POINTER_RADIUS && dist > 0) {
          const ratio = 1 - dist / POINTER_RADIUS;
          ring.vy[p] += (Math.sin(theta + time) * ratio * 15 - ring.vy[p]) * 0.1;
          ring.excitation[p] = Math.max(ring.excitation[p], ratio);
        } else {
          ring.vy[p] *= 0.92;
        }
        ring.excitation[p] *= 0.92;
        avgExcitation += ring.excitation[p];

        if (p === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      avgExcitation /= POINTS_PER_RING;
      if (avgExcitation > 0.05) {
        ctx.strokeStyle = `rgba(${theme.excited}, ${Math.min(1, 0.4 + avgExcitation * 0.6)})`;
        ctx.lineWidth = 1.2 + avgExcitation * 1.5;
      } else {
        const depthAlpha = 0.15 + (rIdx / rings.length) * 0.45;
        ctx.strokeStyle = `rgba(${theme.stroke}, ${depthAlpha * 0.6})`;
        ctx.lineWidth = 0.75;
      }
      ctx.stroke();
    }

    // Particles ride along the rings; they invert colour near the pointer.
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = theme.dotEdge;
    for (const particle of particles) {
      particle.progress = (particle.progress + particle.speed + 1) % 1;
      const ring = rings[particle.ringIndex];
      if (!ring) continue;
      const pt = project(ring, particle.progress * Math.PI * 2 + ring.angle);
      const near = Math.hypot(pt.x - pointer.x, pt.y - pointer.y) < POINTER_RADIUS;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, particle.size * pt.scale, 0, Math.PI * 2);
      ctx.fillStyle = near ? theme.dotHover : theme.dot;
      ctx.fill();
      ctx.stroke();
    }
  }

  function loop() {
    time += 0.012;
    draw();
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (frame || motionQuery.matches || !visible) return;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  // Draw once (for reduced motion, or right after a resize/theme change).
  function drawStill() {
    if (!frame) draw();
  }

  function resize(w, h) {
    if (w === width && h === height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = w;
    height = h;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildRings();
    drawStill();
  }

  resize(section.clientWidth, section.clientHeight);
  new ResizeObserver(([entry]) => {
    resize(entry.contentRect.width, entry.contentRect.height);
  }).observe(section);

  // Only animate while the intro is on screen.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(section);

  motionQuery.addEventListener('change', () => {
    stop();
    start();
    drawStill();
  });
  darkQuery.addEventListener('change', drawStill);

  section.addEventListener('pointermove', (e) => {
    const rect = section.getBoundingClientRect();
    pointer.targetX = e.clientX - rect.left;
    pointer.targetY = e.clientY - rect.top;
  });
  section.addEventListener('pointerleave', () => {
    pointer.targetX = -2000;
    pointer.targetY = -2000;
  });

  start();
}
