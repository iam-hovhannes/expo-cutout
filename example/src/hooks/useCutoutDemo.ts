import { cutout } from 'expo-cutout';
import * as ImagePicker from 'expo-image-picker';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import type { CutoutPhase } from '../types/cutout';

export function useCutoutDemo() {
  const [phase, setPhase] = useState<CutoutPhase>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);

  const pickAndCutout = useCallback(async (maxDimension?: number) => {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ kind: 'error', message });
    }
  }, []);

  const saveCutoutToGallery = useCallback(
    async (uri: string) => {
      if (saving) return;
      setSaving(true);
      try {
        // writeOnly — only need permission to add to the photo library
        const permission = await requestPermissionsAsync(true);
        if (!permission.granted) {
          Alert.alert(
            'Permission needed',
            'Allow photo access to save the cutout to your gallery.'
          );
          return;
        }

        await Asset.create(uri);
        Alert.alert('Saved', 'Cutout PNG saved to your photo library.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        Alert.alert('Save failed', message);
      } finally {
        setSaving(false);
      }
    },
    [saving]
  );

  return {
    phase,
    saving,
    pickAndCutout,
    saveCutoutToGallery,
  };
}
