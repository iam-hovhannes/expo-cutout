import { registerWebModule, NativeModule } from 'expo';

// ExpoCutoutModule is not available on the web platform.
class ExpoCutoutModule extends NativeModule<{}> {}

export default registerWebModule(ExpoCutoutModule, 'ExpoCutoutModule');
