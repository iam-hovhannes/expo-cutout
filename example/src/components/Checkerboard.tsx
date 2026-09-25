import React, { memo, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface CheckerboardProps {
  children: React.ReactNode;
  cellSize?: number;
}

export const Checkerboard = memo(function Checkerboard({
  children,
  cellSize = 12,
}: CheckerboardProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== dimensions.width || height !== dimensions.height) {
      setDimensions({ width, height });
    }
  };

  const { rows, cols } = useMemo(() => {
    const cols = dimensions.width > 0 ? Math.ceil(dimensions.width / cellSize) : 0;
    const rows = dimensions.height > 0 ? Math.ceil(dimensions.height / cellSize) : 0;
    return { rows, cols };
  }, [dimensions.width, dimensions.height, cellSize]);

  return (
    <View style={styles.wrap} onLayout={handleLayout}>
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: cols }).map((_, c) => (
              <View
                key={c}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  (r + c) % 2 === 0 ? styles.cellLight : styles.cellDark,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {},
  cellLight: {
    backgroundColor: COLORS.checkerLight,
  },
  cellDark: {
    backgroundColor: COLORS.checkerDark,
  },
});
