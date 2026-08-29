import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Sparkles, Plus, Coffee, Brain, Users, Phone, Zap } from "lucide-react";
import { motion } from "framer-motion";

type Block = { time: string; end: string; title: string; type: "focus" | "meeting" | "call" | "break" | "admin"; impact?: string; done?: boolean };
const INITIAL: Block[] = [
  { time: "07:30", end: "08:15", title: "Morning routine + workout", type: "break" },
  { time: "08:30", end: "10:30", title: "Deep work — Q3 board deck", type: "focus", impact: "Strategic" },
  { time: "10:30", end: "11:00", title: "Coffee + inbox triage", type: "admin" },
  { time: "11:00", end: "11:45", title: "Call — Rajat @ Acme (MSA)", type: "call", impact: "+₹8.4L" },
  { time: "12:00", end: "13:00", title: "Revenue standup", type: "meeting" },
  { time: "13:00", end: "14:00", title: "Lunch", type: "break" },
  { time: "14:00", end: "15:30", title: "Product review — Libriofy v1.4", type: "meeting", impact: "+18% CVR" },
  { time: "15:30", end: "17:00", title: "Deep work — recruit VP Marketing", type: "focus", impact: "Hire" },
  { time: "17:00", end: "17:30", title: "Follow-ups (Nexora, Kestrel)", type: "admin", impact: "+₹5.2L" },
  { time: "17:30", end: "18:00", title: "End-of-day review", type: "focus" },
];

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Daily Planner — Sangita OS" }, { name: "description", content: "AI-ranked daily plan with time-blocked focus." }] }),
  component: PlannerPage,
});

function typeMeta(t: Block["type"]) {
  return {
    focus: { icon: Brain, color: "border-primary/40 bg-primary/5 text-primary" },
    meeting: { icon: Users, color: "border-violet-500/40 bg-violet-500/5 text-violet-300" },
    call: { icon: Phone, color: "border-amber-500/40 bg-amber-500/5 text-amber-300" },
    break: { icon: Coffee, color: "border-slate-500/30 bg-slate-500/5 text-slate-300" },
    admin: { icon: Zap, color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" },
  }[t];
}

function PlannerPage() {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL);
  const done = blocks.filter((b) => b.done).length;
  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Daily OS" title="Your day, ranked by impact" description="AI blocks your calendar around what moves revenue and reduces risk. Toggle blocks as done to keep the score honest."
          actions={<div className="flex gap-2"><Button size="sm" variant="outline" className="gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Re-plan with AI</Button><Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add block</Button></div>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Blocks today" value={`${blocks.length}`} sub={`${done} completed`} />
          <Kpi label="Focus hours" value="4.5h" sub="Target: 4h" />
          <Kpi label="Meetings" value={String(blocks.filter((b) => b.type === "meeting").length)} sub="2 external" />
          <Kpi label="Revenue-linked" value="4 blocks" sub="+₹13.6L potential" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 rounded-xl border border-border bg-card p-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 py-1">Today · Tuesday, July 28</div>
            <div className="mt-2 space-y-2">
              {blocks.map((b, i) => {
                const m = typeMeta(b.type); const Icon = m.icon;
                return (
                  <motion.div key={i} layout className={`rounded-lg border ${m.color} p-3 flex items-center gap-3 ${b.done ? "opacity-50" : ""}`}>
                    <div className="w-16 text-xs font-mono text-muted-foreground">{b.time}<div className="text-[10px]">{b.end}</div></div>
                    <Checkbox checked={!!b.done} onCheckedChange={() => setBlocks((p) => p.map((x, j) => j === i ? { ...x, done: !x.done } : x))} />
                    <Icon className="h-4 w-4" />
                    <div className="flex-1"><div className={`text-sm font-medium ${b.done ? "line-through" : ""}`}>{b.title}</div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{b.type}</div></div>
                    {b.impact && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">{b.impact}</Badge>}
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="text-sm font-medium text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI daily briefing</div>
              <div className="text-xs text-muted-foreground mt-2">Top 3 revenue moves today: close Acme MSA (₹8.4L), ship Libriofy checkout (+18% CVR), follow up Nexora (₹3.2L).</div>
              <div className="text-xs text-muted-foreground mt-2">Risk: 2 overdue invoices. AI can auto-chase now.</div>
              <Button size="sm" className="mt-3 h-7 text-xs">Start day</Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium mb-2">Meeting prep</div>
              <div className="space-y-2 text-xs">
                <div className="rounded-md border border-border p-2"><div className="font-medium">Rajat @ Acme — 11:00</div><div className="text-muted-foreground">MSA v3, wants annual invoicing. Push 24-mo term at 8% discount.</div></div>
                <div className="rounded-md border border-border p-2"><div className="font-medium">Product review — 14:00</div><div className="text-muted-foreground">Checkout redesign on staging. Baseline CVR 2.1% → target 2.5%.</div></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium mb-2">End-of-day review</div>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4"><li>What moved revenue today?</li><li>What blocked progress?</li><li>Tomorrow's top 3?</li></ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div><div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div></div>;
}