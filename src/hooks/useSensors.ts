import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';

export function useLocation() {
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [firstFix, setFirstFix] = useState<Location.LocationObjectCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find photos around you.');
        return;
      }
      const s = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1000 },
        (loc) => {
          setCoords(loc.coords);
          setFirstFix((f) => f ?? loc.coords);
        },
      );
      if (cancelled) s.remove();
      else sub = s;
    })().catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { coords, firstFix, error };
}

/** Compass heading in degrees (true north when available). */
export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    Location.watchHeadingAsync((h) => {
      setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
      setAccuracy(h.accuracy);
    })
      .then((s) => (cancelled ? s.remove() : (sub = s)))
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { heading, accuracy };
}

/** Phone tilt: 0° = held upright facing the horizon, positive = tilted up. */
export function useTilt() {
  const [tilt, setTilt] = useState(0);
  useEffect(() => {
    DeviceMotion.setUpdateInterval(100);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return;
      // beta is ~90° when the phone is vertical in portrait.
      setTilt((rotation.beta * 180) / Math.PI - 90);
    });
    return () => sub.remove();
  }, []);
  return tilt;
}
