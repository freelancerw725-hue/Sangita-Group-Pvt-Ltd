import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { PROJECTS, inr } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader eyebrow="Operations" title="Projects" description="Cross-functional initiatives with budget, progress and risk tracking."
          actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New project</Button>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {["On Track","At Risk","Blocked","Completed"].map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-3"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div><div className="text-2xl font-semibold mt-1">{PROJECTS.filter((p) => p.status === s).length}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {PROJECTS.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.id} · {p.team}</div><div className="text-lg font-semibold mt-1 flex items-center gap-2"><FolderKanban className="h-4 w-4 text-primary" /> {p.name}</div></div>
                <Badge variant="outline" className={`text-[10px] ${p.status === "On Track" ? "border-emerald-500/40 text-emerald-300" : p.status === "At Risk" ? "border-amber-500/40 text-amber-300" : "border-rose-500/40 text-rose-300"}`}>{p.status}</Badge>
              </div>
              <div className="mt-3"><div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{p.progress}%</span></div><div className="h-1.5 rounded bg-muted mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${p.progress}%` }} /></div></div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs"><div><div className="text-muted-foreground text-[10px] uppercase">Owner</div><div>{p.owner}</div></div><div><div className="text-muted-foreground text-[10px] uppercase">Due</div><div>{p.dueDate}</div></div><div><div className="text-muted-foreground text-[10px] uppercase">Budget</div><div>{inr(p.spent)} / {inr(p.budget)}</div></div></div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});