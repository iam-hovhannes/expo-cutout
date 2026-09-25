import type { CutoutResult } from 'expo-cutout';

export type CutoutPhase =
  | { kind: 'idle' }
  | { kind: 'loading'; label: string }
  | { kind: 'done'; result: CutoutResult; source: string }
  | { kind: 'error'; message: string };
