import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { ACTIVITY_FEED } from "@/lib/business-data";
import { Activity as ActivityIcon } from "lucide-react";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader eyebrow="Daily OS" title="Activity feed" description="Every meaningful event across your business." />
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {ACTIVITY_FEED.map((a, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center"><ActivityIcon className="h-4 w-4" /></div>
              <div className="flex-1"><div className="text-sm"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">· {a.type}</span></div><div className="text-xs text-muted-foreground mt-0.5">{a.text}</div></div>
              <div className="text-[11px] text-muted-foreground">{a.at}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});