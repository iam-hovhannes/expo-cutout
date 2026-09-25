import type { CutoutResult } from 'expo-cutout';
import React, { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Checkerboard } from './Checkerboard';
import { COLORS } from '../constants/theme';

interface ResultCardProps {
  result: CutoutResult;
  sourceUri: string;
  saving: boolean;
  onSave: (uri: string) => void;
}

export const ResultCard = memo(function ResultCard({
  result,
  sourceUri,
  saving,
  onSave,
}: ResultCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Result</Text>
      <Text style={styles.metaText}>
        {result.width} × {result.height} px
      </Text>
      <Text style={styles.uriText} numberOfLines={2} selectable>
        {result.uri}
      </Text>

      <View style={styles.previewRow}>
        {/* Original */}
        <View style={styles.previewCol}>
          <Text style={styles.previewLabel}>Original</Text>
          <Image source={{ uri: sourceUri }} style={styles.previewImg} resizeMode="contain" />
        </View>

        {/* Cutout on checkerboard */}
        <View style={styles.previewCol}>
          <Text style={styles.previewLabel}>Cutout</Text>
          <Pressable
            onLongPress={() => onSave(result.uri)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel="Cutout preview"
            accessibilityHint="Long press to save cutout to photo library"
            style={({ pressed }) => [styles.cutoutPressable, pressed && styles.cutoutPressed]}>
            <Checkerboard>
              <Image
                source={{ uri: result.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
              {saving && (
                <View style={[StyleSheet.absoluteFill, styles.savingOverlay]}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </Checkerboard>
          </Pressable>
          <Text style={styles.saveHint}>Long-press to save</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaText: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  uriText: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  previewCol: {
    flex: 1,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  previewImg: {
    width: '100%',
    aspectRatio: 1,
  },
  cutoutPressable: {
    width: '100%',
  },
  cutoutPressed: {
    opacity: 0.85,
  },
  saveHint: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  savingOverlay: {
    backgroundColor: COLORS.overlayBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
