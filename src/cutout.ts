import { Platform } from 'react-native';

import type { CutoutOptions, CutoutResult } from './ExpoCutout.types';
import { getExpoCutoutModule } from './ExpoCutoutModule';

/**
 * Remove a background from a local image using iOS 17+ Vision instance masking.
 *
 * @param uri - Local `file://` URI (or absolute path) of the source image.
 * @param options - Optional tuning parameters.
 * @returns A promise that resolves to `{ uri, width, height }` where `uri` is
 *   a `file://` path to the output transparent PNG.
 *
 * @throws On non-iOS platforms.
 * @throws `ERR_INVALID_URI` if the URI is empty or not a local path.
 * @throws `ERR_DECODE` if the image cannot be loaded.
 * @throws `ERR_NO_FOREGROUND` if Vision found no foreground subjects.
 * @throws `ERR_VISION` if the Vision pipeline failed.
 * @throws `ERR_ENCODE` if writing the output PNG failed.
 */
export async function cutout(uri: string, options?: CutoutOptions): Promise<CutoutResult> {
  if (Platform.OS !== 'ios') {
    throw new Error(
      'expo-cutout is only supported on iOS 17+. The current platform is: ' + Platform.OS
    );
  }

  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('[expo-cutout] uri must be a non-empty local file path or file:// URI.');
  }

  // Ensure the caller always passes a local path
  const lower = uri.toLowerCase();
  if (!lower.startsWith('file://') && !lower.startsWith('/')) {
    throw new Error(
      '[expo-cutout] uri must be a local file:// URI or absolute path. Remote URLs are not supported.'
    );
  }

  const resolvedOptions: CutoutOptions = {
    maxDimension: options?.maxDimension ?? 2048,
  };

  return getExpoCutoutModule().cutout(uri, resolvedOptions);
}
