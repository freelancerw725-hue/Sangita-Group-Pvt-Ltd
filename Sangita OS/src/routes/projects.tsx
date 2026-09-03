import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Sangita OS" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("Failed to fetch projects");
        const data = await res.json();
        setProjects(data.projects || []);
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
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader
            eyebrow="Operations"
            title="Projects"
            description="Loading projects from database..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonKpi label="On Track" />
            <SkeletonKpi label="At Risk" />
            <SkeletonKpi label="Blocked" />
            <SkeletonKpi label="Completed" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader eyebrow="Operations" title="Projects" description="Failed to load projects" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const statuses = ["On Track", "At Risk", "Blocked", "Completed"];

  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader
          eyebrow="Operations"
          title="Projects"
          description="Cross-functional initiatives with budget, progress and risk tracking — from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> New project
            </Button>
          }
        />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {statuses.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div>
              <div className="text-2xl font-semibold mt-1">
                {projects.filter((p) => p.status === s).length}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.team}
                  </div>
                  <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-primary" /> {p.name}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${p.status === "On Track" ? "border-emerald-500/40 text-emerald-300" : p.status === "At Risk" ? "border-amber-500/40 text-amber-300" : p.status === "Blocked" ? "border-rose-500/40 text-rose-300" : "border-slate-500/40 text-slate-300"}`}
                >
                  {p.status}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{p.progress || 0}%</span>
                </div>
                <div className="h-1.5 rounded bg-muted mt-1 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${p.progress || 0}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Owner</div>
                  <div>{p.owner || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Due</div>
                  <div>{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Budget</div>
                  <div>
                    {inr(p.spent || 0)} / {inr(p.budget || 0)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-2 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No projects found. Add projects to the database to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonKpi({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 animate-pulse">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="h-6 w-16 bg-muted rounded mt-1" />
    </div>
  );
}
