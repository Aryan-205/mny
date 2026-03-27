"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Camera,
  Circle,
  CircleStop,
  Library,
  Mic,
  Monitor,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { isRecording, startRecording, stopRecording } from "@repo/recorder";
import { AppNavbar } from "@/components/app-navbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function StudioPage() {
  const [status, setStatus] = useState<"idle" | "recording" | "saved">("idle");
  const [timer, setTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const timerLabel = useMemo(() => {
    const m = String(Math.floor(timer / 60)).padStart(2, "0");
    const s = String(timer % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [timer]);

  async function handleStart() {
    try {
      await startRecording();
      setStatus("recording");
      const start = Date.now();
      const id = window.setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      (window as typeof window & { __studioTimer?: number }).__studioTimer = id;
    } catch (error) {
      console.error(error);
      alert("Microphone permission is required to record.");
    }
  }

  async function handleStop() {
    if (!isRecording()) return;
    setSaving(true);
    try {
      const result = await stopRecording();
      setAudioUrl(result.url);
      setStatus("saved");
    } catch (error) {
      console.error(error);
    } finally {
      const id = (window as typeof window & { __studioTimer?: number }).__studioTimer;
      if (id) window.clearInterval(id);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground w-full p-4">

      <main className="grid gap-4 px-4 py-4 lg:grid-cols-[220px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="secondary" className="w-full justify-start">
              <Video className="mr-2 h-4 w-4" /> Current Project
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Monitor className="mr-2 h-4 w-4" /> Drafts
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/library">
                <Library className="mr-2 h-4 w-4" /> Library
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recording Preview</CardTitle>
              <CardDescription>Studio canvas and transport controls</CardDescription>
            </div>
            <Badge variant={status === "recording" ? "default" : "secondary"}>
              {status === "recording" ? `REC ${timerLabel}` : status.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Preview Surface</p>
                {audioUrl ? (
                  <audio className="mt-3" controls src={audioUrl} />
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No recording yet</p>
                )}
              </div>
            </div>

            <Card className="p-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="icon" variant="outline">
                  <Camera className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={status === "recording" ? handleStop : handleStart}
                  disabled={saving}
                >
                  {status === "recording" ? (
                    <CircleStop className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <Link href="/editor">
                    <WandSparkles className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Search projects..." className="h-8" />
              <Avatar className="h-8 w-8">
                <AvatarFallback>KE</AvatarFallback>
              </Avatar>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Capture Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" className="w-full justify-start">
                <Monitor className="mr-2 h-4 w-4" /> Entire Screen
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Video className="mr-2 h-4 w-4" /> Browser Tab
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" /> Application Window
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="default-mic">
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default-mic">Built-in Microphone</SelectItem>
                  <SelectItem value="usb-mic">USB Microphone</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between text-sm">
                <span>Record system audio</span>
                <Switch />
              </div>
              <Separator />
              <Button variant="outline" className="w-full" asChild>
                <Link href="/editor">Open Timeline Editor</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
