import ExpoModulesCore
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
import ImageIO
import UniformTypeIdentifiers

public class ExpoCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoCutout")

    AsyncFunction("cutout") { (uri: String, options: [String: Any]?, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let result = try Self.performCutout(uri: uri, options: options)
          promise.resolve(result)
        } catch let error as CutoutError {
          promise.reject(error.code, error.localizedDescription)
        } catch {
          promise.reject("ERR_UNKNOWN", error.localizedDescription)
        }
      }
    }
  }

  // MARK: - Pipeline

  private static func performCutout(uri: String, options: [String: Any]?) throws -> [String: Any] {
    let path = try resolveFilePath(from: uri)
    let maxDim = (options?["maxDimension"] as? Double).flatMap { $0 > 0 ? CGFloat($0) : nil } ?? 2048
    let (cgSource, width, height) = try loadAndPrepare(path: path, maxDimension: maxDim)
    let maskCG = try generateForegroundMask(for: cgSource, width: width, height: height)
    let outputCG = try applyMaskToSource(cgSource, mask: maskCG, width: width, height: height)
    let outURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("cutout-\(UUID().uuidString).png")
    try writePNG(outputCG, to: outURL)
    return [
      "uri": outURL.absoluteString,
      "width": width,
      "height": height,
    ]
  }

  /// Strips a `file://` URI and checks that the path exists on disk.
  private static func resolveFilePath(from uri: String) throws -> String {
    let rawPath: String
    if uri.hasPrefix("file://") {
      guard let url = URL(string: uri), let path = url.path.removingPercentEncoding else {
        throw CutoutError.invalidURI("Cannot decode file URI: \(uri)")
      }
      rawPath = path
    } else {
      rawPath = uri
    }

    guard !rawPath.isEmpty, FileManager.default.fileExists(atPath: rawPath) else {
      throw CutoutError.invalidURI("File not found at path: \(rawPath)")
    }
    return rawPath
  }

  /// Loads the photo, bakes EXIF orientation, and downscales so later steps see upright pixels.
  private static func loadAndPrepare(
    path: String,
    maxDimension: CGFloat
  ) throws -> (CGImage, Int, Int) {
    guard let sourceImage = UIImage(contentsOfFile: path) else {
      throw CutoutError.decode("Cannot decode image at: \(path)")
    }

    let uprightImage = try normalizedUpOriented(sourceImage)
    let (workingImage, outputWidth, outputHeight) = try downscaleIfNeeded(
      image: uprightImage,
      maxDimension: maxDimension
    )
    guard let cgSource = workingImage.cgImage else {
      throw CutoutError.decode("Could not get CGImage from UIImage")
    }
    return (cgSource, outputWidth, outputHeight)
  }

  /// Runs Vision, tightens the matte, and renders it as an RGBA bitmap.
  private static func generateForegroundMask(
    for cgSource: CGImage,
    width: Int,
    height: Int
  ) throws -> CGImage {
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgSource, options: [:])

    do {
      try handler.perform([request])
    } catch {
      throw CutoutError.vision("VNImageRequestHandler failed: \(error.localizedDescription)")
    }

    guard let observation = request.results?.first else {
      throw CutoutError.noForeground("Vision returned no results")
    }

    guard !observation.allInstances.isEmpty else {
      throw CutoutError.noForeground("Vision found no foreground instances")
    }

    let maskPixelBuffer: CVPixelBuffer
    do {
      maskPixelBuffer = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances,
        from: handler
      )
    } catch {
      throw CutoutError.vision("generateScaledMaskForImage failed: \(error.localizedDescription)")
    }

    let targetExtent = CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
    // Null color space: sample the matte as stored. Do not color-match it into the photo.
    var ciMask = CIImage(cvPixelBuffer: maskPixelBuffer, options: [.colorSpace: NSNull()])

    let maskExtent = ciMask.extent
    if maskExtent.size != targetExtent.size {
      let scaleX = targetExtent.width / maskExtent.width
      let scaleY = targetExtent.height / maskExtent.height
      ciMask = ciMask.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
    }
    ciMask = ciMask.cropped(to: targetExtent)

    let refinedMask = refineMask(ciMask, extent: targetExtent)
      .settingProperties([CIImageOption.colorSpace: NSNull()])

    // Null working and output spaces keep mask samples unconverted.
    // Render as RGBA: an R8 buffer with a nil color space can fail.
    let ciContext = CIContext(options: [
      .workingColorSpace: NSNull(),
      .outputColorSpace: NSNull(),
    ])
    guard let maskCG = ciContext.createCGImage(refinedMask, from: targetExtent) else {
      throw CutoutError.encode("Could not render mask to CGImage")
    }
    return maskCG
  }

  /// Writes a PNG with ImageIO so UIKit does not premultiply the pixels on the way out.
  private static func writePNG(_ image: CGImage, to url: URL) throws {
    guard let dest = CGImageDestinationCreateWithURL(
      url as CFURL, UTType.png.identifier as CFString, 1, nil
    ) else {
      throw CutoutError.encode("Could not create PNG destination")
    }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else {
      throw CutoutError.encode("Failed to write PNG")
    }
  }

  // MARK: - Mask refinement

  /// Erode soft Vision fringe, boost contrast, then apply a tiny feather for AA.
  private static func refineMask(_ mask: CIImage, extent: CGRect) -> CIImage {
    // Slight erode pulls the matte inward so background spill / white rim is cut off
    let erode = CIFilter.morphologyMinimum()
    erode.inputImage = mask.clampedToExtent()
    erode.radius = 1.5

    let eroded = (erode.outputImage ?? mask).cropped(to: extent)

    // Push mid-grays toward 0/1 so leftover halo becomes opaque or fully transparent
    let contrast = CIFilter.colorControls()
    contrast.inputImage = eroded
    contrast.contrast = 1.35
    contrast.brightness = 0.02

    let contrasted = (contrast.outputImage ?? eroded).cropped(to: extent)

    // Very light feather for anti-aliased edges (was 1.5 — that thickened the halo)
    let blur = CIFilter.gaussianBlur()
    blur.inputImage = contrasted.clampedToExtent()
    blur.radius = 0.6

    return (blur.outputImage ?? contrasted).cropped(to: extent)
  }

  // MARK: - Pixel-level mask application

  /// Copies source RGB and writes alpha = mask value, pixel by pixel.
  /// Source RGB bytes are never modified so brightness is preserved exactly.
  private static func applyMaskToSource(
    _ source: CGImage,
    mask: CGImage,
    width: Int,
    height: Int
  ) throws -> CGImage {
    let colorSpace = outputColorSpace(of: source)
    let rect = CGRect(x: 0, y: 0, width: width, height: height)

    // Draw source into RGBA8 with no alpha (noneSkipLast keeps RGB untouched)
    let srcBI = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.noneSkipLast.rawValue
    guard let srcCtx = CGContext(
      data: nil, width: width, height: height,
      bitsPerComponent: 8, bytesPerRow: width * 4,
      space: colorSpace, bitmapInfo: srcBI
    ) else {
      throw CutoutError.encode("Could not create source CGContext")
    }
    srcCtx.draw(source, in: rect)
    guard let srcData = srcCtx.data else {
      throw CutoutError.encode("Source CGContext has no pixel data")
    }

    // Draw mask into RGBA8 in sRGB — we only need the R channel for coverage.
    let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
    let maskBI = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.noneSkipLast.rawValue
    guard let maskCtx = CGContext(
      data: nil, width: width, height: height,
      bitsPerComponent: 8, bytesPerRow: width * 4,
      space: srgb, bitmapInfo: maskBI
    ) else {
      throw CutoutError.encode("Could not create mask CGContext")
    }
    maskCtx.draw(mask, in: rect)
    guard let maskData = maskCtx.data else {
      throw CutoutError.encode("Mask CGContext has no pixel data")
    }

    // Build output: copy source R,G,B verbatim, set A from mask's R channel.
    let pixelCount = width * height
    let bufSize = pixelCount * 4
    let outBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufSize)
    defer { outBuffer.deallocate() }

    let srcPtr = srcData.assumingMemoryBound(to: UInt8.self)
    let maskPtr = maskData.assumingMemoryBound(to: UInt8.self)

    for i in 0..<pixelCount {
      let off = i * 4
      outBuffer[off]     = srcPtr[off]     // R
      outBuffer[off + 1] = srcPtr[off + 1] // G
      outBuffer[off + 2] = srcPtr[off + 2] // B
      outBuffer[off + 3] = maskPtr[off]    // A ← mask R channel
    }

    // Create CGImage with non-premultiplied alpha (CGImageAlphaInfo.last)
    // so RGB values are stored as-is in the PNG file.
    let outBI = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.last.rawValue
    guard let provider = CGDataProvider(data: Data(
      bytes: outBuffer, count: bufSize
    ) as CFData) else {
      throw CutoutError.encode("Could not create CGDataProvider")
    }

    guard let result = CGImage(
      width: width,
      height: height,
      bitsPerComponent: 8,
      bitsPerPixel: 32,
      bytesPerRow: width * 4,
      space: colorSpace,
      bitmapInfo: CGBitmapInfo(rawValue: outBI),
      provider: provider,
      decode: nil,
      shouldInterpolate: true,
      intent: .defaultIntent
    ) else {
      throw CutoutError.encode("Could not create output CGImage")
    }

    return result
  }

  // MARK: - Helpers

  /// Source profile when it can tag a bitmap; sRGB for untagged or non-output spaces.
  private static func outputColorSpace(of cgImage: CGImage) -> CGColorSpace {
    if let space = cgImage.colorSpace, space.supportsOutput {
      return space
    }
    return CGColorSpace(name: CGColorSpace.sRGB)!
  }

  /// Draws into an 8-bit context in the source color space so the CGImage stays tagged with it.
  /// Opaque bitmaps skip premultiplication so RGB is copied as stored.
  private static func redrawInSourceColorSpace(
    _ image: UIImage,
    width: Int,
    height: Int,
    failure: String
  ) throws -> UIImage {
    guard width > 0, height > 0 else {
      throw CutoutError.decode(failure)
    }

    let colorSpace: CGColorSpace
    if let cgImage = image.cgImage {
      colorSpace = outputColorSpace(of: cgImage)
    } else {
      colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    }

    let hasAlpha = image.cgImage.map { cgImage -> Bool in
      switch cgImage.alphaInfo {
      case .none, .noneSkipFirst, .noneSkipLast:
        return false
      default:
        return true
      }
    } ?? false
    // CGContext cannot draw into non-premultiplied alpha. Opaque photos use noneSkipLast.
    let alphaInfo: CGImageAlphaInfo = hasAlpha ? .premultipliedLast : .noneSkipLast
    let bitmapInfo = alphaInfo.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    guard let context = CGContext(
      data: nil,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: colorSpace,
      bitmapInfo: bitmapInfo
    ) else {
      throw CutoutError.decode(failure)
    }

    // UIImage.draw expects a top-left origin, matching UIGraphicsImageRenderer.
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)
    UIGraphicsPushContext(context)
    image.draw(in: CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    UIGraphicsPopContext()

    guard let rendered = context.makeImage() else {
      throw CutoutError.decode(failure)
    }
    return UIImage(cgImage: rendered, scale: 1, orientation: .up)
  }

  /// Bakes `imageOrientation` into pixel data so `.cgImage` matches what the user sees.
  private static func normalizedUpOriented(_ image: UIImage) throws -> UIImage {
    if image.imageOrientation == .up, image.cgImage != nil {
      return image
    }

    let pixelW = image.size.width * image.scale
    let pixelH = image.size.height * image.scale
    return try redrawInSourceColorSpace(
      image,
      width: Int(pixelW.rounded()),
      height: Int(pixelH.rounded()),
      failure: "Could not normalize image orientation"
    )
  }

  private static func downscaleIfNeeded(
    image: UIImage,
    maxDimension: CGFloat
  ) throws -> (UIImage, Int, Int) {
    let originalW = image.size.width * image.scale
    let originalH = image.size.height * image.scale
    let longEdge = max(originalW, originalH)

    guard longEdge > maxDimension else {
      return (image, Int(originalW), Int(originalH))
    }

    let scale = maxDimension / longEdge
    let newW = (originalW * scale).rounded()
    let newH = (originalH * scale).rounded()
    let scaled = try redrawInSourceColorSpace(
      image,
      width: Int(newW),
      height: Int(newH),
      failure: "Could not downscale image"
    )

    return (scaled, Int(newW), Int(newH))
  }
}

// MARK: - Error types

private enum CutoutError: Error {
  case invalidURI(String)
  case decode(String)
  case noForeground(String)
  case vision(String)
  case encode(String)

  var code: String {
    switch self {
    case .invalidURI: return "ERR_INVALID_URI"
    case .decode: return "ERR_DECODE"
    case .noForeground: return "ERR_NO_FOREGROUND"
    case .vision: return "ERR_VISION"
    case .encode: return "ERR_ENCODE"
    }
  }

  var localizedDescription: String {
    switch self {
    case .invalidURI(let msg): return msg
    case .decode(let msg): return msg
    case .noForeground(let msg): return msg
    case .vision(let msg): return msg
    case .encode(let msg): return msg
    }
  }
}
