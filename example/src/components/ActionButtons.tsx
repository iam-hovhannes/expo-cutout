import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '../constants/theme';

interface ActionButtonsProps {
  onUpload: () => void;
  disabled?: boolean;
}

export const ActionButtons = memo(function ActionButtons({
  onUpload,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Upload image"
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
      onPress={onUpload}>
      <Text style={styles.btnText}>Upload image</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.tint,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
    fontSize: 16,
    textAlign: 'center',
  },
});
