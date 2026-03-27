import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DottedSurface } from "@/components/ui/dotted-surface";

export default function Home() {
  return (
    <>
    {/* have to add dotted surface */}
      <DottedSurface className="size-full" />
      <main className="relative min-h-screen text-foreground flex flex-col items-center justify-center">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 px-6 py-20">
        <div className="space-y-4 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center p-2 border border-primary rounded-full w-fit h-fit px-12">
            <p className="text-sm text-muted-foreground">MNY</p>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl text-center">
            Record, edit, and organize captures in one workflow.
          </h1>
          <p className="text-muted-foreground text-center">
            Simple landing page for now. Use the links below to open the recorder studio,
            timeline editor, and recordings library built with your shared recorder package.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="default" size="lg" className="text-lg px-4!">
            <Link href="/studio">Record</Link>
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-4! shadow-[0_0_5px_rgba(255,255,255,0.2)]"> 
            <Link href="/editor">Open Editor</Link>
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-4! shadow-[0_0_5px_rgba(255,255,255,0.2)]">
            <Link href="/library">Open Library</Link>
          </Button>
        </div>

        </div>
      </main>
    </>
  );
}
