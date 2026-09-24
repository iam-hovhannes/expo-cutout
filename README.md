# expo-cutout

An **iOS-only** Expo Module that uses [`VNGenerateForegroundInstanceMaskRequest`](https://developer.apple.com/documentation/vision/vngenerateforegroundinstancemaskrequest) (Vision, iOS 17+) to remove image backgrounds and return a transparent PNG.

## Requirements

| | |
|---|---|
| iOS | **17.0+** |
| Expo SDK | 50+ |
| Runtime | **Expo Dev Client / prebuild** (not Expo Go) |

## Installation

```sh
# In your app
npm install expo-cutout
```

Add the config plugin to your `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": ["expo-cutout"]
  }
}
```

Then prebuild:

```sh
npx expo prebuild
```

## Usage

```ts
import { cutout } from 'expo-cutout';

// uri must be a local file:// path — copy from picker/camera first
const { uri, width, height } = await cutout(localFileUri, {
  maxDimension: 2048, // optional, default 2048
});
// uri  →  file:// path to transparent PNG
```

### API

#### `cutout(uri, options?): Promise<CutoutResult>`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `uri` | `string` | required | Local `file://` URI or absolute path |
| `options.maxDimension` | `number` | `2048` | Long-edge pixel cap before Vision. Pass `Number.MAX_SAFE_INTEGER` for full resolution. |

#### `CutoutResult`

```ts
{
  uri: string;    // file:// path to transparent PNG in temp dir
  width: number;  // output width in pixels
  height: number; // output height in pixels
}
```

### Error codes

| Code | Meaning |
|---|---|
| `ERR_INVALID_URI` | File path missing or unreadable |
| `ERR_DECODE` | Image cannot be decoded |
| `ERR_NO_FOREGROUND` | Vision found no foreground subjects |
| `ERR_VISION` | Vision pipeline error |
| `ERR_ENCODE` | PNG write failed |

Non-iOS platforms throw a plain `Error` before touching native.

## Pipeline

```
Load image
   ↓
Normalize orientation to .up (bake EXIF / UIImage orientation into pixels)
   ↓
Downscale to maxDimension if needed (UIGraphicsImageRenderer)
   ↓
VNGenerateForegroundInstanceMaskRequest (iOS 17 Vision)
   ↓
generateScaledMaskForImage (CVPixelBuffer → CIImage)
   ↓
Refine mask: morphology erode → contrast boost → light Gaussian blur ~0.6 px
   ↓
CIBlendWithMask (source + refined mask + transparent background)
   ↓
CIContext → CGImage → UIImage.pngData() (orientation .up)
   ↓
Write cutout-<uuid>.png to tmp dir
   ↓
Resolve { uri, width, height }
```

## Notes

- Input **must** be a local `file://` URI. Copy remote images or picker results with `copyToCacheDirectory: true` before calling `cutout`.
- Output is written to `FileManager.default.temporaryDirectory`. Clean up if needed.
- Android is not supported (iOS-only platforms in `expo-module.config.json`).

## License

MIT
