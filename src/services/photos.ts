import { CURATED_PHOTOS } from '../data/curated';
import { NearbyPhoto, ThenPhoto } from '../types';
import { fetchCommonsPhotos } from './commons';
import { bearing, distance } from './geo';

export const RADII = [500, 1000, 3000, 10000];
export const ERAS = [1950, 1975, 2000];

export type SearchResult = {
  photos: NearbyPhoto[];
  /** Radius and era that produced `photos` (may be wider than asked). */
  radius: number;
  maxYear: number;
  widened: boolean;
};

/** Everything old-ish within `radius`, tagged with distance and bearing from the user. */
async function fetchAround(lat: number, lon: number, radius: number): Promise<NearbyPhoto[]> {
  let remote: ThenPhoto[] = [];
  try {
    remote = await fetchCommonsPhotos(lat, lon, { radius, maxYear: Math.max(...ERAS) });
  } catch (e) {
    console.warn(e);
    if (CURATED_PHOTOS.length === 0) throw e;
  }
  return [...CURATED_PHOTOS, ...remote]
    .map((p) => ({
      ...p,
      distance: distance(lat, lon, p.latitude, p.longitude),
      bearing: bearing(lat, lon, p.latitude, p.longitude),
    }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Search with the user's radius and era. If nothing turns up, widen the radius
 * (same era) up to 10 km, then relax the era, so the user rarely hits a dead end.
 */
export async function findNearbyPhotos(
  lat: number,
  lon: number,
  opts: { radius: number; maxYear: number },
): Promise<SearchResult> {
  const radii = RADII.filter((r) => r >= opts.radius);
  if (radii.length === 0) radii.push(opts.radius);

  let all: NearbyPhoto[] = [];
  let radius = opts.radius;
  for (radius of radii) {
    all = await fetchAround(lat, lon, radius);
    const matches = all.filter((p) => p.year <= opts.maxYear);
    if (matches.length > 0) {
      return { photos: matches, radius, maxYear: opts.maxYear, widened: radius !== opts.radius };
    }
  }

  // Still nothing at the widest radius: try later eras with what we already fetched.
  for (const maxYear of ERAS.filter((y) => y > opts.maxYear)) {
    const matches = all.filter((p) => p.year <= maxYear);
    if (matches.length > 0) return { photos: matches, radius, maxYear, widened: true };
  }
  return { photos: [], radius, maxYear: opts.maxYear, widened: radius !== opts.radius };
}
