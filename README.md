# OpenTimeWindow

Stand where they stood. See what they saw.

Point your phone at a street and see it as it looked decades ago. OpenTimeWindow finds old,
geotagged photos near you, walks you to the spot where the photographer stood, and lays the
old photo over your live camera view.

## Features (v0.2)

- **Nearby old photos** from [Wikimedia Commons](https://commons.wikimedia.org), filtered by era
  (before 1950 / 1975 / 2000) and radius (500 m to 10 km).
- **Never a dead end**: if nothing turns up, the search widens (up to 10 km, then later eras) and says so.
- **Map view** of old-photo spots around you (Leaflet + OpenStreetMap/CARTO tiles, no API key needed).
- **Walk-to-spot guidance**: distance and a compass arrow that points to where the camera stood.
- **Alignment help**: when a photo's camera direction is known (curated photos), the app tells you
  which way to turn, plus a tilt hint.
- **Two ways to compare**: *Fade* (opacity slider between now and then) and *Wipe* (drag a divider).
- **Fine-tune**: drag to move the old photo, pinch to resize, ↺ to reset.
- Author and license credit on every photo, linking to the source.

## Get the APK

Every push to `main` builds an APK with GitHub Actions. Download it from the latest
[Release](../../releases) on your Android phone and open it to install.

## Run locally

```bash
npm install
npx expo run:android   # needs Android Studio / SDK; Expo Go is not enough (native camera + sensors)
```

Checks: `npx tsc --noEmit` and `npx expo lint`.

## Project layout

```
src/app/            Expo Router screens (index = nearby list, window = camera view)
src/screens/        Screen components
src/components/     Map (WebView + Leaflet)
src/services/       Commons API, geo math, photo search
src/hooks/          Location, compass heading, tilt
src/data/curated.ts Hand-picked photos with known camera direction
```

## Adding curated photos

Archive photos usually record where the camera stood but not which way it faced. Add photos with a
known `heading` to `src/data/curated.ts` to get turn-by-turn alignment. Only use images you have the
rights to.
