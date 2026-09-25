import React, { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/theme';

export const PlatformWarning = memo(function PlatformWarning() {
  if (Platform.OS === 'ios') return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ expo-cutout is iOS 17+ only. Running on {Platform.OS}.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  text: {
    color: COLORS.warningText,
    fontSize: 14,
    textAlign: 'center',
  },
});
