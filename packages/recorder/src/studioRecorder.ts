import type { RecorderResult, StartStudioRecordingOptions } from "./types";
import { pickMp4OrWebmMimeType, pickVideoOnlyMimeType } from "./pickVideoMimeType";

let displayStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let studioMediaRecorder: MediaRecorder | null = null;
let studioChunks: BlobPart[] = [];
let studioCameraMediaRecorder: MediaRecorder | null = null;
let studioCameraChunks: BlobPart[] = [];
let pendingStudioResolve: ((result: RecorderResult) => void) | null = null;
let studioStopWait: { pendingMain: boolean; pendingCam: boolean } | null = null;
let videoTrackEndedHandler: (() => void) | null = null;

let studioAudioContext: AudioContext | null = null;
let studioCanvas: HTMLCanvasElement | null = null;
let studioDisplayVideo: HTMLVideoElement | null = null;
let studioCamVideo: HTMLVideoElement | null = null;
let studioRafId: number | null = null;

function waitLoadedMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onOk = () => {
      video.removeEventListener("loadedmetadata", onOk);
      video.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      video.removeEventListener("loadedmetadata", onOk);
      video.removeEventListener("error", onErr);
      reject(new Error("Video metadata failed to load."));
    };
    video.addEventListener("loadedmetadata", onOk);
    video.addEventListener("error", onErr);
  });
}

function mountHiddenVideo(): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "true");
  v.style.cssText =
    "position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none;";
  document.body.appendChild(v);
  return v;
}

function detachDisplayEndedListener() {
  if (displayStream && videoTrackEndedHandler) {
    displayStream.getVideoTracks()[0]?.removeEventListener("ended", videoTrackEndedHandler);
  }
  videoTrackEndedHandler = null;
}

function stopDrawLoop() {
  if (studioRafId != null) {
    cancelAnimationFrame(studioRafId);
    studioRafId = null;
  }
}

function teardownDom() {
  stopDrawLoop();
  studioDisplayVideo?.remove();
  studioCamVideo?.remove();
  studioDisplayVideo = null;
  studioCamVideo = null;
  studioCanvas = null;
}

function finalizeStudioStop(): RecorderResult {
  const mime = studioMediaRecorder?.mimeType || "video/webm";
  const blob = new Blob(studioChunks, { type: mime });
  const url = URL.createObjectURL(blob);

  let cameraBlob: Blob | undefined;
  let cameraUrl: string | undefined;
  let cameraMimeType: string | undefined;
  if (studioCameraChunks.length > 0 && studioCameraMediaRecorder) {
    cameraMimeType = studioCameraMediaRecorder.mimeType || "video/webm";
    cameraBlob = new Blob(studioCameraChunks, { type: cameraMimeType });
    cameraUrl = URL.createObjectURL(cameraBlob);
  }

  stopDrawLoop();
  detachDisplayEndedListener();

  try {
    studioAudioContext?.close();
  } catch {
    /* ignore */
  }
  studioAudioContext = null;

  teardownDom();

  displayStream?.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
  displayStream = null;
  micStream = null;
  studioMediaRecorder = null;
  studioChunks = [];
  studioCameraMediaRecorder = null;
  studioCameraChunks = [];

  return {
    blob,
    url,
    mimeType: mime,
    cameraBlob,
    cameraUrl,
    cameraMimeType,
  };
}

function tryEmitStudioStop() {
  if (!studioStopWait) {
    return;
  }
  if (studioStopWait.pendingMain || studioStopWait.pendingCam) {
    return;
  }
  studioStopWait = null;
  const result = finalizeStudioStop();
  const resolve = pendingStudioResolve;
  pendingStudioResolve = null;
  if (resolve) {
    resolve(result);
  } else {
    URL.revokeObjectURL(result.url);
    if (result.cameraUrl) URL.revokeObjectURL(result.cameraUrl);
  }
}

function onStudioMainRecorderStop() {
  if (studioStopWait) {
    studioStopWait.pendingMain = false;
    tryEmitStudioStop();
  }
}

function onStudioCameraRecorderStop() {
  if (studioStopWait) {
    studioStopWait.pendingCam = false;
    tryEmitStudioStop();
  }
}

