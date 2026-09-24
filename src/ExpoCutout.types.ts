export type CutoutOptions = {
  /**
   * Maximum long-edge pixels before Vision processing. Default: 2048.
   * Pass `Number.MAX_SAFE_INTEGER` to skip downscaling (full resolution).
   */
  maxDimension?: number;
};

export type CutoutResult = {
  /** Local `file://` URI of the resulting transparent PNG. */
  uri: string;
  /** Width of the output image in pixels. */
  width: number;
  /** Height of the output image in pixels. */
  height: number;
};
