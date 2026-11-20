import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { NearbyPhoto } from '../types';

type Props = {
  photos: NearbyPhoto[];
  user: { latitude: number; longitude: number } | null;
  onSelect: (photo: NearbyPhoto) => void;
};

/**
 * Map of old-photo spots. Leaflet in a WebView with CARTO's dark basemap
 * (OpenStreetMap data), so no Maps API key is needed.
 */
export default function PhotoMap({ photos, user, onSelect }: Props) {
  const html = useMemo(() => buildHtml(photos, user), [photos, user]);

  return (
    <WebView
      style={styles.map}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://opentimewindow.local/' }}
      onMessage={(e) => {
        const photo = photos.find((p) => p.id === e.nativeEvent.data);
        if (photo) onSelect(photo);
      }}
      setSupportMultipleWindows={false}
    />
  );
}

function buildHtml(photos: NearbyPhoto[], user: Props['user']) {
  const data = photos.map((p) => ({ id: p.id, lat: p.latitude, lon: p.longitude, year: p.year }));
  // Keep "</script>" in titles etc. from breaking out of the script tag.
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #1b1712; }
  .pin { background: #f5e6c8; color: #1b1712; font: 700 12px Georgia, serif; border-radius: 10px;
         padding: 2px 6px; border: 2px solid #e0b860; box-shadow: 0 1px 4px rgba(0,0,0,.6); white-space: nowrap; }
  .me { width: 14px; height: 14px; border-radius: 50%; background: #4da3ff; border: 3px solid #fff;
        box-shadow: 0 0 0 6px rgba(77,163,255,.25); }
  .leaflet-control-attribution { background: rgba(0,0,0,.5) !important; color: #b8a888; }
  .leaflet-control-attribution a { color: #e0b860; }
</style>
</head><body><div id="map"></div>
<script>
  var photos = ${json(data)};
  var user = ${json(user ? [user.latitude, user.longitude] : null)};
  var map = L.map('map', { zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  var points = [];
  photos.forEach(function (p) {
    var icon = L.divIcon({ className: '', html: '<div class="pin">' + p.year + '</div>', iconSize: null, iconAnchor: [18, 10] });
    L.marker([p.lat, p.lon], { icon: icon }).addTo(map).on('click', function () {
      window.ReactNativeWebView.postMessage(p.id);
    });
    points.push([p.lat, p.lon]);
  });
  if (user) {
    L.marker(user, { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(map);
    points.push(user);
  }
  if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
  else if (points.length === 1) map.setView(points[0], 16);
  else map.setView([20, 78], 4);
</script></body></html>`;
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#1b1712' },
});
