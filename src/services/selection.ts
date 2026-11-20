import { NearbyPhoto } from '../types';

/** Tiny in-memory hand-off between the list and the camera screen. */
let selected: NearbyPhoto | null = null;
export const setSelectedPhoto = (p: NearbyPhoto) => (selected = p);
export const getSelectedPhoto = () => selected;
