import { cutout, CutoutResult } from 'expo-cutout';
import * as ImagePicker from 'expo-image-picker';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Checkerboard background — fills the full preview so transparency is obvious
// ---------------------------------------------------------------------------
const CELL = 12;

function Checkerboard({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cols = size.w > 0 ? Math.ceil(size.w / CELL) : 0;
  const rows = size.h > 0 ? Math.ceil(size.h / CELL) : 0;

  return (
    <View
      style={styles.checkerWrap}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}>
      <View style={styles.checkerGrid} pointerEvents="none">
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.checkerRow}>
            {Array.from({ length: cols }).map((_, c) => (
              <View
                key={c}
                style={[
                  styles.checkerCell,
                  (r + c) % 2 === 0 ? styles.checkerLight : styles.checkerDark,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; label: string }
  | { kind: 'done'; result: CutoutResult; source: string }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);

  async function pickAndCutout(maxDimension?: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPhase({ kind: 'error', message: 'Photo library permission denied.' });
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (picked.canceled || !picked.assets.length) return;

    const asset = picked.assets[0];
    const label = maxDimension
      ? maxDimension === Number.MAX_SAFE_INTEGER
        ? 'Full resolution'
        : `Max ${maxDimension}px`
      : 'Default (2 048 px)';

    setPhase({ kind: 'loading', label });

    try {
      const result = await cutout(asset.uri, maxDimension ? { maxDimension } : undefined);
      setPhase({ kind: 'done', result, source: asset.uri });
    } catch (err: any) {
      setPhase({ kind: 'error', message: err?.message ?? String(err) });
    }
  }

  async function saveCutoutToGallery(uri: string) {
    if (saving) return;
    setSaving(true);
    try {
      // writeOnly — only need permission to add to the library
      const permission = await requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save the cutout to your gallery.');
        return;
      }

      await Asset.create(uri);
      Alert.alert('Saved', 'Cutout PNG saved to your photo library.');
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Text style={styles.title}>expo-cutout</Text>
          <Text style={styles.subtitle}>iOS Vision background remover</Text>

          {/* Platform warning */}
          {Platform.OS !== 'ios' && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ expo-cutout is iOS 17+ only. Running on {Platform.OS}.
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              onPress={() => pickAndCutout()}>
              <Text style={styles.btnText}>Pick image{'\n'}(default 2 048 px)</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnGreen, pressed && styles.btnPressed]}
              onPress={() => pickAndCutout(Number.MAX_SAFE_INTEGER)}>
              <Text style={styles.btnText}>Pick image{'\n'}(full resolution)</Text>
            </Pressable>
          </View>

          {/* Loading */}
          {phase.kind === 'loading' && (
            <View style={styles.card}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.statusText}>Running Vision… ({phase.label})</Text>
            </View>
          )}

          {/* Error */}
          {phase.kind === 'error' && (
            <View style={[styles.card, styles.errorCard]}>
              <Text style={styles.errorTitle}>✗ Error</Text>
              <Text style={styles.errorBody}>{phase.message}</Text>
            </View>
          )}

          {/* Result */}
          {phase.kind === 'done' && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Result</Text>
              <Text style={styles.metaText}>
                {phase.result.width} × {phase.result.height} px
              </Text>
              <Text style={styles.uriText} numberOfLines={2} selectable>
                {phase.result.uri}
              </Text>

              <View style={styles.previewRow}>
                {/* Original */}
                <View style={styles.previewCol}>
                  <Text style={styles.previewLabel}>Original</Text>
                  <Image
                    source={{ uri: phase.source }}
                    style={styles.previewImg}
                    resizeMode="contain"
                  />
                </View>

                {/* Cutout on checkerboard — long-press to save */}
                <View style={styles.previewCol}>
                  <Text style={styles.previewLabel}>Cutout</Text>
                  <Pressable
                    onLongPress={() => saveCutoutToGallery(phase.result.uri)}
                    delayLongPress={350}
                    accessibilityHint="Long press to save cutout to gallery"
                    style={({ pressed }) => [
                      styles.cutoutPressable,
                      pressed && styles.cutoutPressed,
                    ]}>
                    <Checkerboard>
                      <Image
                        source={{ uri: phase.result.uri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="contain"
                      />
                      {saving && (
                        <View style={[StyleSheet.absoluteFill, styles.savingOverlay]}>
                          <ActivityIndicator color="#fff" />
                        </View>
                      )}
                    </Checkerboard>
                  </Pressable>
                  <Text style={styles.saveHint}>Long-press to save</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 20, paddingBottom: 60 },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6E6E73',
    textAlign: 'center',
    marginBottom: 24,
  },

  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0C36D',
  },
  warningText: { color: '#856404', fontSize: 14, textAlign: 'center' },

  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  btnGreen: { backgroundColor: '#34C759' },
  btnPressed: { opacity: 0.75 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  statusText: { color: '#3C3C43', fontSize: 15 },

  errorCard: { backgroundColor: '#FFF2F2' },
  errorTitle: { color: '#D70015', fontWeight: '700', fontSize: 17 },
  errorBody: { color: '#3C3C43', fontSize: 14, textAlign: 'center' },

  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  metaText: { alignSelf: 'flex-start', fontSize: 13, color: '#6E6E73' },
  uriText: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 8,
  },

  previewRow: { flexDirection: 'row', gap: 12, width: '100%' },
  previewCol: { flex: 1, alignItems: 'center' },
  previewLabel: { fontSize: 13, fontWeight: '600', color: '#6E6E73', marginBottom: 6 },
  previewImg: { width: '100%', aspectRatio: 1 },
  cutoutPressable: { width: '100%' },
  cutoutPressed: { opacity: 0.85 },
  saveHint: { marginTop: 6, fontSize: 11, color: '#8E8E93' },
  savingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Checkerboard
  checkerWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
  checkerGrid: { flexDirection: 'column' },
  checkerRow: { flexDirection: 'row' },
  checkerCell: { width: CELL, height: CELL },
  checkerLight: { backgroundColor: '#fff' },
  checkerDark: { backgroundColor: '#C8C8C8' },
});
