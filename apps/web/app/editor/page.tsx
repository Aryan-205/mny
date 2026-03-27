"use client";

import Link from "next/link";
import { Film, Scissors, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_260px] pt-12">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Timeline Editor</CardTitle>
            <Badge variant="secondary">00:04:12 / 08:24</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted/30">
              <Button size="lg" variant="secondary">
                <Film className="mr-2 h-4 w-4" /> Preview Playback
              </Button>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Render quality</span>
                <span>4K (Ultra HD)</span>
              </div>
              <Progress value={52} />
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Timeline</p>
              <div className="h-16 rounded-md bg-muted/40" />
              <div className="h-16 rounded-md bg-muted/40" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start">
                <Scissors className="mr-2 h-4 w-4" /> Trim
              </Button>
              <Button variant="outline" className="justify-start">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Speed
              </Button>
              <Button variant="outline" className="justify-start">
                <Sparkles className="mr-2 h-4 w-4" /> Filter
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Overlay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Type overlay content..." />
              <Separator />
              <Button className="w-full">Apply Text Layer</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