function runDrawLoop(
  ctx: CanvasRenderingContext2D,
  displayVideo: HTMLVideoElement,
  camVideo: HTMLVideoElement,
  pipFraction: number,
  pipPad: number,
) {
  const draw = () => {
    if (!studioCanvas || studioMediaRecorder?.state !== "recording") {
      return;
    }
    const w = studioCanvas.width;
    const h = studioCanvas.height;
    if (displayVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(displayVideo, 0, 0, w, h);
    }
    if (camVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && camVideo.videoWidth > 0) {
      const pipW = Math.max(64, Math.floor(w * pipFraction));
      const pipH = Math.floor(pipW * (camVideo.videoHeight / camVideo.videoWidth || 1));
      const x = w - pipW - pipPad;
      const y = h - pipH - pipPad;
      ctx.save();
      ctx.translate(x + pipW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(camVideo, 0, 0, pipW, pipH);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, pipW, pipH);
    }
    studioRafId = requestAnimationFrame(draw);
  };
  studioRafId = requestAnimationFrame(draw);
}

/**
 * Starts a composite studio recording:
 * - **Screen** video from display capture
 * - **System / tab audio** from the same capture when `systemAudio` is true (browser-dependent)
 * - **Face** camera in a PiP corner
 * - **Microphone** (external) mixed with display audio
 *
 * Output is a single file from {@link MediaRecorder} (often WebM; MP4 when the browser supports it).
 * Use {@link transcodeWebmToMp4} from `@repo/recorder/transcode` to normalize to MP4 when needed.
 *
 * No-op if a studio recording is already active.
 */
