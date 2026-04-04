export type RecorderStatus = "idle" | "recording" | "stopped";

export interface StartRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
}

/** Result from any recorder stop; `mimeType` is set for video recorders. */
export interface RecorderResult {
  blob: Blob;
  url: string;
  mimeType?: string;
  /** Parallel camera-only track from studio composite (optional). */
  cameraBlob?: Blob;
  cameraUrl?: string;
  cameraMimeType?: string;
}

/**
 * Options for {@link startScreenRecording}.
 * System audio is only captured when `systemAudio` is true and the user shares a
 * surface that exposes audio (e.g. Chrome tab with “Share tab audio”); the
 * browser may still return zero audio tracks.
 */
export interface StartScreenRecordingOptions {
  systemAudio?: boolean;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

/**
 * Options for {@link startFaceCamRecording}.
 * Microphone is always requested; these options tune quality and camera facing.
 */
export interface StartFaceCamRecordingOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  facingMode?: "user" | "environment";
}

/**
 * Composite studio capture: screen + optional system/tab audio (from display capture),
 * camera (face) + microphone (external) mixed into one recording.
 */
export interface StartStudioRecordingOptions {
  /**
   * Hint for what to share: full screen vs a browser tab. The picker may still offer
   * other surfaces depending on the browser.
   */
  displaySurface?: "monitor" | "browser";
  /**
   * Request system/tab audio on the display capture. User must pick a surface that exposes
   * audio when applicable. Default true.
   */
  systemAudio?: boolean;
  /** Optional mic device (external audio). Omit for default microphone. */
  microphoneDeviceId?: string;
  /** Optional camera device. Omit for default camera. */
  cameraDeviceId?: string;
  /** PiP width as a fraction of canvas width (0–1). Default 0.2 */
  pipWidthFraction?: number;
  /** Padding from bottom-right in pixels. Default 16 */
  pipPadding?: number;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}
