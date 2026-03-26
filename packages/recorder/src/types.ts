export type RecorderStatus = "idle" | "recording" | "stopped";

export interface StartRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
}

export interface RecorderResult {
  blob: Blob;
  url: string;
}
