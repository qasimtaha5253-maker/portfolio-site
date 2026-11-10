/**
 * A rough "how much can this device handle" tier, used to decide how many
 * live 3D views to run at once and at what pixel density.
 *
 *   full  a desktop or a recent phone — the default when the browser says nothing
 *   mid   a phone/laptop with 4 GB or 4 cores or fewer (Chrome reports both, rounded)
 *   lite  2 GB / 2 cores or fewer, or the visitor asked for data saving — tile
 *         covers stay as still images, 3D only appears inside an opened tile
 *
 * Only Chromium reports memory. Safari reports cores but clamps the number (an
 * iPhone says 4 or fewer whatever it has), so without a memory figure the core
 * count only pulls a device down to `mid`, and only below 4: iPhones land in
 * `full`, which they are fast enough for. Dev only: `?device=lite` / `?device=mid`
 * in the URL forces a tier for testing.
 */
export type DeviceTier = 'full' | 'mid' | 'lite';

function detect(): DeviceTier {
  if (typeof navigator === 'undefined') return 'full';
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(location.search).get('device');
    if (forced === 'lite' || forced === 'mid' || forced === 'full') return forced;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return 'lite';
  const memory = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  if (memory === undefined) return cores !== undefined && cores < 4 ? 'mid' : 'full';
  if (memory <= 2 || (cores !== undefined && cores <= 2)) return 'lite';
  if (memory <= 4 || (cores !== undefined && cores <= 4)) return 'mid';
  return 'full';
}

let cached: DeviceTier | undefined;

export function deviceTier(): DeviceTier {
  return (cached ??= detect());
}

/** How many WebGL contexts the tile covers may hold at once. Viewers are built
 *  ahead of the visitor and kept after their tile scrolls away (see
 *  src/lib/coverLive.ts); they only draw while on screen, so this is a memory
 *  limit, not a how-many-are-turning limit. The page has nine cover models: a
 *  full-tier device keeps them all (as the site always did before the stills),
 *  a mid-tier one keeps the nearest few. */
export function maxLiveCoverViews(tier = deviceTier()): number {
  const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
  if (tier === 'full') return 9;
  if (tier === 'mid') return phone ? 3 : 4;
  return 0;
}

/** Pixel density cap for a 3D view: covers are small and slow-turning, so they
 *  get less than a step's own (interactive) model. */
export function pixelRatioCap(interactive: boolean, tier = deviceTier()): number {
  if (tier === 'lite') return 1;
  if (tier === 'mid') return interactive ? 1.5 : 1.25;
  return interactive ? 2 : 1.5;
}
