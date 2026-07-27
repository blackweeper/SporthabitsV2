import { router } from "expo-router";

export type CropperResult = {
  base64: string; // JPEG base64 (no data-uri prefix)
  width: number;
  height: number;
} | null; // null = cancelled

export type CropperOptions = {
  aspectRatio?: number; // width / height, default 1 (square)
  outputWidth?: number; // Max output width in px, default 900
  jpegQuality?: number; // 0..1, default 0.85
  title?: string; // Header title
};

type Pending = {
  sourceUri: string;
  options: CropperOptions;
  resolve: (r: CropperResult) => void;
};

let PENDING: Pending | null = null;

/**
 * Opens the custom cropper modal for the provided source image and resolves
 * with the cropped base64 (or null if cancelled).
 *
 * Usage:
 *   const cropped = await cropImage(asset.uri, { aspectRatio: 1 });
 *   if (cropped) setPhoto(cropped.base64);
 */
export function cropImage(
  sourceUri: string,
  options: CropperOptions = {},
): Promise<CropperResult> {
  return new Promise<CropperResult>((resolve) => {
    // If a previous crop was interrupted, resolve it as cancelled to unblock callers.
    if (PENDING) {
      PENDING.resolve(null);
    }
    PENDING = { sourceUri, options, resolve };
    router.push("/photo-crop");
  });
}

/** Internal: retrieved by the cropper screen when it mounts. */
export function _consumePending(): Pending | null {
  return PENDING;
}

/** Internal: called by the cropper screen when the user confirms/cancels. */
export function _resolvePending(result: CropperResult) {
  if (!PENDING) return;
  const p = PENDING;
  PENDING = null;
  p.resolve(result);
}
