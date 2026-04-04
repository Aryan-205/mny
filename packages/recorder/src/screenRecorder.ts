import type { RecorderResult, StartScreenRecordingOptions } from "./types";
import { pickVideoMimeType } from "./pickVideoMimeType";

let displayStream: MediaStream | null = null;
let screenMediaRecorder: MediaRecorder | null = null;
let screenChunks: BlobPart[] = [];
let pendingScreenResolve: ((result: RecorderResult) => void) | null = null;
let videoTrackEndedHandler: (() => void) | null = null;

function detachVideoTrackListener() {
  if (displayStream && videoTrackEndedHandler) {
    const vt = displayStream.getVideoTracks()[0];
    vt?.removeEventListener("ended", videoTrackEndedHandler);
  }
  videoTrackEndedHandler = null;
}

function finalizeScreenStop(): RecorderResult {
  const mime = screenMediaRecorder?.mimeType || "video/webm";
  const blob = new Blob(screenChunks, { type: mime });
  const url = URL.createObjectURL(blob);
  detachVideoTrackListener();
  displayStream?.getTracks().forEach((t) => t.stop());
  displayStream = null;
  screenMediaRecorder = null;
  screenChunks = [];
  return { blob, url, mimeType: mime };
}

function onScreenRecorderStop() {
  const result = finalizeScreenStop();
  const resolve = pendingScreenResolve;
  pendingScreenResolve = null;
  if (resolve) {
    resolve(result);
  } else {
    URL.revokeObjectURL(result.url);
  }
}

/**
 * Starts recording the screen (display capture) using {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia getDisplayMedia}.
 *
 * - **Video** is always captured from the user’s chosen display surface.
 * - **System / tab audio** is only requested when `options.systemAudio` is `true`.
 *   Many browsers only expose it for certain surfaces (e.g. sharing a Chrome tab with
 *   “Share tab audio”). The stream may contain **no audio tracks** even when requested.
 * - Uses a supported `video/webm` MIME type when possible; pass `mimeType` to override.
 *
 * No-op if a screen recording is already active.
 *
 * @throws If not in a browser or `mediaDevices` is unavailable.
 */
export async function startScreenRecording(
  options: StartScreenRecordingOptions = {},
): Promise<void> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen recorder can only run in a browser with getDisplayMedia.");
  }

  if (screenMediaRecorder?.state === "recording") {
    return;
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: options.systemAudio === true,
  });

  displayStream = stream;
  screenChunks = [];

  const pickedMime = pickVideoMimeType(options.mimeType);
  const recorderOptions: MediaRecorderOptions = {};
  if (pickedMime) recorderOptions.mimeType = pickedMime;
  if (options.videoBitsPerSecond != null) {
    recorderOptions.videoBitsPerSecond = options.videoBitsPerSecond;
  }
  if (options.audioBitsPerSecond != null) {
    recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  screenMediaRecorder = new MediaRecorder(stream, recorderOptions);

  screenMediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      screenChunks.push(event.data);
    }
  };

  screenMediaRecorder.onstop = onScreenRecorderStop;

  const vt = stream.getVideoTracks()[0];
  if (vt) {
    videoTrackEndedHandler = () => {
      if (screenMediaRecorder?.state === "recording") {
        screenMediaRecorder.stop();
      }
    };
    vt.addEventListener("ended", videoTrackEndedHandler);
  }

  screenMediaRecorder.start();
}

/**
 * Stops the active screen recording and returns a video {@link Blob} and object URL.
 *
 * @throws If there is no active screen recording.
 */
export function stopScreenRecording(): Promise<RecorderResult> {
  if (!screenMediaRecorder || screenMediaRecorder.state !== "recording") {
    return Promise.reject(new Error("No active screen recording to stop."));
  }

  return new Promise((resolve) => {
    pendingScreenResolve = resolve;
    screenMediaRecorder!.stop();
  });
}

/** Whether a screen capture is currently being recorded. */
export function isScreenRecording(): boolean {
  return screenMediaRecorder?.state === "recording";
}
