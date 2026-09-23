// Reexport the native module. On web, it will be resolved to ExpoCutoutModule.web.ts
// and on native platforms to ExpoCutoutModule.ts
export { default } from './ExpoCutoutModule';
export * from './ExpoCutout.types';
