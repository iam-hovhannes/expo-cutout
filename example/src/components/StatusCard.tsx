import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/theme';
import type { CutoutPhase } from '../types/cutout';

interface StatusCardProps {
  phase: Extract<CutoutPhase, { kind: 'loading' | 'error' }>;
}

export const StatusCard = memo(function StatusCard({ phase }: StatusCardProps) {
  if (phase.kind === 'loading') {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={COLORS.tint} />
        <Text style={styles.statusText}>Running Vision… ({phase.label})</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.errorCard]}>
      <Text style={styles.errorTitle}>✗ Error</Text>
      <Text style={styles.errorBody}>{phase.message}</Text>
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
  statusText: {
    color: '#3C3C43',
    fontSize: 15,
  },
  errorCard: {
    backgroundColor: COLORS.errorBg,
  },
  errorTitle: {
    color: COLORS.errorText,
    fontWeight: '700',
    fontSize: 17,
  },
  errorBody: {
    color: '#3C3C43',
    fontSize: 14,
    textAlign: 'center',
  },
});
