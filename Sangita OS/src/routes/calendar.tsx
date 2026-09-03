import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Sangita OS" }] }),
  component: CalendarPage,
});

function CalendarPage() {
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

  // Generate week days
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return { date: d, label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }) };
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader
            eyebrow="Revenue"
            title="Calendar"
            description="Loading meetings from database..."
          />
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {days.map((d) => (
                <div
                  key={d.label}
                  className="p-3 text-xs font-medium border-r border-border last:border-r-0"
                >
                  {d.label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[420px]">
              {days.map(() => (
                <div className="p-2 border-r border-border last:border-r-0 space-y-2 animate-pulse">
                  <div className="h-8 w-full bg-muted rounded" />
                  <div className="h-8 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader eyebrow="Revenue" title="Calendar" description="Failed to load calendar" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Group meetings by day
  const meetingsByDay = new Map<string, any[]>();
  for (const m of meetings) {
    const day = new Date(m.at).toDateString();
    if (!meetingsByDay.has(day)) meetingsByDay.set(day, []);
    meetingsByDay.get(day)!.push(m);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="Calendar"
          description="Week view with meetings from real database records."
          actions={<Button size="sm">Today</Button>}
        />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {days.map((d) => (
              <div
                key={d.label}
                className="p-3 text-xs font-medium border-r border-border last:border-r-0"
              >
                {d.label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[420px]">
            {days.map((d) => (
              <div key={d.label} className="p-2 border-r border-border last:border-r-0 space-y-2">
                {(meetingsByDay.get(d.date.toDateString()) || []).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-md border border-primary/40 bg-primary/10 p-2 text-[11px]"
                  >
                    <div className="font-medium">{m.title}</div>
                    <div className="text-muted-foreground">
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {m.duration || "—"}
                    </div>
                  </div>
                ))}
                {meetingsByDay.get(d.date.toDateString())?.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">No meetings</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
