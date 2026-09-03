import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Flame } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — Sangita OS" }] }),
  component: HabitsPage,
});

function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/habits");
        if (!res.ok) throw new Error("Failed to fetch habits");
        const data = await res.json();
        setHabits(data.habits || []);
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
        <div className="p-6 max-w-3xl mx-auto">
          <PageHeader
            eyebrow="Daily OS"
            title="Habits"
            description="Loading habits from database..."
          />
          <div className="space-y-3">
            <SkeletonHabit />
            <SkeletonHabit />
            <SkeletonHabit />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <PageHeader eyebrow="Daily OS" title="Habits" description="Failed to load habits" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader
          eyebrow="Daily OS"
          title="Habits"
          description="The rituals that keep the operator sharp — from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Add habit
            </Button>
          }
        />
        <div className="space-y-3">
          {habits.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="text-sm font-medium">{h.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" /> {h.streak || 0}-day streak
                </div>
              </div>
              <div className="flex gap-1">
                {(h.week_log || []).map((d: boolean, i: number) => (
                  <span
                    key={i}
                    className={`h-6 w-6 rounded-md ${d ? "bg-emerald-400/80" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
          ))}
          {habits.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No habits tracked yet. Add a habit to start building streaks.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonHabit() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-6 w-24 bg-muted rounded" />
    </div>
  );
}
