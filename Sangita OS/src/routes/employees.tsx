import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Sangita OS" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        setEmployees(data.employees || []);
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
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Operations"
            title="Team"
            description="Loading team from database..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonKpi label="Headcount" />
            <SkeletonKpi label="Avg. performance" />
            <SkeletonKpi label="Open tasks" />
            <SkeletonKpi label="On leave" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Operations" title="Team" description="Failed to load team" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const headcount = employees.length;
  const avgPerf =
    employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + (e.perf || 0), 0) / employees.length)
      : 0;
  const totalTasks = employees.reduce((s, e) => s + (e.tasks || 0), 0);
  const onLeave = employees.filter((e) => e.status === "On leave").length;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Operations"
          title="Team"
          description="Everyone at Sangita — performance, workload, and status at a glance from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Invite
            </Button>
          }
        />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Headcount" value={String(headcount)} sub="Total team members" />
          <Kpi label="Avg. performance" value={String(avgPerf)} sub="Score / 100" />
          <Kpi label="Open tasks" value={String(totalTasks)} sub="Across team" />
          <Kpi label="On leave" value={String(onLeave)} sub="This week" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase">Employee</TableHead>
                <TableHead className="text-[11px] uppercase">Role</TableHead>
                <TableHead className="text-[11px] uppercase">Team</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Perf</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] font-semibold">
                        {e.avatar || e.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{e.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.role}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.team}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${e.status === "Active" ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{e.perf ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{e.tasks ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No employees found. Add to database to see them here.
                </TableCell>
              </TableRow>
            )}
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
function SkeletonKpi({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="h-6 w-24 bg-muted rounded mt-1" />
      <div className="h-3 w-16 bg-muted rounded mt-0.5" />
    </div>
  );
}
