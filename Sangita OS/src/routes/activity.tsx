import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Activity as ActivityIcon } from "lucide-react";
import { inr } from "@/lib/dashboard/server";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity — Sangita OS" }] }),
  component: () => <ActivityPage />,
});

function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/dashboard/activity");
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        setActivities(data.activities || []);
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
        <div className="p-6 max-w-4xl mx-auto">
          <PageHeader
            eyebrow="Daily OS"
            title="Activity feed"
            description="Loading activity from database..."
          />
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="p-4 animate-pulse space-y-4">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <PageHeader
            eyebrow="Daily OS"
            title="Activity feed"
            description="Failed to load activity"
          />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader
          eyebrow="Daily OS"
          title="Activity feed"
          description="Every meaningful event from real database records."
        />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {activities.map((a, i) => (
            <div key={a.id || i} className="p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                <ActivityIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-medium">{a.type.replace("_", " ")}</span>
                  {a.company && <span className="text-muted-foreground"> · {a.company}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.message}</div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No activity recorded yet. Activity will appear as you use the system.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
