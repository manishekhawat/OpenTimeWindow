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
import { useLocation } from '../hooks/useSensors';
import { compassLabel, formatDistance } from '../services/geo';
import { findNearbyPhotos } from '../services/photos';
import { NearbyPhoto } from '../types';

const RADII = [500, 1000, 3000, 10000];
const ERAS = [
  { label: 'Before 1950', max: 1950 },
  { label: 'Before 1975', max: 1975 },
  { label: 'Before 2000', max: 2000 },
];

type Props = { onOpen: (photo: NearbyPhoto) => void };

export default function NearbyScreen({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { coords, firstFix, error: locError } = useLocation();
  const [radius, setRadius] = useState(1000);
  const [maxYear, setMaxYear] = useState(1975);
  // Search from a fixed point (first GPS fix, or where you pulled to refresh),
  // not on every GPS update.
  const [pinned, setPinned] = useState<{ lat: number; lon: number; n: number } | null>(null);
  const origin = pinned ?? (firstFix ? { lat: firstFix.latitude, lon: firstFix.longitude, n: 0 } : null);
  const key = origin ? `${origin.lat},${origin.lon},${origin.n},${radius},${maxYear}` : null;

  const [result, setResult] = useState<{ key: string; photos?: NearbyPhoto[]; error?: string } | null>(null);
  const loading = key != null && result?.key !== key;
  const photos = result?.key === key ? result?.photos : undefined;
  const error = result?.key === key ? result?.error : undefined;

  useEffect(() => {
    if (!origin || !key) return;
    let cancelled = false;
    findNearbyPhotos(origin.lat, origin.lon, { radius, maxYear })
      .then((p) => !cancelled && setResult({ key, photos: p }))
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

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.brand}>OpenTimeWindow</Text>
      <Text style={styles.tagline}>Stand where they stood. See what they saw.</Text>

      <View style={styles.chips}>
        {RADII.map((r) => (
          <Chip key={r} label={formatDistance(r)} active={r === radius} onPress={() => setRadius(r)} />
        ))}
      </View>
      <View style={styles.chips}>
        {ERAS.map((e) => (
          <Chip key={e.max} label={e.label} active={e.max === maxYear} onPress={() => setMaxYear(e.max)} />
        ))}
      </View>

      {locError ? (
        <Message text={locError} />
      ) : !origin ? (
        <Message text="Finding your location…" spinner />
      ) : error ? (
        <Message text={error} />
      ) : (
        <FlatList
          data={photos ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#f5e6c8" />}
          ListEmptyComponent={
            loading ? undefined : (
              <Message text="No old photos found here yet. Try a wider radius or a later era." />
            )
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => onOpen(item)}>
              <Image source={{ uri: item.thumbUrl }} style={styles.thumb} />
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
