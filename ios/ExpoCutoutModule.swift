import ExpoModulesCore
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

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
    // --- 1. Parse URI ---
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

    // --- 2. Load ---
    guard let sourceImage = UIImage(contentsOfFile: rawPath) else {
      throw CutoutError.decode("Cannot decode image at: \(rawPath)")
    }

    // --- 3. Downscale if needed ---
    let maxDimension: CGFloat
    if let md = options?["maxDimension"] as? Double, md > 0 {
      maxDimension = CGFloat(md)
    } else {
      maxDimension = 2048
    }

    let (workingImage, outputWidth, outputHeight) = try downscaleIfNeeded(
      image: sourceImage,
      maxDimension: maxDimension
    )

    // --- 4. Vision request ---
    guard let cgSource = workingImage.cgImage else {
      throw CutoutError.decode("Could not get CGImage from UIImage")
    }

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

    // --- 5. Generate scaled mask ---
    let maskPixelBuffer: CVPixelBuffer
    do {
      maskPixelBuffer = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances,
        from: handler
      )
    } catch {
      throw CutoutError.vision("generateScaledMaskForImage failed: \(error.localizedDescription)")
    }

    let targetExtent = CGRect(x: 0, y: 0, width: CGFloat(outputWidth), height: CGFloat(outputHeight))
    var ciMask = CIImage(cvPixelBuffer: maskPixelBuffer)

    // Align mask size to source
    let maskExtent = ciMask.extent
    if maskExtent.size != targetExtent.size {
      let scaleX = targetExtent.width / maskExtent.width
      let scaleY = targetExtent.height / maskExtent.height
      ciMask = ciMask.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
    }
    ciMask = ciMask.cropped(to: targetExtent)

    // --- 6. Tighten mask (cut soft fringe / white halo) then light feather ---
    let refinedMask = refineMask(ciMask, extent: targetExtent)

    // --- 7. Composite over explicit transparent background ---
    let ciSource = CIImage(cgImage: cgSource).cropped(to: targetExtent)
    let clearBackground = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0))
      .cropped(to: targetExtent)

    let blendFilter = CIFilter.blendWithMask()
    blendFilter.inputImage = ciSource
    blendFilter.backgroundImage = clearBackground
    blendFilter.maskImage = refinedMask

    guard let composited = blendFilter.outputImage?.cropped(to: targetExtent) else {
      throw CutoutError.vision("blendWithMask filter returned nil")
    }

    // --- 8. Render PNG with explicit alpha ---
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    let context = CIContext(options: [
      .workingColorSpace: colorSpace,
      .outputColorSpace: colorSpace,
    ])

    guard let outputCGImage = context.createCGImage(
      composited,
      from: targetExtent,
      format: .RGBA8,
      colorSpace: colorSpace
    ) else {
      throw CutoutError.encode("CIContext could not render CGImage")
    }

    let outputUIImage = UIImage(cgImage: outputCGImage, scale: 1, orientation: .up)
    guard let pngData = outputUIImage.pngData() else {
      throw CutoutError.encode("pngData() returned nil")
    }

    // --- 9. Write to temp ---
    let filename = "cutout-\(UUID().uuidString).png"
    let outURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

    do {
      try pngData.write(to: outURL, options: .atomic)
    } catch {
      throw CutoutError.encode("Failed to write PNG: \(error.localizedDescription)")
    }

    return [
      "uri": outURL.absoluteString,
      "width": outputWidth,
      "height": outputHeight,
    ]
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

  // MARK: - Helpers

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
    let newSize = CGSize(width: newW, height: newH)

    let format = UIGraphicsImageRendererFormat()
    format.opaque = false
    format.scale = 1

    let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
    let scaled = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }

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
