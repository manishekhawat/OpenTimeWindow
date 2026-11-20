import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeading, useLocation, useTilt } from '../hooks/useSensors';
import { angleDiff, bearing, compassLabel, distance, formatDistance } from '../services/geo';
import { NearbyPhoto } from '../types';

type Mode = 'fade' | 'wipe';
const ARRIVED_METRES = 25;
const ALIGNED_DEGREES = 8;

type Props = { photo: NearbyPhoto; onClose: () => void };

export default function TimeWindowScreen({ photo, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const { coords } = useLocation();
  const { heading } = useHeading();
  const tilt = useTilt();

  const [mode, setMode] = useState<Mode>('fade');
  const [opacity, setOpacity] = useState(0.6);
  const [wipeX, setWipeX] = useState(W / 2);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  // Base size: fit the photo to the screen width, centred vertically.
  const baseW = W;
  const baseH = (W * photo.height) / Math.max(photo.width, 1);

  const overlayGestures = useOverlayGestures(setTransform);
  const wipeGestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (e) => setWipeX(Math.max(0, Math.min(W, e.nativeEvent.pageX))),
      }),
    [W],
  );

  if (!permission) return <View style={styles.black} />;
  if (!permission.granted) {
    return (
      <View style={[styles.black, styles.center]}>
        <Text style={styles.permText}>OpenTimeWindow needs the camera to show the past on top of the present.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const guidance = getGuidance(photo, coords, heading, tilt);
  const image = (
    <Image
      source={{ uri: photo.imageUrl }}
      resizeMode="contain"
      style={{
        position: 'absolute',
        width: baseW,
        height: baseH,
        left: 0,
        top: (H - baseH) / 2,
        transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }],
      }}
    />
  );

  return (
    <View style={styles.black}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* The past */}
      <View style={StyleSheet.absoluteFill} {...overlayGestures.panHandlers}>
        {mode === 'fade' ? (
          <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
            {image}
          </View>
        ) : (
          <View style={[styles.wipeClip, { width: wipeX }]} pointerEvents="none">
            <View style={{ width: W, height: H }}>{image}</View>
          </View>
        )}
      </View>

      {mode === 'wipe' && (
        <View style={[styles.wipeHandleZone, { left: wipeX - 22 }]} {...wipeGestures.panHandlers}>
          <View style={styles.wipeLine} />
          <View style={styles.wipeKnob}>
            <Text style={styles.wipeKnobText}>⟷</Text>
          </View>
        </View>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Pressable onPress={onClose} style={styles.roundBtn} hitSlop={10}>
          <Text style={styles.roundBtnText}>✕</Text>
        </Pressable>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{photo.year}</Text>
        </View>
        <Pressable
          onPress={() => setTransform({ x: 0, y: 0, scale: 1 })}
          style={styles.roundBtn}
          hitSlop={10}
        >
          <Text style={styles.roundBtnText}>↺</Text>
        </Pressable>
      </View>

      {/* Guidance */}
      <View style={[styles.guide, { top: insets.top + 60 }]} pointerEvents="none">
        {guidance.arrow != null && (
          <Text style={[styles.arrow, { transform: [{ rotate: `${guidance.arrow}deg` }] }]}>↑</Text>
        )}
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.guideTitle, guidance.done && { color: '#9be29b' }]}>{guidance.title}</Text>
          {!!guidance.detail && <Text style={styles.guideDetail}>{guidance.detail}</Text>}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.photoTitle} numberOfLines={1}>
          {photo.title}
        </Text>
        <View style={styles.modeRow}>
          {(['fade', 'wipe'] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === 'fade' ? 'Fade' : 'Wipe'}
              </Text>
            </Pressable>
          ))}
        </View>
        {mode === 'fade' && (
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Now</Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={1}
              value={opacity}
              onValueChange={setOpacity}
              minimumTrackTintColor="#e0b860"
              maximumTrackTintColor="#6b5d45"
              thumbTintColor="#f5e6c8"
            />
            <Text style={styles.sliderLabel}>{photo.year}</Text>
          </View>
        )}
        <Text style={styles.hint}>Drag to move the old photo, pinch to resize it.</Text>
        <Pressable onPress={() => Linking.openURL(photo.sourceUrl)}>
          <Text style={styles.credit} numberOfLines={1}>
            {[photo.author, photo.license].filter(Boolean).join(' · ') || 'Source'} ↗
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type Guidance = { title: string; detail?: string; arrow?: number; done?: boolean };

