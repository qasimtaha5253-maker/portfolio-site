/**
 * Decides which tile covers get a live 3D viewer on top of their still image.
 *
 * The aim: a model is already turning when its tile first comes into view.
 * Building a viewer takes a moment (download the model, a new WebGL context,
 * shaders), so each tile's viewers are built AHEAD of the visitor — as soon as
 * the tile is within two screens of the viewport, nearest first, one tile at a
 * time (their model files are fetched in parallel, straight away) — and then
 * kept, so scrolling back never rebuilds anything.
 * A viewer is thrown away only to stay under `cap` WebGL contexts, the tile
 * farthest from the screen first. If the browser takes a context away anyway
 * (its own limit is lower than ours), the cap drops to what it tolerated. The still image is what shows in the
 * (normally unseen) time before a viewer is ready, and on devices that get no
 * live covers at all.
 *
 * Nothing is built until the page itself has loaded and gone idle, so this
 * never competes with the intro for the first seconds.
 *
 * It lives outside React on purpose: a tile reads its own answer with
 * `useSyncExternalStore`, so the grid itself (ten Framer Motion `layout`
 * tiles, each measured on every render) never re-renders because of a scroll.
 */

/** How far beyond the screen a tile's viewers start being built (top and bottom). */
const AHEAD = '200% 0px';
/** Pause between one tile's viewers being ready and the next tile starting. */
const GAP_MS = 80;
/** Give up waiting for a tile's viewers (slow network) and let the next start. */
const START_TIMEOUT_MS = 6000;

export class CoverLiveScheduler {
  private cap: number;
  /** Tile ids in page order, with how many models (WebGL contexts) each needs. */
  private readonly tiles: Map<string, number>;
  private elements = new Map<string, HTMLElement>();
  /** Tiles on screen or within `AHEAD` of it. */
  private wanted = new Set<string>();
  /** Tiles with viewers. */
  private live: string[] = [];
  /** Tiles whose viewer failed twice (context lost, load error): left as stills. */
  private dead = new Set<string>();
  private failures = new Map<string, number>();
  /** The tile whose viewers are still being built. */
  private starting: string | null = null;
  /** The open tile: its cover is hidden, so it gives its contexts up. */
  private blocked: string | null = null;
  private listeners = new Set<() => void>();
  /** False until the page has loaded and gone idle. */
  private enabled = false;
  private attached = false;
  private timer = 0;
  private startTimer = 0;
  /** Starts downloading a tile's model files (called once per tile). */
  private readonly preload: (id: string) => void;
  private preloadedTiles = new Set<string>();

  constructor(tiles: Map<string, number>, cap: number, preload: (id: string) => void) {
    this.tiles = tiles;
    this.cap = cap;
    this.preload = preload;
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
    this.attached = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.wanted.add(entry.target.id);
          else this.wanted.delete(entry.target.id);
        }
        this.preloadWanted();
        this.wake();
      },
      { rootMargin: AHEAD },
    );
    for (const id of this.tiles.keys()) {
      const tile = grid.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!tile) continue;
      this.elements.set(id, tile);
      observer.observe(tile);
    }

    // Wait for the page's own start-up to finish before building anything.
    let idle = 0;
    const enable = () => {
      this.enabled = true;
      this.preloadWanted();
      this.wake();
    };
    const whenIdle = () => {
      idle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(enable, { timeout: 2000 })
          : window.setTimeout(enable, 600); // Safari
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });

    return () => {
      this.attached = false;
      this.enabled = false;
      observer.disconnect();
      window.removeEventListener('load', whenIdle);
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      else clearTimeout(idle);
      clearTimeout(this.timer);
      clearTimeout(this.startTimer);
      this.timer = 0;
      this.starting = null;
      this.elements.clear();
      this.wanted.clear();
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

  /** A tile's viewer could not be shown (its model failed to load, or the
   *  browser took its WebGL context away). It gets one more try later; after
   *  a second failure it keeps its still image for good. */
  failed(id: string) {
    const count = (this.failures.get(id) ?? 0) + 1;
    this.failures.set(id, count);
    if (count >= 2) this.dead.add(id);
    // Usually this is the browser's limit on live WebGL contexts, which
    // differs between browsers and isn't published: settle for what was
    // live without this tile.
    const used = this.live.reduce((sum, k) => sum + (this.tiles.get(k) ?? 0), 0);
    if (this.live.includes(id)) this.cap = Math.max(1, Math.min(this.cap, used - (this.tiles.get(id) ?? 1)));
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

  private preloadWanted() {
    if (!this.enabled) return;
    for (const id of this.wanted) {
      if (this.preloadedTiles.has(id) || this.live.includes(id) || this.dead.has(id)) continue;
      this.preloadedTiles.add(id);
      this.preload(id);
    }
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

  /** How far a tile is from the screen, in px (0 = at least partly on it). */
  private distance(id: string) {
    const tile = this.elements.get(id);
    if (!tile) return Infinity;
    const rect = tile.getBoundingClientRect();
    if (rect.bottom < 0) return -rect.bottom;
    if (rect.top > window.innerHeight) return rect.top - window.innerHeight;
    return 0;
  }

  private step = () => {
    this.timer = 0;
    if (!this.attached || !this.enabled || this.starting) return;

    const waiting = [...this.tiles.keys()].filter(
      (id) => this.wanted.has(id) && id !== this.blocked && !this.dead.has(id) && !this.live.includes(id),
    );
    if (!waiting.length) return;
    // One layout read for all the tiles involved, then nearest first (the
    // sort is stable, so page order breaks ties).
    const far = new Map([...waiting, ...this.live].map((id) => [id, this.distance(id)]));
    waiting.sort((a, b) => far.get(a)! - far.get(b)!);

    let next: string | null = null;
    let keep = this.live;
    for (const id of waiting) {
      // Make room if needed: the tile farthest from the screen goes, as
      // long as it is off screen and clearly farther away than the tile
      // wanting its place (so two tiles either side of the screen don't
      // keep taking each other's place).
      const cost = this.tiles.get(id) ?? 0;
      const kept = [...this.live];
      const used = () => kept.reduce((sum, k) => sum + (this.tiles.get(k) ?? 0), 0);
      while (kept.length && used() + cost > this.cap) {
        const farthest = kept.reduce((p, q) => (far.get(q)! > far.get(p)! ? q : p));
        if (far.get(farthest)! < far.get(id)! + 200) break;
        kept.splice(kept.indexOf(farthest), 1);
      }
      // (A tile needing more than the whole cap still gets a turn on its own.)
      if (kept.length && used() + cost > this.cap) continue;
      next = id;
      keep = kept;
      break;
    }
    if (!next) return;

    this.live = [...keep, next];
    this.starting = next;
    this.startTimer = window.setTimeout(() => {
      if (this.starting !== next) return;
      this.starting = null;
      this.wake();
    }, START_TIMEOUT_MS);
    this.emit();
  };
}