export async function startStudioRecording(
  options: StartStudioRecordingOptions = {},
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Studio recorder can only run in the browser.");
  }
  if (!navigator.mediaDevices?.getDisplayMedia || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media capture APIs are not available.");
  }

  if (studioMediaRecorder?.state === "recording") {
    return;
  }

  const systemAudio = options.systemAudio !== false;
  const surface = options.displaySurface ?? "monitor";

  displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: surface,
    } as MediaTrackConstraints,
    audio: systemAudio,
  });

  const videoConstraints: MediaTrackConstraints | boolean = options.cameraDeviceId
    ? { deviceId: { exact: options.cameraDeviceId } }
    : { facingMode: "user" };

  const audioConstraints: MediaTrackConstraints | boolean = options.microphoneDeviceId
    ? { deviceId: { exact: options.microphoneDeviceId } }
    : true;

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints,
    });
  } catch (e) {
    displayStream.getTracks().forEach((t) => t.stop());
    displayStream = null;
    throw e;
  }

  const displayVideo = mountHiddenVideo();
  const camVideo = mountHiddenVideo();
  displayVideo.srcObject = displayStream;
  camVideo.srcObject = micStream;
  studioDisplayVideo = displayVideo;
  studioCamVideo = camVideo;

  try {
    await displayVideo.play();
    await camVideo.play();
    await Promise.all([waitLoadedMetadata(displayVideo), waitLoadedMetadata(camVideo)]);
  } catch (e) {
    teardownDom();
    displayStream.getTracks().forEach((t) => t.stop());
    micStream.getTracks().forEach((t) => t.stop());
    displayStream = null;
    micStream = null;
    throw e;
  }

  let cw = displayVideo.videoWidth;
  let ch = displayVideo.videoHeight;
  if (!cw || !ch) {
    teardownDom();
    displayStream.getTracks().forEach((t) => t.stop());
    micStream.getTracks().forEach((t) => t.stop());
    displayStream = null;
    micStream = null;
    throw new Error("Display video has no dimensions.");
  }

  const maxW = 1920;
  const maxH = 1080;
  if (cw > maxW) {
    ch = (ch * maxW) / cw;
    cw = maxW;
  }
  if (ch > maxH) {
    cw = (cw * maxH) / ch;
    ch = maxH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(cw);
  canvas.height = Math.floor(ch);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    teardownDom();
    displayStream.getTracks().forEach((t) => t.stop());
    micStream.getTracks().forEach((t) => t.stop());
    displayStream = null;
    micStream = null;
    throw new Error("Could not get canvas 2D context.");
  }
  studioCanvas = canvas;

  const actx = new AudioContext();
  studioAudioContext = actx;
  await actx.resume();

  const dest = actx.createMediaStreamDestination();

  const dTracks = displayStream.getAudioTracks();
  if (dTracks.length > 0) {
    const dSrc = actx.createMediaStreamSource(new MediaStream(dTracks));
    const g = actx.createGain();
    g.gain.value = 0.85;
    dSrc.connect(g);
    g.connect(dest);
  }

  const mTracks = micStream.getAudioTracks();
  if (mTracks.length > 0) {
    const mSrc = actx.createMediaStreamSource(new MediaStream(mTracks));
    const g2 = actx.createGain();
    g2.gain.value = 1;
    mSrc.connect(g2);
    g2.connect(dest);
  }

  const canvasStream = canvas.captureStream(30);
  const vTrack = canvasStream.getVideoTracks()[0];
  const aTracks = dest.stream.getAudioTracks();

  const combined = new MediaStream(
    vTrack ? [vTrack, ...aTracks] : [...aTracks],
  );

  if (combined.getTracks().length === 0) {
    teardownDom();
    try {
      await actx.close();
    } catch {
      /* ignore */
    }
    studioAudioContext = null;
    displayStream.getTracks().forEach((t) => t.stop());
    micStream.getTracks().forEach((t) => t.stop());
    displayStream = null;
    micStream = null;
    throw new Error("No recordable tracks in combined stream.");
  }

  const pickedMime = pickMp4OrWebmMimeType(options.mimeType);
  const recorderOptions: MediaRecorderOptions = {};
  if (pickedMime) recorderOptions.mimeType = pickedMime;
  if (options.videoBitsPerSecond != null) {
    recorderOptions.videoBitsPerSecond = options.videoBitsPerSecond;
  }
  if (options.audioBitsPerSecond != null) {
    recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  const camVideoTrack = micStream.getVideoTracks()[0];
  if (camVideoTrack) {
    const camOnly = new MediaStream([camVideoTrack]);
    const camMime = pickVideoOnlyMimeType(options.mimeType);
    const camOpts: MediaRecorderOptions = {};
    if (camMime) camOpts.mimeType = camMime;
    studioCameraMediaRecorder = new MediaRecorder(camOnly, camOpts);
    studioCameraChunks = [];
    studioCameraMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        studioCameraChunks.push(event.data);
      }
    };
    studioCameraMediaRecorder.onstop = onStudioCameraRecorderStop;
  } else {
    studioCameraMediaRecorder = null;
    studioCameraChunks = [];
  }

  studioMediaRecorder = new MediaRecorder(combined, recorderOptions);
  studioChunks = [];

  studioMediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      studioChunks.push(event.data);
    }
  };
  studioMediaRecorder.onstop = onStudioMainRecorderStop;

  const pipFraction = options.pipWidthFraction ?? 0.22;
  const pipPad = options.pipPadding ?? 16;
  runDrawLoop(ctx, displayVideo, camVideo, pipFraction, pipPad);

  const vt = displayStream.getVideoTracks()[0];
  if (vt) {
    videoTrackEndedHandler = () => {
      if (studioMediaRecorder?.state === "recording") {
        studioStopWait = {
          pendingMain: true,
          pendingCam: !!(
            studioCameraMediaRecorder && studioCameraMediaRecorder.state === "recording"
          ),
        };
        studioMediaRecorder.stop();
        if (studioCameraMediaRecorder?.state === "recording") {
          studioCameraMediaRecorder.stop();
        }
      }
    };
    vt.addEventListener("ended", videoTrackEndedHandler);
  }

  studioMediaRecorder.start();
  studioCameraMediaRecorder?.start();
}

/**
 * Stops the studio composite recording.
 *
 * @throws If there is no active studio recording.
 */
export function stopStudioRecording(): Promise<RecorderResult> {
  if (!studioMediaRecorder || studioMediaRecorder.state !== "recording") {
    return Promise.reject(new Error("No active studio recording to stop."));
  }

  return new Promise((resolve) => {
    pendingStudioResolve = resolve;
    studioStopWait = {
      pendingMain: true,
      pendingCam: !!(studioCameraMediaRecorder && studioCameraMediaRecorder.state === "recording"),
    };
    studioMediaRecorder!.stop();
    if (studioCameraMediaRecorder?.state === "recording") {
      studioCameraMediaRecorder.stop();
    }
  });
}

/** Whether a studio composite recording is in progress. */
export function isStudioRecording(): boolean {
  return studioMediaRecorder?.state === "recording";
}
