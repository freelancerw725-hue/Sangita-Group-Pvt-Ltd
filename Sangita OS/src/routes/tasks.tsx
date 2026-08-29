import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { TASKS } from "@/lib/business-data";
import { useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Sparkles, Search, Kanban, List, Target } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { KeywordPoolPanel } from "@/components/os/KeywordPoolPanel";

type Status = "Todo" | "In Progress" | "Blocked" | "Done";
const STATUSES: Status[] = ["Todo", "In Progress", "Blocked", "Done"];

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Sangita OS" }, { name: "description", content: "Cross-team task tracking with AI subtasks." }] }),
  component: TasksPage,
});

function TasksPage() {
  const [tasks, setTasks] = useState(TASKS);
  const [q, setQ] = useState("");
  const filtered = tasks.filter((t) => !q || (t.title + t.owner + t.project).toLowerCase().includes(q.toLowerCase()));
  function move(id: string, to: Status) { setTasks((p) => p.map((t) => t.id === id ? { ...t, status: to } : t)); }
  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader eyebrow="Daily OS" title="Tasks" description="Every task in one surface — personal, team, and AI-generated. Sorted by revenue impact."
          actions={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI subtasks</Button><Button size="sm" className="gap-2" onClick={() => toast.success("Task created")}><Plus className="h-3.5 w-3.5" /> New task</Button></div>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {STATUSES.map((s) => <div key={s} className="rounded-xl border border-border bg-card p-3"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div><div className="text-2xl font-semibold mt-1">{tasks.filter((t) => t.status === s).length}</div></div>)}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-md"><Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9 h-9" /></div>
        </div>
        <Tabs defaultValue="kanban">
          <TabsList><TabsTrigger value="kanban" className="gap-1"><Kanban className="h-3.5 w-3.5" /> Kanban</TabsTrigger><TabsTrigger value="list" className="gap-1"><List className="h-3.5 w-3.5" /> List</TabsTrigger><TabsTrigger value="keywords" className="gap-1"><Target className="h-3.5 w-3.5" /> Keyword Pool</TabsTrigger></TabsList>
          <TabsContent value="kanban" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              {STATUSES.map((s) => (
                <div key={s} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); move(id, s); }} className="rounded-xl border border-border bg-card/50 p-3 min-h-[380px]">
                  <div className="text-xs font-medium mb-2 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s === "Done" ? "bg-emerald-400" : s === "Blocked" ? "bg-rose-400" : s === "In Progress" ? "bg-primary" : "bg-slate-400"}`} /> {s} <span className="text-[10px] text-muted-foreground">{filtered.filter((t) => t.status === s).length}</span></div>
                  <div className="space-y-2">
                    {filtered.filter((t) => t.status === s).map((t) => (
                      <motion.div key={t.id} layout draggable onDragStart={(e) => (e as unknown as DragEvent).dataTransfer.setData("text/plain", t.id)} className="rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/40">
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="flex items-center justify-between mt-2 text-[10px]"><span className="text-muted-foreground">{t.owner}</span><span className="text-muted-foreground">{t.due}</span></div>
                        <div className="flex items-center gap-1 mt-2"><Badge variant="outline" className={`text-[9px] ${t.priority === "High" ? "border-rose-500/40 text-rose-300" : t.priority === "Medium" ? "border-amber-500/40 text-amber-300" : "border-slate-500/40 text-slate-300"}`}>{t.priority}</Badge>{t.project !== "—" && <Badge variant="outline" className="text-[9px]">{t.project}</Badge>}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Task</TableHead><TableHead className="text-[11px] uppercase">Owner</TableHead><TableHead className="text-[11px] uppercase">Due</TableHead><TableHead className="text-[11px] uppercase">Priority</TableHead><TableHead className="text-[11px] uppercase">Status</TableHead><TableHead className="text-[11px] uppercase">Project</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map((t) => (<TableRow key={t.id} className="border-border"><TableCell className="text-sm font-medium">{t.title}</TableCell><TableCell className="text-xs">{t.owner}</TableCell><TableCell className="text-xs text-muted-foreground">{t.due}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{t.priority}</Badge></TableCell><TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{t.project}</TableCell></TableRow>))}</TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="keywords" className="mt-4">
            <KeywordPoolPanel />
            <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <div className="text-xs font-medium">Task Integration — Future “Daily Lead Generation”</div>
              <p className="text-xs text-muted-foreground mt-1">
                This pool is the central source for the future <code className="bg-muted px-1 rounded">Daily Lead Generation</code> task. That task will call
                <code className="bg-muted px-1 rounded">GET /api/keywords/next</code> and receive the next eligible keyword (priority → LRU), mixing AI + manual sources. See <code className="bg-muted px-1 rounded">src/lib/keywords/task-integration.ts</code>.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}