import { registerWebModule, NativeModule } from 'expo';

// expo-cutout is not available on the web platform.
class ExpoCutoutModule extends NativeModule {}

let cached: ReturnType<typeof registerWebModule> | null = null;

/** Loads the web stub on first use (not at import time). */
export function getExpoCutoutModule() {
  if (!cached) {
    cached = registerWebModule(ExpoCutoutModule, 'ExpoCutoutModule');
  }
  return cached;
}
