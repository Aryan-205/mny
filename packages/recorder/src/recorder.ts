import type { RecorderResult, StartRecordingOptions } from "./types";

/**
 * Legacy **microphone-only** recorder (no video). For screen capture use
 * {@link startScreenRecording}; for camera + mic use {@link startFaceCamRecording}.
 *
 * Runs only in the browser; requires microphone permission.
 */
let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let chunks: BlobPart[] = [];

/** @see {@link StartRecordingOptions} */
export async function startRecording(options: StartRecordingOptions = {}) {
  if (typeof window === "undefined" || !navigator?.mediaDevices) {
    throw new Error("Recorder can only run in the browser.");
  }

  if (mediaRecorder?.state === "recording") {
    return;
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: options.mimeType,
    audioBitsPerSecond: options.audioBitsPerSecond,
  });

  chunks = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.start();
}

/** Stops the mic-only recording; {@link RecorderResult.blob} is typically audio/webm. */
export function stopRecording(): Promise<RecorderResult> {
  if (!mediaRecorder || mediaRecorder.state !== "recording") {
    return Promise.reject(new Error("No active recording to stop."));
  }

  return new Promise((resolve) => {
    mediaRecorder!.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);

      mediaStream?.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      mediaStream = null;
      chunks = [];

      resolve({ blob, url });
    };

    mediaRecorder!.stop();
  });
}

export function isRecording() {
  return mediaRecorder?.state === "recording";
}
