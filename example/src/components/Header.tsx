import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

export const Header = memo(function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-cutout</Text>
      <Text style={styles.subtitle}>iOS Vision background remover</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
