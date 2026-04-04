"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Circle,
  CircleStop,
  Monitor,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  isStudioRecording,
  startStudioRecording,
  stopStudioRecording,
} from "@repo/recorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import Image from "next/image";

const CAMERA_SOURCES = [
  { id: "profile", label: "Profile Picture" },
  { id: "live", label: "Live Camera Feed" },
] as const;

const PREVIEW_SIZES = [
  { id: "small", label: "Small", width: 160, height: 160 },
  { id: "medium", label: "Medium", width: 320, height: 320 },
  { id: "full", label: "Full", width: "100%", height: "100%" },
] as const;

const PREVIEW_SHAPES = [
  { id: "square", label: "Square" },
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
] as const;

type CameraSource = (typeof CAMERA_SOURCES)[number]["id"];
type PreviewSize = (typeof PREVIEW_SIZES)[number]["id"];
type PreviewShape = (typeof PREVIEW_SHAPES)[number]["id"];
type DisplaySurface = "monitor" | "browser";

const WEB_EDITOR_ORIGIN =
  process.env.NEXT_PUBLIC_WEB_EDITOR_ORIGIN ?? "http://localhost:3000";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function RecorderPanelPage() {
  const [status, setStatus] = useState<"idle" | "recording" | "saved" | "encoding">("idle");
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraSource, setCameraSource] = useState<CameraSource>("profile");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("medium");
  const [previewShape, setPreviewShape] = useState<PreviewShape>("circle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordSystemAudio, setRecordSystemAudio] = useState(true);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState<string>("default");
  const [displaySurface, setDisplaySurface] = useState<DisplaySurface>("monitor");
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  const pendingImportRef = useRef<{
    mainBlob: Blob;
    cameraBlob?: Blob;
    mainMimeType?: string;
    cameraMimeType?: string;
  } | null>(null);

  const timerLabel = useMemo(() => {
    const m = String(Math.floor(timer / 60)).padStart(2, "0");
    const s = String(timer % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [timer]);

  const activeSize = PREVIEW_SIZES.find((option) => option.id === previewSize) ?? PREVIEW_SIZES[1];

  const previewDimensions = useMemo(() => {
    if (previewShape === "circle") {
      return {
        width: activeSize.width,
        height: activeSize.width,
      };
    }

    if (previewShape === "square") {
      const side = Math.min(Number(activeSize.width), Number(activeSize.height));
      return {
        width: side,
        height: side,
      };
    }

    return {
      width: activeSize.width,
      height: activeSize.height,
    };
  }, [activeSize, previewShape]);

  const previewShapeClass =
    previewShape === "circle"
      ? "rounded-full"
      : previewShape === "square"
        ? "rounded-xl"
        : "rounded-2xl";

  const stopCameraStream = useCallback(() => {
    setCameraStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }, []);

  const startCameraStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCameraError(null);
      setCameraStream((prev) => {
        if (prev) {
          prev.getTracks().forEach((track) => track.stop());
        }
        return stream;
      });
    } catch (error) {
      console.error(error);
      setCameraError("Camera access blocked. Enable camera permission.");
    }
  }, []);

  useEffect(() => {
    if (cameraSource === "live" && status !== "recording") {
      void startCameraStream();
    } else if (cameraSource === "profile") {
      stopCameraStream();
      setCameraError(null);
    }
  }, [cameraSource, status, stopCameraStream, startCameraStream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    async function listMics() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setMicDevices(list.filter((d) => d.kind === "audioinput" && d.deviceId));
      } catch {
        setMicDevices([]);
      }
    }
    void listMics();
    const md = navigator.mediaDevices;
    md?.addEventListener("devicechange", listMics);
    return () => md?.removeEventListener("devicechange", listMics);
  }, []);

  useEffect(() => {
    function onEditorReady(e: MessageEvent) {
      if (e.origin !== WEB_EDITOR_ORIGIN) {
        return;
      }
      if (e.data?.type !== "EDITOR_READY") {
        return;
      }
      const pending = pendingImportRef.current;
      if (!pending || !e.source || typeof e.source.postMessage !== "function") {
        return;
      }
      e.source.postMessage(
        {
          type: "STUDIO_RECORDING",
          mainBlob: pending.mainBlob,
          cameraBlob: pending.cameraBlob,
          mainMimeType: pending.mainMimeType,
          cameraMimeType: pending.cameraMimeType,
        },
        { targetOrigin: WEB_EDITOR_ORIGIN },
      );
      pendingImportRef.current = null;
    }
    window.addEventListener("message", onEditorReady);
    return () => window.removeEventListener("message", onEditorReady);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  async function openEditorWithRecording(payload: {
    mainBlob: Blob;
    cameraBlob?: Blob;
    mainMimeType?: string;
    cameraMimeType?: string;
  }) {
    pendingImportRef.current = payload;
    const url = `${WEB_EDITOR_ORIGIN}/editor?import=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleStart() {
    try {
      for (let n = 3; n >= 1; n--) {
        setCountdown(n);
        await delay(1000);
      }
      setCountdown(null);

      stopCameraStream();
      const micOpt =
        micDeviceId && micDeviceId !== "default"
          ? { microphoneDeviceId: micDeviceId }
          : {};
      await startStudioRecording({
        systemAudio: recordSystemAudio,
        displaySurface,
        ...micOpt,
      });
      setStatus("recording");
      const start = Date.now();
      const id = window.setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      (window as typeof window & { __extTimer?: number }).__extTimer = id;
    } catch (error) {
      console.error(error);
      setCountdown(null);
      alert(
        "Could not start recording. Allow screen + camera + microphone when prompted.",
      );
      if (cameraSource === "live") void startCameraStream();
    }
  }

  async function handleStop() {
    if (!isStudioRecording()) return;
    const t = (window as typeof window & { __extTimer?: number }).__extTimer;
    if (t) window.clearInterval(t);

    setStatus("encoding");
    try {
      const raw = await stopStudioRecording();
      await openEditorWithRecording({
        mainBlob: raw.blob,
        cameraBlob: raw.cameraBlob,
        mainMimeType: raw.mimeType,
        cameraMimeType: raw.cameraMimeType,
      });

      setTimer(0);
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      alert("Failed to finish recording.");
    }

    if (cameraSource === "live") void startCameraStream();
  }

  return (
    <main className="dark relative h-screen w-full px-4 py-6 text-foreground flex justify-center">
      {countdown !== null ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <span className="text-[min(22vw,9rem)] font-semibold tabular-nums text-white drop-shadow-lg">
            {countdown}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col items-start justify-end gap-4 w-full h-full p-4">
        <div
          className={`relative flex items-center justify-center overflow-hidden border border-border/60 bg-muted/30 ${previewShapeClass}`}
          style={{ width: previewDimensions.width, height: previewDimensions.height }}
        >
          {status === "recording" ? (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              Recording… pick a screen or tab to share. Camera preview is paused to avoid device
              conflicts.
            </div>
          ) : cameraSource === "profile" ? (
            <Image
              src="/Image21.png"
              alt="MNY"
              width={Number(previewDimensions.width)}
              height={Number(previewDimensions.height)}
              className={`h-full w-full object-cover ${previewShapeClass}`}
            />
          ) : cameraStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full -scale-x-100 object-cover ${previewShapeClass}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {cameraError ?? "Waiting for camera feed..."}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-4 w-full h-full">
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Badge
            variant={status === "recording" ? "default" : "secondary"}
            className={`p-2 border dark:border-white/20 border-black/20 ${status === "recording" ? "bg-red-500/60 text-white" : "bg-secondary/20"}`}
          >
            {status === "encoding"
              ? "ENCODING MP4"
              : status === "recording"
                ? `REC ${timerLabel}`
                : status.toUpperCase()}
          </Badge>
        </div>

        <Card className="overflow-y-auto">
          <CardHeader>
            <CardTitle>Camera Overlay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Source</p>
              <Select
                value={cameraSource}
                onValueChange={(value) => setCameraSource(value as CameraSource)}
                disabled={status === "recording"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select camera source" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_SOURCES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Size</p>
              <Select value={previewSize} onValueChange={(value) => setPreviewSize(value as PreviewSize)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_SIZES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Shape</p>
              <Select value={previewShape} onValueChange={(value) => setPreviewShape(value as PreviewShape)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select shape" />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_SHAPES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audio Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start" type="button" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? (
                <VolumeX className="mr-2 h-4 w-4" />
              ) : (
                <Volume2 className="mr-2 h-4 w-4" />
              )}
              {isMuted ? "Mute Audio" : "Unmute Audio"}
            </Button>
            <Select value={micDeviceId} onValueChange={setMicDeviceId} disabled={status === "recording"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default microphone</SelectItem>
                {micDevices.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 8)}…`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-2 text-sm pt-2">
              <span>Record system audio</span>
              <Switch checked={recordSystemAudio} onCheckedChange={setRecordSystemAudio} disabled={status === "recording"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capture Source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant={displaySurface === "monitor" ? "secondary" : "outline"}
              className="justify-start"
              type="button"
              disabled={status === "recording" || status === "encoding"}
              onClick={() => setDisplaySurface("monitor")}
            >
              <Monitor className="mr-2 h-4 w-4" /> Full screen
            </Button>
            <Button
              variant={displaySurface === "browser" ? "secondary" : "outline"}
              className="justify-start"
              type="button"
              disabled={status === "recording" || status === "encoding"}
              onClick={() => setDisplaySurface("browser")}
            >
              <Video className="mr-2 h-4 w-4" /> Browser tab
            </Button>
            <Button variant="outline" className="justify-start" type="button" disabled>
              <Sparkles className="mr-2 h-4 w-4" /> Window (picker may still offer this)
            </Button>
            <Separator />
            <Button variant="outline" className="w-full" type="button" disabled>
              <Camera className="mr-2 h-4 w-4" />
              PiP face cam included
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transport</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 w-80">
            <div className="flex items-center justify-center gap-2">
              <Button size="icon" variant="outline" type="button" disabled>
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                type="button"
                disabled={status === "encoding" || countdown !== null}
                onClick={status === "recording" ? handleStop : handleStart}
              >
                {status === "recording" ? (
                  <CircleStop className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              When you stop, the recording opens in the web editor ({WEB_EDITOR_ORIGIN}) with Audio,
              Video, and Camera tabs. Format is whatever the browser recorded (often WebM).
            </p>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
