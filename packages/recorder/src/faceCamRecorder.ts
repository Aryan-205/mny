import type { RecorderResult, StartFaceCamRecordingOptions } from "./types";
import { pickVideoMimeType } from "./pickVideoMimeType";

let cameraStream: MediaStream | null = null;
let faceMediaRecorder: MediaRecorder | null = null;
let faceChunks: BlobPart[] = [];
let pendingFaceResolve: ((result: RecorderResult) => void) | null = null;

function finalizeFaceStop(): RecorderResult {
  const mime = faceMediaRecorder?.mimeType || "video/webm";
  const blob = new Blob(faceChunks, { type: mime });
  const url = URL.createObjectURL(blob);
  cameraStream?.getTracks().forEach((t) => t.stop());
  cameraStream = null;
  faceMediaRecorder = null;
  faceChunks = [];
  return { blob, url, mimeType: mime };
}

function onFaceRecorderStop() {
  const result = finalizeFaceStop();
  const resolve = pendingFaceResolve;
  pendingFaceResolve = null;
  if (resolve) {
    resolve(result);
  } else {
    URL.revokeObjectURL(result.url);
  }
}

/**
 * Starts recording the user camera **and microphone** using {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia getUserMedia}.
 *
 * Audio is **always** requested (`audio: true`); there is no silent face-cam mode.
 * Video and audio bitrates can be tuned via options; `mimeType` selects a supported
 * `video/webm` profile when possible.
 *
 * No-op if a face-cam recording is already active.
 *
 * @throws If not in a browser or `mediaDevices` is unavailable.
 */
export async function startFaceCamRecording(
  options: StartFaceCamRecordingOptions = {},
): Promise<void> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    throw new Error("Face-cam recorder can only run in the browser.");
  }

  if (faceMediaRecorder?.state === "recording") {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      facingMode: options.facingMode ?? "user",
    },
  });

  cameraStream = stream;
  faceChunks = [];

  const pickedMime = pickVideoMimeType(options.mimeType);
  const recorderOptions: MediaRecorderOptions = {};
  if (pickedMime) recorderOptions.mimeType = pickedMime;
  if (options.videoBitsPerSecond != null) {
    recorderOptions.videoBitsPerSecond = options.videoBitsPerSecond;
  }
  if (options.audioBitsPerSecond != null) {
    recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  faceMediaRecorder = new MediaRecorder(stream, recorderOptions);

  faceMediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      faceChunks.push(event.data);
    }
  };

  faceMediaRecorder.onstop = onFaceRecorderStop;

  faceMediaRecorder.start();
}

/**
 * Stops the active face-cam recording and returns a video {@link Blob} and object URL
 * (includes microphone audio).
 *
 * @throws If there is no active face-cam recording.
 */
export function stopFaceCamRecording(): Promise<RecorderResult> {
  if (!faceMediaRecorder || faceMediaRecorder.state !== "recording") {
    return Promise.reject(new Error("No active face-cam recording to stop."));
  }

  return new Promise((resolve) => {
    pendingFaceResolve = resolve;
    faceMediaRecorder!.stop();
  });
}

/** Whether a face-cam capture is currently being recorded. */
export function isFaceCamRecording(): boolean {
  return faceMediaRecorder?.state === "recording";
}
