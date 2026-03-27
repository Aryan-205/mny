"use client";

import Link from "next/link";
import { Calendar, PlusCircle, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

const mediaTypes = ["video", "audio", "screenshot"] as const;
type MediaType = (typeof mediaTypes)[number];

const mediaItems: Array<{
  name: string;
  length: string;
  type: MediaType;
  meta: string;
  size: string;
  date: string;
  thumbnail: string;
}> = [
  {
    name: "Interface Animation",
    length: "04:22",
    type: "video",
    meta: "60 FPS",
    size: "42.6 MB",
    date: "Oct 24, 2024",
    thumbnail:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "System Architecture",
    length: "12:45",
    type: "video",
    meta: "30 FPS",
    size: "156.2 MB",
    date: "Oct 22, 2024",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Podcast Intro",
    length: "02:36",
    type: "audio",
    meta: "MP3",
    size: "5.1 MB",
    date: "Oct 19, 2024",
    thumbnail:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Theme Background Loop",
    length: "01:14",
    type: "audio",
    meta: "WAV",
    size: "13.8 MB",
    date: "Oct 17, 2024",
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type")?.toLowerCase();
  const selectedType: MediaType = mediaTypes.includes(typeParam as MediaType)
    ? (typeParam as MediaType)
    : "video";
  const filteredItems = mediaItems.filter((item) => item.type === selectedType);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 w-full">
      <main className="w-full space-y-12 px-4 pb-6 ">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-primary pb-8">
          <div className="flex items-center gap-2">
          {mediaTypes.map((item) => (
            <Button
              key={item}
              variant={selectedType === item ? "secondary" : "ghost"}
              className="h-full px-4! py-1!"
              asChild
            >
              <Link href={`/library?type=${item}`}>
                <p
                  className={cn(
                    "text-sm text-muted-foreground",
                    selectedType === item
                      ? "text-green-500!"
                      : "text-black dark:text-white",
                  )}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </p>
              </Link>
            </Button>
          ))}
          </div>
          <div>
            <Button variant="default" size="lg" className="w-full h-full px-4! py-2!">
              <PlusCircle className="h-4 w-4" />
              <p className="text-sm text-white">New</p>
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-md px-6 text-center">

            <p className="text-xl font-medium dark:text-white text-black">Nothing to see here</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <Card
                key={item.name}
                className="overflow-hidden hover:border-primary hover:border pt-0!"
              >
                <div className="aspect-video w-full relative overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 right-0 py-2 px-4 bg-black rounded-tl-xl text-white text-sm">
                    {item.length}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{item.meta}</span>
                    <Badge variant="secondary">{item.size}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{item.date}</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 p-2!">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full h-full"
                    asChild
                  >
                    <Link href="/editor">Edit</Link>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
