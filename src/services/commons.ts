import { ThenPhoto } from '../types';

/**
 * Finds old, geotagged photos on Wikimedia Commons near a point.
 * Commons stores the camera position for many photos, which is exactly
 * what we need: it tells the user where to stand.
 */
const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Wikimedia rejects (HTTP 403) requests with generic user agents such as
 * Android's default "okhttp/x". Their policy asks for an app name plus contact URL.
 * https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
 */
export const WIKIMEDIA_USER_AGENT =
  'OpenTimeWindow/0.1 (https://github.com/manishekhawat/OpenTimeWindow) react-native';
export const WIKIMEDIA_HEADERS = {
  'User-Agent': WIKIMEDIA_USER_AGENT,
  'Api-User-Agent': WIKIMEDIA_USER_AGENT,
};

/** Image source for Commons files, carrying the required user agent. */
export const commonsImage = (uri: string) => ({ uri, headers: WIKIMEDIA_HEADERS });

const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Pull a plausible year (1826–2099) out of free-form date text or categories. */
export function guessYear(...texts: (string | undefined)[]): number | undefined {
  for (const t of texts) {
    const m = stripHtml(t).match(/\b(18[2-9]\d|19\d\d|20\d\d)s?\b/);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

/**
 * Only categories that describe when the photo was taken, e.g. "1920s photographs of Mumbai"
 * or "1911 in Bombay". Skips ones like "Buildings completed in 1890", which describe the subject.
 */
export function yearFromCategories(categories?: string): number | undefined {
  for (const c of (categories ?? '').split('|')) {
    const name = c.replace(/_/g, ' ').trim();
    const m =
      name.match(/^(18[2-9]\d|19\d\d|200\d)s? (in|photographs)\b/i) ??
      name.match(/^(?:Photographs|Black and white photographs|Photos) (?:taken )?in (18[2-9]\d|19\d\d|200\d)s?\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

export async function fetchCommonsPhotos(
  lat: number,
  lon: number,
  opts: { radius?: number; maxYear?: number } = {},
): Promise<ThenPhoto[]> {
  const radius = Math.min(opts.radius ?? 1000, 10000); // API max is 10 km
  const maxYear = opts.maxYear ?? 1975;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${lat}|${lon}`,
    ggsradius: String(radius),
    ggslimit: '500', // more candidates: most nearby files are modern
    ggsnamespace: '6', // File: namespace
    prop: 'imageinfo|coordinates',
    colimit: 'max', // default is only 10 pages' coordinates per response
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1280',
    iiextmetadatafilter:
      'DateTimeOriginal|DateTime|ObjectName|Artist|LicenseShortName|Categories',
  });

  // Commons may split image details across several responses ("continue"); merge them by page.
  const pagesById = new Map<number, any>();
  let cont: Record<string, string> | undefined = {};
  for (let i = 0; cont && i < 8; i++) {
    const res: Response = await fetch(`${API}?${params}&${new URLSearchParams(cont)}`, { headers: WIKIMEDIA_HEADERS });
    if (!res.ok) throw new Error(`Commons request failed (${res.status})`);
    const json: any = await res.json();
    for (const p of json?.query?.pages ?? []) {
      const prev = pagesById.get(p.pageid) ?? {};
      pagesById.set(p.pageid, {
        ...prev,
        ...p,
        imageinfo: p.imageinfo ?? prev.imageinfo,
        coordinates: p.coordinates ?? prev.coordinates,
      });
    }
    cont = json?.continue;
  }
  const pages = [...pagesById.values()];

  const photos: ThenPhoto[] = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    const coord = p.coordinates?.[0];
    if (!info || !coord || !String(info.mime).startsWith('image/')) continue;
    const meta = info.extmetadata ?? {};
    // Trust the capture date first; the upload date is useless here.
    const year = guessYear(meta.DateTimeOriginal?.value) ?? yearFromCategories(meta.Categories?.value);
    if (!year || year > maxYear) continue;

    photos.push({
      id: `commons:${p.pageid}`,
      title: stripHtml(meta.ObjectName?.value) || p.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
      year,
      latitude: coord.lat,
      longitude: coord.lon,
      imageUrl: info.thumburl ?? info.url,
      thumbUrl: info.thumburl ?? info.url,
      width: info.thumbwidth ?? info.width,
      height: info.thumbheight ?? info.height,
      author: stripHtml(meta.Artist?.value) || undefined,
      license: stripHtml(meta.LicenseShortName?.value) || undefined,
      sourceUrl: info.descriptionurl,
      source: 'commons',
    });
  }
  return photos;
}
