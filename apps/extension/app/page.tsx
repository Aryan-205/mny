import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-20">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Kinetic Editor Extension</p>
          <h1 className="text-4xl font-semibold tracking-tight">Quick capture panel</h1>
          <p className="text-muted-foreground">
            Lightweight entry page. Open the recorder panel route for start/stop recording,
            source selection, and quick actions.
          </p>
        </div>
        <div>
          <Button asChild>
            <Link href="/recorder">Open Recorder Panel</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Shared Logic</CardTitle>
            <CardDescription>
              This app uses <code>@repo/recorder</code> for actual recording behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Built with shadcn components and default design tokens only.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
