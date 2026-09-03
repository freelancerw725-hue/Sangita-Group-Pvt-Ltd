import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, Target } from "lucide-react";
import { useOS } from "@/components/os/os-store";
import { inr } from "@/lib/dashboard/server";

export const Route = createFileRoute("/ai-command")({
  head: () => ({ meta: [{ title: "AI Command Center — Sangita OS" }] }),
  component: AiCommandPage,
});

function AiCommandPage() {
  const { openAI } = useOS();
  const [data, setData] = useState<{
    agents: { name: string; desc: string; runs: number; status: string }[];
    recommendations: { title: string; impact: string; confidence: number; why: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/ai-insights");
        if (!res.ok) throw new Error("Failed to fetch AI insights");
        const json = await res.json();
        // Transform AI insights into agents and recommendations
        setData({
          agents: [
            {
              name: "Strategy Agent",
              desc: "Board packs, forecasts, weekly briefings.",
              runs: json.aiRecs?.length || 0,
              status: "active",
            },
            {
              name: "Revenue Agent",
              desc: "Follow-ups, proposals, invoice chasing.",
              runs: 0,
              status: "active",
            },
            {
              name: "Ops Agent",
              desc: "Task routing, meeting prep, EOD reviews.",
              runs: 0,
              status: "active",
            },
          ],
          recommendations: json.aiRecs || [],
        });
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
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader
            eyebrow="AI"
            title="AI Command Center"
            description="Loading AI agents and recommendations from real data..."
          />
          <div className="grid grid-cols-3 gap-4 mb-5">
            <SkeletonAgent />
            <SkeletonAgent />
            <SkeletonAgent />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader eyebrow="AI" title="AI Command Center" description="Failed to load AI data" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error || "No AI data available"}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader
          eyebrow="AI"
          title="AI Command Center"
          description="Every AI agent, workflow and recommendation — orchestrated from real business data."
          actions={
            <Button size="sm" className="gap-2" onClick={openAI}>
              <Sparkles className="h-3.5 w-3.5" /> Ask AI
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {data.agents.map((a) => (
            <div key={a.name} className="rounded-xl border border-border bg-card p-4">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
                {a.name === "Strategy Agent" ? (
                  <Brain className="h-4 w-4" />
                ) : a.name === "Revenue Agent" ? (
                  <Zap className="h-4 w-4" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
              </div>
              <div className="text-sm font-medium mt-3">{a.name}</div>
              <div className="text-xs text-muted-foreground">{a.desc}</div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {a.runs} recommendations this cycle
              </div>
              <Button size="sm" variant="outline" className="mt-3 h-7 text-xs w-full">
                Configure
              </Button>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4" /> AI Recommendations from Real Data
          </div>
          <div className="space-y-2">
            {data.recommendations.map((r) => (
              <div
                key={r.title}
                className="rounded-lg border border-primary/20 bg-card p-3 flex items-center gap-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.why}</div>
                </div>
                <div className="text-xs text-emerald-400 font-semibold">{r.impact}</div>
                <Badge variant="outline" className="text-[10px]">
                  {r.confidence}% confidence
                </Badge>
                <Button size="sm" className="h-7 text-xs">
                  Run
                </Button>
              </div>
            ))}
            {data.recommendations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p>
                  No AI recommendations yet. Recommendations are generated from your actual business
                  data (revenue, pipeline, expenses, automation health).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonAgent() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="h-9 w-9 rounded-md bg-muted" />
      <div className="h-4 w-32 bg-muted rounded mt-3" />
      <div className="h-3 w-40 bg-muted rounded mt-1" />
      <div className="h-3 w-24 bg-muted rounded mt-2" />
      <div className="h-7 w-full bg-muted rounded mt-3" />
    </div>
  );
}
