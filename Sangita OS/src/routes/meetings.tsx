import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — Sangita OS" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/meetings");
        if (!res.ok) throw new Error("Failed to fetch meetings");
        const data = await res.json();
        setMeetings(data.meetings || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader
            eyebrow="Revenue"
            title="Meetings"
            description="Loading meetings from database..."
          />
          <div className="space-y-3">
            <SkeletonMeeting />
            <SkeletonMeeting />
            <SkeletonMeeting />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader eyebrow="Revenue" title="Meetings" description="Failed to load meetings" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="Meetings"
          description="Every meeting from real database records."
        />
        <div className="space-y-3">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                <Video className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {(m.attendees || []).join(" · ")}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {m.type}
              </Badge>
              <div className="text-xs text-muted-foreground w-40 text-right">
                {m.at ? new Date(m.at).toLocaleString() : "—"}
                <div>{m.duration || "—"}</div>
              </div>
              <Button size="sm">Join</Button>
            </div>
          ))}
          {meetings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No meetings scheduled. Add meetings to the database to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonMeeting() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 animate-pulse">
      <div className="h-10 w-10 rounded-md bg-muted" />
      <div className="flex-1">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded mt-1" />
      </div>
      <div className="h-6 w-16 bg-muted rounded" />
      <div className="h-4 w-24 bg-muted rounded" />
    </div>
  );
}
