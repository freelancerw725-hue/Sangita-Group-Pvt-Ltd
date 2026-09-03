import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sangita OS" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();
        setNotifications(data.notifications || []);
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
        <div className="p-6 max-w-3xl mx-auto">
          <PageHeader
            eyebrow="System"
            title="Notifications"
            description="Loading notifications from database..."
          />
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="p-4 animate-pulse space-y-4">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <PageHeader
            eyebrow="System"
            title="Notifications"
            description="Failed to load notifications"
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
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader
          eyebrow="System"
          title="Notifications"
          description="Everything that needs your attention — from real database records."
          actions={
            <Button size="sm" variant="outline">
              Mark all read
            </Button>
          }
        />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-3 ${n.unread ? "bg-primary/5" : ""}`}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {n.title}{" "}
                  {n.unread && (
                    <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{n.detail}</div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet. They will appear as events occur in the system.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
