export type ThenPhoto = {
  id: string;
  title: string;
  /** Year the photo was taken (best guess). */
  year: number;
  /** Where the camera stood. */
  latitude: number;
  longitude: number;
  /** Compass direction the camera faced (0 = north). Unknown for most archive photos. */
  heading?: number;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  author?: string;
  license?: string;
  sourceUrl: string;
  source: 'commons' | 'curated';
};

export type NearbyPhoto = ThenPhoto & {
  distance: number; // metres from the user
  bearing: number; // compass bearing from the user to the camera spot
};
