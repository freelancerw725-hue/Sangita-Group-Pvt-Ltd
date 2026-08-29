import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { NOTIFICATIONS_FULL } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader eyebrow="System" title="Notifications" description="Everything that needs your attention — grouped by AI." actions={<Button size="sm" variant="outline">Mark all read</Button>} />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {NOTIFICATIONS_FULL.map((n) => (
            <div key={n.id} className={`p-4 flex items-start gap-3 ${n.unread ? "bg-primary/5" : ""}`}>
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center"><Bell className="h-4 w-4" /></div>
              <div className="flex-1"><div className="text-sm font-medium flex items-center gap-2">{n.title} {n.unread && <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">NEW</Badge>}</div><div className="text-xs text-muted-foreground">{n.detail}</div></div>
              <div className="text-[11px] text-muted-foreground">{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});