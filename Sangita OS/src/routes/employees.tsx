import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { EMPLOYEES } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Operations" title="Team" description="Everyone at Sangita — performance, workload, and status at a glance." actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Invite</Button>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Headcount" value={String(EMPLOYEES.length)} sub="+1 this quarter" />
          <Kpi label="Avg. performance" value="88" sub="Score / 100" />
          <Kpi label="Open tasks" value={String(EMPLOYEES.reduce((a, e) => a + e.tasks, 0))} sub="Across team" />
          <Kpi label="On leave" value={String(EMPLOYEES.filter((e) => e.status === "On leave").length)} sub="This week" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Employee</TableHead><TableHead className="text-[11px] uppercase">Role</TableHead><TableHead className="text-[11px] uppercase">Team</TableHead><TableHead className="text-[11px] uppercase">Status</TableHead><TableHead className="text-[11px] uppercase text-right">Perf</TableHead><TableHead className="text-[11px] uppercase text-right">Tasks</TableHead></TableRow></TableHeader>
            <TableBody>{EMPLOYEES.map((e) => (
              <TableRow key={e.id} className="border-border">
                <TableCell><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] font-semibold">{e.avatar}</div><span className="text-sm font-medium">{e.name}</span></div></TableCell>
                <TableCell className="text-sm">{e.role}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.team}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${e.status === "Active" ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>{e.status}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{e.perf}</TableCell>
                <TableCell className="text-right text-sm">{e.tasks}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  ),
});
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div><div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div></div>; }