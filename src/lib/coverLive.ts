/**
 * Decides which tile covers get a live 3D viewer on top of their still image.
 *
 * Building a viewer is the expensive part of the page: a new WebGL context, an
 * environment map and a set of shaders, all compiled on the main thread (a
 * profile of one scroll down the page showed half of all script time inside
 * three.js waiting on shader programs). So viewers are:
 *
 *   - built only while the page is NOT being scrolled, one tile at a time —
 *     during a scroll the still images are all there is, and nothing competes
 *     with the scroll for frames;
 *   - kept once built, even after their tile scrolls away (they stop drawing
 *     there — see ModelLayer), so scrolling back costs nothing;
 *   - thrown away only to stay under `cap` WebGL contexts, least recently
 *     seen first.
 *
 * It lives outside React on purpose: a tile reads its own answer with
 * `useSyncExternalStore`, so the grid itself (ten Framer Motion `layout`
 * tiles, each measured on every render) never re-renders because of a scroll.
 */

/** No scroll for this long counts as "the page is at rest". */
const IDLE_MS = 180;
/** Pause between one tile's viewers being ready and the next tile starting. */
const GAP_MS = 120;
/** Give up waiting for a tile's viewers (slow network) and let the next start. */
const START_TIMEOUT_MS = 5000;

export class CoverLiveScheduler {
  private readonly cap: number;
  /** Tile ids in page order, with how many models (WebGL contexts) each needs. */
  private readonly tiles: Map<string, number>;
  /** How much of each tile is on screen (plus the observer's margin); 0 = none. */
  private ratio = new Map<string, number>();
  /** Tiles with viewers, least recently seen first. */
  private live: string[] = [];
  /** Tiles whose viewer failed (context lost, load error): left as stills. */
  private dead = new Set<string>();
  /** The tile whose viewers are still being built. */
  private starting: string | null = null;
  /** The open tile: its cover is hidden, so it gives its contexts up. */
  private blocked: string | null = null;
  private listeners = new Set<() => void>();
  private lastScroll = 0;
  private timer = 0;
  private startTimer = 0;
  private observer: IntersectionObserver | null = null;

  constructor(tiles: Map<string, number>, cap: number) {
    this.tiles = tiles;
    this.cap = cap;
  }

  // Arrow properties: passed straight to useSyncExternalStore.
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  isLive = (id: string) => this.live.includes(id);

  /** Start watching the tiles inside `grid`. Returns the clean-up. */
  attach(grid: HTMLElement) {
    const onScroll = () => {
      this.lastScroll = performance.now();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          const ratio = entry.isIntersecting ? Math.max(entry.intersectionRatio, 0.01) : 0;
          this.ratio.set(id, ratio);
          // Seen again: it becomes the last one to be thrown away.
          const at = this.live.indexOf(id);
          if (ratio && at !== -1) this.live.push(...this.live.splice(at, 1));
        }
        this.wake();
      },
      // A little past the screen edge, so a viewer is usually ready by the
      // time its tile is fully in view after a slow scroll.
      { rootMargin: '250px 0px', threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );
    for (const id of this.tiles.keys()) {
      const tile = grid.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (tile) this.observer.observe(tile);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      this.observer?.disconnect();
      this.observer = null;
      clearTimeout(this.timer);
      clearTimeout(this.startTimer);
      this.timer = 0;
      this.starting = null;
      this.ratio.clear();
      if (this.live.length) {
        this.live = [];
        this.emit();
      }
    };
  }

  /** A tile's viewers have all drawn their first frame. */
  ready(id: string) {
    if (this.starting !== id) return;
    this.starting = null;
    clearTimeout(this.startTimer);
    this.wake(GAP_MS);
  }

  /** A tile's viewer could not be shown; it keeps its still image for good. */
  failed(id: string) {
    this.dead.add(id);
    if (this.starting === id) {
      this.starting = null;
      clearTimeout(this.startTimer);
    }
    this.drop(id);
    this.wake(GAP_MS);
  }

  /** The open tile (or null): it releases its viewers until it closes. */
  block(id: string | null) {
    if (this.blocked === id) return;
    this.blocked = id;
    if (id) {
      if (this.starting === id) {
        this.starting = null;
        clearTimeout(this.startTimer);
      }
      this.drop(id);
    }
    this.wake();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private drop(id: string) {
    const at = this.live.indexOf(id);
    if (at === -1) return;
    this.live.splice(at, 1);
    this.emit();
  }

  private wake(delay = 0) {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(this.step, delay);
  }

  private step = () => {
    this.timer = 0;
    if (!this.observer || this.starting) return;
    // Still scrolling (or only just stopped): look again once it has settled.
    const sinceScroll = performance.now() - this.lastScroll;
    if (sinceScroll < IDLE_MS) return this.wake(IDLE_MS - sinceScroll + 10);

    // Tiles on screen that have no viewers yet, most visible first (the sort
    // is stable, so page order breaks ties).
    const waiting = [...this.tiles.keys()]
      .filter((id) => (this.ratio.get(id) ?? 0) > 0 && id !== this.blocked && !this.dead.has(id) && !this.live.includes(id))
      .sort((a, b) => (this.ratio.get(b) ?? 0) - (this.ratio.get(a) ?? 0));

    let next: string | null = null;
    let evict: string[] = [];
    for (const id of waiting) {
      // Make room if needed: tiles that are off screen go first (least
      // recently seen first), then one that is clearly less visible than this.
      const cost = this.tiles.get(id) ?? 0;
      const keep = [...this.live];
      const used = () => keep.reduce((sum, k) => sum + (this.tiles.get(k) ?? 0), 0);
      while (keep.length && used() + cost > this.cap) {
        let victim = keep.find((k) => !this.ratio.get(k));
        if (!victim) {
          const least = keep.reduce((p, q) => ((this.ratio.get(p) ?? 0) <= (this.ratio.get(q) ?? 0) ? p : q));
          if ((this.ratio.get(least) ?? 0) < (this.ratio.get(id) ?? 0) - 0.3) victim = least;
        }
        if (!victim) break;
        keep.splice(keep.indexOf(victim), 1);
      }
      // (A tile needing more than the whole cap still gets a turn on its own.)
      if (keep.length && used() + cost > this.cap) continue;
      next = id;
      evict = this.live.filter((k) => !keep.includes(k));
      break;
    }
    if (!next) return;

    this.live = this.live.filter((k) => !evict.includes(k));
    this.live.push(next);
    this.starting = next;
    this.startTimer = window.setTimeout(() => {
      if (this.starting !== next) return;
      this.starting = null;
      this.wake();
    }, START_TIMEOUT_MS);
    this.emit();
  };
}
