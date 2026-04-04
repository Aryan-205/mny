import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let loadPromise: Promise<FFmpeg> | null = null;

async function getLoadedFFmpeg(): Promise<FFmpeg> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return loadPromise;
}

/**
 * True when the browser already produced an MP4-ish container from MediaRecorder.
 */
export function recordingNeedsMp4Transcode(mimeType: string | undefined): boolean {
  if (!mimeType) return true;
  return !mimeType.toLowerCase().includes("mp4");
}

/**
 * Re-encodes a WebM (or other) recording to **MP4** (H.264 + AAC) using ffmpeg.wasm.
 * First call downloads the wasm core from jsDelivr (several MB).
 */
export async function transcodeWebmToMp4(
  input: Blob,
  onLog?: (message: string) => void,
): Promise<Blob> {
  const ffmpeg = await getLoadedFFmpeg();
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }
  await ffmpeg.writeFile("input.webm", await fetchFile(input));
  await ffmpeg.exec([
    "-i",
    "input.webm",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-y",
    "output.mp4",
  ]);
  const data = await ffmpeg.readFile("output.mp4");
  if (!(data instanceof Uint8Array)) {
    throw new Error("Expected binary MP4 output from ffmpeg.");
  }
  const u8 = new Uint8Array(data);
  await ffmpeg.deleteFile("input.webm");
  await ffmpeg.deleteFile("output.mp4");
  return new Blob([u8], { type: "video/mp4" });
}
