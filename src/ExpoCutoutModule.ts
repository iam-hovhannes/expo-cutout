import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoCutoutModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<ExpoCutoutModule>('ExpoCutout');
