import { NativeModule, requireNativeModule } from 'expo';

import type { CutoutOptions, CutoutResult } from './ExpoCutout.types';

declare class ExpoCutoutModule extends NativeModule {
  cutout(uri: string, options: CutoutOptions): Promise<CutoutResult>;
}

let cached: ExpoCutoutModule | null = null;

/** Loads the native module on first use (not at import time). */
export function getExpoCutoutModule(): ExpoCutoutModule {
  if (!cached) {
    cached = requireNativeModule<ExpoCutoutModule>('ExpoCutout');
  }
  return cached;
}
