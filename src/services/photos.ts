import { CURATED_PHOTOS } from '../data/curated';
import { NearbyPhoto, ThenPhoto } from '../types';
import { fetchCommonsPhotos } from './commons';
import { bearing, distance } from './geo';

export async function findNearbyPhotos(
  lat: number,
  lon: number,
  opts: { radius?: number; maxYear?: number } = {},
): Promise<NearbyPhoto[]> {
  const radius = opts.radius ?? 1000;
  let remote: ThenPhoto[] = [];
  try {
    remote = await fetchCommonsPhotos(lat, lon, opts);
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
    .filter((p) => p.distance <= radius && p.year <= (opts.maxYear ?? 1975))
    .sort((a, b) => a.distance - b.distance);
}