function getGuidance(
  photo: NearbyPhoto,
  coords: { latitude: number; longitude: number; accuracy: number | null } | null,
  heading: number | null,
  tilt: number,
): Guidance {
  if (!coords) return { title: 'Finding you…' };

  const d = distance(coords.latitude, coords.longitude, photo.latitude, photo.longitude);
  if (d > ARRIVED_METRES) {
    const b = bearing(coords.latitude, coords.longitude, photo.latitude, photo.longitude);
    return {
      title: `Walk ${formatDistance(d)} ${compassLabel(b)}`,
      detail: 'Go to where the photographer stood',
      arrow: heading != null ? angleDiff(heading, b) : undefined,
    };
  }

  const tiltHint = Math.abs(tilt) > 12 ? (tilt > 0 ? 'Tilt the phone down a little' : 'Tilt the phone up a little') : undefined;

  if (photo.heading == null || heading == null) {
    return {
      title: "You're at the spot",
      detail: tiltHint ?? 'Turn slowly until the old scene lines up',
      done: true,
    };
  }

  const turn = angleDiff(heading, photo.heading);
  if (Math.abs(turn) <= ALIGNED_DEGREES) {
    return { title: 'Lined up', detail: tiltHint ?? 'Fine-tune by dragging and pinching', arrow: 0, done: true };
  }
  return {
    title: `Turn ${turn > 0 ? 'right' : 'left'} ${Math.round(Math.abs(turn))}°`,
    detail: `Face ${compassLabel(photo.heading)}`,
    arrow: turn,
  };
}

type Transform = { x: number; y: number; scale: number };

/** One finger drags the overlay, two fingers pinch-zoom it. */
function useOverlayGestures(setTransform: Dispatch<SetStateAction<Transform>>) {
  const [responder] = useState(() => {
    // Gesture bookkeeping lives in this closure; it's only touched inside handlers.
    let lastDx = 0;
    let lastDy = 0;
    let lastPinch: number | null = null;
    let pinched = false;

    const touchDistance = (e: GestureResponderEvent) => {
      const [a, b] = e.nativeEvent.touches;
      return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastDx = 0;
        lastDy = 0;
        lastPinch = null;
        pinched = false;
      },
      onPanResponderMove: (e, g) => {
        if (e.nativeEvent.touches.length >= 2) {
          pinched = true;
          const dist = touchDistance(e);
          if (lastPinch != null) {
            const ratio = dist / lastPinch;
            setTransform((t) => ({ ...t, scale: Math.max(0.3, Math.min(5, t.scale * ratio)) }));
          }
          lastPinch = dist;
        } else if (!pinched) {
          // Don't jump the photo when lifting one finger after a pinch.
          const ddx = g.dx - lastDx;
          const ddy = g.dy - lastDy;
          lastDx = g.dx;
          lastDy = g.dy;
          setTransform((t) => ({ ...t, x: t.x + ddx, y: t.y + ddy }));
        }
      },
    });
  });
  return responder;
}

const SEPIA = '#f5e6c8';
const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText: { color: SEPIA, textAlign: 'center', fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: SEPIA, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#1b1712', fontWeight: '700' },
  link: { color: '#b8a888' },
  topBar: {
    position: 'absolute', left: 0, right: 0, top: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16,
  },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtnText: { color: SEPIA, fontSize: 18 },
  yearBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  yearText: { color: '#e0b860', fontSize: 22, fontWeight: '700', fontFamily: 'serif' },
  guide: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: 12,
  },
  arrow: { color: '#e0b860', fontSize: 34, fontWeight: '700', width: 34, textAlign: 'center' },
  guideTitle: { color: SEPIA, fontSize: 17, fontWeight: '700' },
  guideDetail: { color: '#cfc2a6', fontSize: 13, marginTop: 2 },
  wipeClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  wipeHandleZone: { position: 'absolute', top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  wipeLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: SEPIA },
  wipeKnob: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: SEPIA,
    alignItems: 'center', justifyContent: 'center',
  },
  wipeKnobText: { color: '#1b1712', fontSize: 18, fontWeight: '700' },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoTitle: { color: SEPIA, fontFamily: 'serif', fontSize: 15, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  modeBtn: { borderWidth: 1, borderColor: '#6b5d45', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  modeBtnActive: { backgroundColor: SEPIA, borderColor: SEPIA },
  modeText: { color: SEPIA },
  modeTextActive: { color: '#1b1712', fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { color: '#cfc2a6', fontSize: 12, width: 36, textAlign: 'center' },
  hint: { color: '#9a8c72', fontSize: 12, marginTop: 4 },
  credit: { color: '#9a8c72', fontSize: 11, marginTop: 4, textDecorationLine: 'underline' },
});
