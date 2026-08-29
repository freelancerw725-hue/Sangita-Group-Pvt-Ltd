import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { HABIT_LOG } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Plus, Flame } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader eyebrow="Daily OS" title="Habits" description="The rituals that keep the operator sharp." actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add habit</Button>} />
        <div className="space-y-3">
          {HABIT_LOG.map((h) => (
            <div key={h.habit} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="flex-1"><div className="text-sm font-medium">{h.habit}</div><div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Flame className="h-3.5 w-3.5 text-amber-400" /> {h.streak}-day streak</div></div>
              <div className="flex gap-1">{h.week.map((d, i) => <span key={i} className={`h-6 w-6 rounded-md ${d ? "bg-emerald-400/80" : "bg-muted"}`} />)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});