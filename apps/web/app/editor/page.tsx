"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Mic, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WEB_EXTENSION_ORIGINS = (
  process.env.NEXT_PUBLIC_EXTENSION_ORIGIN ?? "http://localhost:3001"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type StudioImportPayload = {
  mainBlob: Blob;
  cameraBlob?: Blob;
  mainMimeType?: string;
  cameraMimeType?: string;
};

function TimelineStrip({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-[10px] opacity-70">00:00</span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-md border bg-muted/20">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 1px, transparent 1px, transparent 8px)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-8 opacity-60"
          style={{
            background: `linear-gradient(180deg, transparent, ${accent}33)`,
          }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/20" />
      </div>
    </div>
  );
}

export default function EditorPage() {
  const [mainUrl, setMainUrl] = useState<string | null>(null);
  const [cameraUrl, setCameraUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"audio" | "video" | "camera">("video");
  const [imported, setImported] = useState(false);
  const mainUrlRef = useRef<string | null>(null);
  const cameraUrlRef = useRef<string | null>(null);

  const revokeAll = useCallback(() => {
    if (mainUrlRef.current) {
      URL.revokeObjectURL(mainUrlRef.current);
      mainUrlRef.current = null;
    }
    if (cameraUrlRef.current) {
      URL.revokeObjectURL(cameraUrlRef.current);
      cameraUrlRef.current = null;
    }
  }, []);

  const applyImport = useCallback(
    (payload: StudioImportPayload) => {
      revokeAll();
      const m = URL.createObjectURL(payload.mainBlob);
      mainUrlRef.current = m;
      setMainUrl(m);
      if (payload.cameraBlob && payload.cameraBlob.size > 0) {
        const c = URL.createObjectURL(payload.cameraBlob);
        cameraUrlRef.current = c;
        setCameraUrl(c);
      } else {
        setCameraUrl(null);
      }
      setImported(true);
      setTab("video");
    },
    [revokeAll],
  );

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!WEB_EXTENSION_ORIGINS.includes(e.origin)) {
        return;
      }
      if (e.data?.type !== "STUDIO_RECORDING") {
        return;
      }
      const { mainBlob, cameraBlob, mainMimeType: _m, cameraMimeType: _c } = e.data as StudioImportPayload & {
        type: string;
      };
      if (!(mainBlob instanceof Blob)) {
        return;
      }
      applyImport({ mainBlob, cameraBlob, mainMimeType: _m, cameraMimeType: _c });
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [applyImport]);

  useEffect(() => {
    if (window.opener) {
      for (const origin of WEB_EXTENSION_ORIGINS) {
        try {
          window.opener.postMessage({ type: "EDITOR_READY" }, origin);
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  useEffect(() => {
    return () => revokeAll();
  }, [revokeAll]);

  const previewVideo = tab === "camera" && cameraUrl ? cameraUrl : mainUrl;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 pt-12">
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="flex-row items-center justify-between shrink-0">
            <CardTitle>Timeline Editor</CardTitle>
            <div className="flex items-center gap-2">
              {imported ? (
                <Badge variant="secondary">Imported from recorder</Badge>
              ) : (
                <Badge variant="outline">No import</Badge>
              )}
              <Badge variant="secondary">00:04:12 / 08:24</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex aspect-video min-h-[200px] items-center justify-center rounded-lg border bg-muted/30 p-4">
              {tab === "audio" ? (
                <div className="flex h-full w-full flex-col justify-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mic className="h-4 w-4" />
                    <span>Program audio (from composite)</span>
                  </div>
                  <div className="relative h-24 overflow-hidden rounded-md border bg-muted/20">
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, var(--chart-1) 0px, var(--chart-1) 1px, transparent 1px, transparent 6px)",
                      }}
                    />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/25" />
                  </div>
                </div>
              ) : previewVideo ? (
                <video
                  key={`${tab}-${previewVideo}`}
                  className="max-h-full max-w-full rounded-md"
                  controls
                  src={previewVideo}
                />
              ) : (
                <Button size="lg" variant="secondary" type="button" disabled={!imported}>
                  <Film className="mr-2 h-4 w-4" /> Preview Playback
                </Button>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Render quality</span>
                <span>4K (Ultra HD)</span>
              </div>
              <Progress value={52} />
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as typeof tab)}
              orientation="horizontal"
              className="mt-auto flex min-h-0 flex-1 flex-col gap-3"
            >
              <TabsList variant="line" className="w-full justify-start gap-6 border-b border-border/60 bg-transparent p-0">
                <TabsTrigger value="audio" className="rounded-none px-1 pb-2">
                  <Mic className="mr-1.5 h-4 w-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="video" className="rounded-none px-1 pb-2">
                  <Video className="mr-1.5 h-4 w-4" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="camera" className="rounded-none px-1 pb-2">
                  <Film className="mr-1.5 h-4 w-4" />
                  Camera
                </TabsTrigger>
              </TabsList>

              <TabsContent value="audio" className="mt-0 flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Mixed audio from your recording (screen capture + microphone). Use the waveform
                  strips as a guide for edits.
                </p>
                <TimelineStrip label="Mixed program audio" accent="var(--chart-1)" />
                <TimelineStrip label="Microphone" accent="var(--chart-2)" />
              </TabsContent>

              <TabsContent value="video" className="mt-0 flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Screen composite (screen + PiP). This is the main program track.
                </p>
                <TimelineStrip label="Screen + PiP composite" accent="var(--chart-3)" />
              </TabsContent>

              <TabsContent value="camera" className="mt-0 flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Isolated camera feed recorded in parallel for tighter edits on the face cam.
                </p>
                {!cameraUrl ? (
                  <p className="text-xs text-muted-foreground">No separate camera file in this import.</p>
                ) : (
                  <TimelineStrip label="Camera (isolated)" accent="var(--chart-4)" />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
