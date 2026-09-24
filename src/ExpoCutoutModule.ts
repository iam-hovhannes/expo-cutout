import { NativeModule, requireNativeModule } from 'expo';

import type { CutoutOptions, CutoutResult } from './ExpoCutout.types';

declare class ExpoCutoutModule extends NativeModule {
  cutout(uri: string, options: CutoutOptions): Promise<CutoutResult>;
}

export default requireNativeModule<ExpoCutoutModule>('ExpoCutout');
