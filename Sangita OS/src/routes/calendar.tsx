import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { MEETINGS } from "@/lib/business-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Sangita OS" }] }),
  component: () => {
    const days = ["Mon 28","Tue 29","Wed 30","Thu 31","Fri 01","Sat 02","Sun 03"];
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader eyebrow="Revenue" title="Calendar" description="Week view with meetings and deep work blocks." actions={<Button size="sm">Today</Button>} />
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">{days.map((d) => <div key={d} className="p-3 text-xs font-medium border-r border-border last:border-r-0">{d}</div>)}</div>
            <div className="grid grid-cols-7 min-h-[420px]">
              {days.map((d, i) => (
                <div key={d} className="p-2 border-r border-border last:border-r-0 space-y-2">
                  {i < 2 && MEETINGS.slice(i * 2, i * 2 + 2).map((m) => (<div key={m.id} className="rounded-md border border-primary/40 bg-primary/10 p-2 text-[11px]"><div className="font-medium">{m.title}</div><div className="text-muted-foreground">{m.duration}</div></div>))}
                  {i === 2 && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px]"><div className="font-medium">Deep work · Board deck</div><div className="text-muted-foreground">09:00–11:00</div></div>}
                  {i === 4 && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px]"><div className="font-medium">Weekly review</div><div className="text-muted-foreground">16:00–17:00</div></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  },
});