"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Circle, CircleStop, Mic, Monitor, Sparkles, Video, Volume2, VolumeX } from "lucide-react";
import { isRecording, startRecording, stopRecording } from "@repo/recorder";
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
  { id: "full", label: "Full Screen", width: "100%", height: "100%" },
] as const;

const PREVIEW_SHAPES = [
  { id: "square", label: "Square" },
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
] as const;

type CameraSource = (typeof CAMERA_SOURCES)[number]["id"];
type PreviewSize = (typeof PREVIEW_SIZES)[number]["id"];
type PreviewShape = (typeof PREVIEW_SHAPES)[number]["id"];

export default function RecorderPanelPage() {
  const [status, setStatus] = useState<"idle" | "recording" | "saved">("idle");
  const [timer, setTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraSource, setCameraSource] = useState<CameraSource>("profile");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("medium");
  const [previewShape, setPreviewShape] = useState<PreviewShape>("circle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

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

  function stopCameraStream() {
    setCameraStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }

  async function startCameraStream() {
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
  }

  useEffect(() => {
    if (cameraSource === "live") {
      void startCameraStream();
    } else {
      stopCameraStream();
      setCameraError(null);
    }
  }, [cameraSource]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  async function handleStart() {
    try {
      if (cameraSource === "live" && !cameraStream) {
        await startCameraStream();
      }
      await startRecording();
      setStatus("recording");
      const start = Date.now();
      const id = window.setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      (window as typeof window & { __extTimer?: number }).__extTimer = id;
    } catch (error) {
      console.error(error);
      alert("Please allow microphone access.");
    }
  }

  async function handleStop() {
    if (!isRecording()) return;
    const result = await stopRecording();
    const id = (window as typeof window & { __extTimer?: number }).__extTimer;
    if (id) window.clearInterval(id);
    setAudioUrl(result.url);
    setStatus("saved");
  }

  return (
    <main className="dark h-screen w-full px-4 py-6 text-foreground flex justify-center">
      <div className="flex flex-col items-start justify-end gap-4 w-full h-full p-4">
        <div
          className={`relative flex items-center justify-center overflow-hidden border border-border/60 bg-muted/30 ${previewShapeClass}`}
          style={{ width: previewDimensions.width, height: previewDimensions.height }}
        >
          {cameraSource === "profile" ? (
            <Image src="/Image21.png" alt="MNY" width={Number(previewDimensions.width)} height={Number(previewDimensions.height)} className={`h-full w-full object-cover ${previewShapeClass}`} />
          ) : cameraStream ? (
            <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${previewShapeClass}`} />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {cameraError ?? "Waiting for camera feed..."}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Record your screen, audio, and optional camera overlay</p>
      </div>
      <div className="flex flex-col items-end gap-4 w-full h-full">
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Badge variant={status === "recording" ? "default" : "secondary"} className={`p-2 border dark:border-white/20 border-black/20 ${status === "recording" ? "bg-red-500/60 text-white" : "bg-secondary/20"} ${status === "saved" ? "bg-green-500/60 text-white" : ""}`}>
            {status === "recording" ? `REC ${timerLabel}` : status.toUpperCase()}
          </Badge>
        </div>

        {/* Capture Source */}
        <Card>
          <CardHeader>
            <CardTitle>Capture Source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="secondary" className="justify-start">
              <Monitor className="mr-2 h-4 w-4" /> Entire Screen
            </Button>
            <Button variant="outline" className="justify-start">
              <Video className="mr-2 h-4 w-4" /> Browser Tab
            </Button>
            <Button variant="outline" className="justify-start">
              <Sparkles className="mr-2 h-4 w-4" /> App Window
            </Button>
            <Separator />
            <Button variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Camera Only
            </Button>
          </CardContent>
        </Card>

        {/* Camera Overlay */}
        <Card className="overflow-y-auto">
          <CardHeader>
            <CardTitle>Camera Overlay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Source</p>
              <Select value={cameraSource} onValueChange={(value) => setCameraSource(value as CameraSource)}>
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

        {/* Audio Input */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsMuted(!isMuted)}>
              {
                isMuted ? (
                  <VolumeX className="mr-2 h-4 w-4" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )
              }
              {isMuted ? "Mute Audio" : "Unmute Audio"}
            </Button>
            <Select defaultValue="default">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Built-in Mic</SelectItem>
                <SelectItem value="usb">USB Mic</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-2 text-sm pt-2">
              <span>Record system audio</span>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Transport */}
        <Card>
          <CardHeader>
            <CardTitle>Transport</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 w-80">
            <div className="flex items-center justify-center gap-2">
              <Button size="icon" variant="outline">
                <Mic className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={status === "recording" ? handleStop : handleStart}>
                {status === "recording" ? (
                  <CircleStop className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Separator />
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Your recording preview appears here after stopping.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
