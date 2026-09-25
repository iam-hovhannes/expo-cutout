import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/theme';

interface ActionButtonsProps {
  onPickDefault: () => void;
  onPickFullRes: () => void;
  disabled?: boolean;
}

export const ActionButtons = memo(function ActionButtons({
  onPickDefault,
  onPickFullRes,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pick image with default 2048px limit"
        style={({ pressed }) => [
          styles.btn,
          styles.btnBlue,
          disabled && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onPickDefault}>
        <Text style={styles.btnText}>Pick image{'\n'}(default 2 048 px)</Text>
      </Pressable>

      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pick image at full resolution"
        style={({ pressed }) => [
          styles.btn,
          styles.btnGreen,
          disabled && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onPickFullRes}>
        <Text style={styles.btnText}>Pick image{'\n'}(full resolution)</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBlue: {
    backgroundColor: COLORS.tint,
  },
  btnGreen: {
    backgroundColor: COLORS.success,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
