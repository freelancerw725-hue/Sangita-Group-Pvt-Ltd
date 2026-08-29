import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { MEETINGS } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader eyebrow="Revenue" title="Meetings" description="Every meeting gets a brief, transcript and action items." />
        <div className="space-y-3">
          {MEETINGS.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Video className="h-4 w-4" /></div>
              <div className="flex-1"><div className="text-sm font-medium">{m.title}</div><div className="text-[11px] text-muted-foreground">{m.attendees.join(" · ")}</div></div>
              <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
              <div className="text-xs text-muted-foreground w-32 text-right">{m.at}<div>{m.duration}</div></div>
              <Button size="sm">Join</Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});