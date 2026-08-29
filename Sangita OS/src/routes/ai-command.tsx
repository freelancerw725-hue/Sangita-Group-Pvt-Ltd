import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { AI_RECS } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Brain, Target } from "lucide-react";
import { useOS } from "@/components/os/os-store";

export const Route = createFileRoute("/ai-command")({
  head: () => ({ meta: [{ title: "AI Command Center — Sangita OS" }] }),
  component: () => {
    const { openAI } = useOS();
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader eyebrow="AI" title="AI Command Center" description="Every AI agent, workflow and recommendation — orchestrated from one console." actions={<Button size="sm" className="gap-2" onClick={openAI}><Sparkles className="h-3.5 w-3.5" /> Ask AI</Button>} />
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[{icon: Brain, name: "Strategy Agent", desc: "Board packs, forecasts, weekly briefings.", runs: 42},
              {icon: Zap, name: "Revenue Agent", desc: "Follow-ups, proposals, invoice chasing.", runs: 128},
              {icon: Target, name: "Ops Agent", desc: "Task routing, meeting prep, EOD reviews.", runs: 76}].map((a) => (
              <div key={a.name} className="rounded-xl border border-border bg-card p-4">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center"><a.icon className="h-4 w-4" /></div>
                <div className="text-sm font-medium mt-3">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
                <div className="text-[11px] text-muted-foreground mt-2">{a.runs} runs this week</div>
                <Button size="sm" variant="outline" className="mt-3 h-7 text-xs w-full">Configure</Button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm font-medium text-primary flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4" /> Recommended actions</div>
            <div className="space-y-2">
              {AI_RECS.map((r) => (
                <div key={r.title} className="rounded-lg border border-primary/20 bg-card p-3 flex items-center gap-3">
                  <div className="flex-1"><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.why}</div></div>
                  <div className="text-xs text-emerald-400 font-semibold">{r.impact}</div>
                  <Button size="sm" className="h-7 text-xs">Run</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  },
});