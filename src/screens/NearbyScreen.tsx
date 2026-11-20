import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhotoMap from '../components/PhotoMap';
import { useLocation } from '../hooks/useSensors';
import { commonsImage } from '../services/commons';
import { compassLabel, formatDistance } from '../services/geo';
import { ERAS, findNearbyPhotos, RADII, SearchResult } from '../services/photos';
import { NearbyPhoto } from '../types';

type Props = { onOpen: (photo: NearbyPhoto) => void };
type View_ = 'list' | 'map';

export default function NearbyScreen({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { coords, firstFix, error: locError } = useLocation();
  const [radius, setRadius] = useState(1000);
  const [maxYear, setMaxYear] = useState(1975);
  const [view, setView] = useState<View_>('list');
  const [mapPick, setMapPick] = useState<NearbyPhoto | null>(null);
  // Search from a fixed point (first GPS fix, or where you pulled to refresh),
  // not on every GPS update.
  const [pinned, setPinned] = useState<{ lat: number; lon: number; n: number } | null>(null);
  const origin = pinned ?? (firstFix ? { lat: firstFix.latitude, lon: firstFix.longitude, n: 0 } : null);
  const key = origin ? `${origin.lat},${origin.lon},${origin.n},${radius},${maxYear}` : null;

  const [result, setResult] = useState<{ key: string; data?: SearchResult; error?: string } | null>(null);
  const loading = key != null && result?.key !== key;
  const data = result?.key === key ? result?.data : undefined;
  const error = result?.key === key ? result?.error : undefined;
  const photos = data?.photos ?? [];

  useEffect(() => {
    if (!origin || !key) return;
    let cancelled = false;
    findNearbyPhotos(origin.lat, origin.lon, { radius, maxYear })
      .then((d) => !cancelled && setResult({ key, data: d }))
      .catch((e) => !cancelled && setResult({ key, error: e?.message ?? 'Could not load photos.' }));
    return () => {
      cancelled = true;
    };
    // `key` captures everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = () => {
    const c = coords ?? firstFix;
    if (c) setPinned({ lat: c.latitude, lon: c.longitude, n: (pinned?.n ?? 0) + 1 });
  };

  const widenedNote =
    data?.widened && photos.length > 0
      ? `Nothing within ${formatDistance(radius)} before ${maxYear}. Showing ${formatDistance(data.radius)}` +
        (data.maxYear !== maxYear ? `, before ${data.maxYear}.` : '.')
      : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.brand}>OpenTimeWindow</Text>
          <Text style={styles.tagline}>Stand where they stood. See what they saw.</Text>
        </View>
        <View style={styles.toggle}>
          {(['list', 'map'] as View_[]).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[styles.toggleBtn, view === v && styles.chipActive]}>
              <Text style={[styles.chipText, view === v && styles.chipTextActive]}>{v === 'list' ? 'List' : 'Map'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.chips}>
        {RADII.map((r) => (
          <Chip key={r} label={formatDistance(r)} active={r === radius} onPress={() => setRadius(r)} />
        ))}
      </View>
      <View style={styles.chips}>
        {ERAS.map((y) => (
          <Chip key={y} label={`Before ${y}`} active={y === maxYear} onPress={() => setMaxYear(y)} />
        ))}
      </View>
      {widenedNote && <Text style={styles.widened}>{widenedNote}</Text>}

      {locError ? (
        <Message text={locError} />
      ) : !origin ? (
        <Message text="Finding your location…" spinner />
      ) : error ? (
        <Message text={error} />
      ) : view === 'map' ? (
        <View style={[styles.mapWrap, { marginBottom: insets.bottom + 12 }]}>
          <PhotoMap
            photos={photos}
            user={coords ?? firstFix}
            onSelect={setMapPick}
          />
          {loading && (
            <View style={styles.mapLoading} pointerEvents="none">
              <ActivityIndicator color="#f5e6c8" />
              <Text style={styles.messageText}>Searching further out…</Text>
            </View>
          )}
          {!loading && photos.length === 0 && (
            <View style={styles.mapLoading} pointerEvents="none">
              <Text style={styles.messageText}>No old photos within 10 km yet.</Text>
            </View>
          )}
          {mapPick && (
            <Pressable style={[styles.card, styles.mapCard]} onPress={() => onOpen(mapPick)}>
              <Image source={commonsImage(mapPick.thumbUrl)} style={styles.thumb} />
              <View style={styles.cardBody}>
                <Text style={styles.year}>{mapPick.year}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {mapPick.title}
                </Text>
                <Text style={styles.meta}>
                  {formatDistance(mapPick.distance)} {compassLabel(mapPick.bearing)} · Tap to open
                </Text>
              </View>
              <Pressable onPress={() => setMapPick(null)} hitSlop={12} style={styles.cardClose}>
                <Text style={styles.chipText}>✕</Text>
              </Pressable>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#f5e6c8" />}
          ListHeaderComponent={
            loading && !data ? <Message text="Looking for old photos (widening the search if needed)…" /> : undefined
          }
          ListEmptyComponent={
            loading ? undefined : (
              <Message text="No old photos within 10 km yet. Pull down to search again from where you are now." />
            )
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onOpen(item)}>
              <Image source={commonsImage(item.thumbUrl)} style={styles.thumb} />
              <View style={styles.cardBody}>
                <Text style={styles.year}>{item.year}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {formatDistance(item.distance)} {compassLabel(item.bearing)}
                  {item.heading != null ? ' · direction known' : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Message({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <View style={styles.message}>
      {spinner && <ActivityIndicator color="#f5e6c8" style={{ marginBottom: 12 }} />}
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

const SEPIA = '#f5e6c8';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1b1712', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: '#5a4d3a', borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  widened: { color: '#e0b860', fontSize: 13, marginTop: 2, marginBottom: 4 },
  mapWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  mapLoading: {
    position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
  },
  mapCard: { position: 'absolute', left: 10, right: 10, bottom: 10, marginTop: 0 },
  cardClose: { padding: 10 },
  brand: { color: SEPIA, fontSize: 28, fontWeight: '700', fontFamily: 'serif' },
  tagline: { color: '#b8a888', marginBottom: 14, fontFamily: 'serif', fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#5a4d3a', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: SEPIA, borderColor: SEPIA },
  chipText: { color: SEPIA, fontSize: 13 },
  chipTextActive: { color: '#1b1712', fontWeight: '600' },
  card: { flexDirection: 'row', backgroundColor: '#2a241c', borderRadius: 12, marginTop: 10, overflow: 'hidden' },
  thumb: { width: 110, height: 90, backgroundColor: '#3a3226' },
  cardBody: { flex: 1, padding: 10 },
  year: { color: '#e0b860', fontSize: 18, fontWeight: '700', fontFamily: 'serif' },
  title: { color: SEPIA, fontSize: 14 },
  meta: { color: '#9a8c72', fontSize: 12, marginTop: 4 },
  message: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  messageText: { color: '#b8a888', textAlign: 'center' },
});
