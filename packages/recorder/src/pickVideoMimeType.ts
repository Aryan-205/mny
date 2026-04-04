const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

/** Prefer H.264+AAC in MP4 when the browser supports it (e.g. some Safari builds); else WebM. */
const MP4_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1.4D001E,mp4a.40.2",
  "video/mp4",
] as const;

/**
 * Picks a MIME type supported by MediaRecorder, or undefined to let the browser default.
 */
export function pickVideoMimeType(preferred?: string): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  if (preferred && MediaRecorder.isTypeSupported(preferred)) {
    return preferred;
  }
  for (const c of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

/**
 * Prefer MP4 for {@link MediaRecorder} when supported; otherwise same as {@link pickVideoMimeType}.
 */
const VIDEO_ONLY_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

/** Video-only MIME for a camera-only {@link MediaRecorder} (no audio). */
export function pickVideoOnlyMimeType(preferred?: string): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  if (preferred && MediaRecorder.isTypeSupported(preferred)) {
    return preferred;
  }
  for (const c of VIDEO_ONLY_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

export function pickMp4OrWebmMimeType(preferred?: string): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  if (preferred && MediaRecorder.isTypeSupported(preferred)) {
    return preferred;
  }
  for (const c of MP4_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return pickVideoMimeType();
}
