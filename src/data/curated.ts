import { ThenPhoto } from '../types';

/**
 * Hand-picked photos with a known camera heading. These give the best
 * experience because the app can tell the user exactly which way to face.
 *
 * Add entries like this (use images you have the rights to):
 * {
 *   id: 'curated:gateway-1911',
 *   title: 'Apollo Bunder',
 *   year: 1911,
 *   latitude: 18.9218, longitude: 72.8347, heading: 20,
 *   imageUrl: 'https://…/full.jpg', thumbUrl: 'https://…/thumb.jpg',
 *   width: 1280, height: 860,
 *   author: '…', license: 'Public domain',
 *   sourceUrl: 'https://…', source: 'curated',
 * },
 */
export const CURATED_PHOTOS: ThenPhoto[] = [];
