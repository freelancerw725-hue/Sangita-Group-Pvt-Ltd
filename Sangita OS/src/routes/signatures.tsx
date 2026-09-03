import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenTool, CheckCircle2, Clock } from "lucide-react";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/signatures")({
  head: () => ({ meta: [{ title: "Signatures — Sangita OS" }] }),
  component: SignaturesPage,
});

function SignaturesPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/agreements");
        if (!res.ok) throw new Error("Failed to fetch agreements");
        const data = await res.json();
        setAgreements(data.agreements || []);
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
            eyebrow="Legal"
            title="E-Signatures"
            description="Loading signatures from database..."
          />
          <div className="grid grid-cols-3 gap-3 mb-5">
            <SkeletonKpi label="Awaiting" />
            <SkeletonKpi label="Signed (30d)" />
            <SkeletonKpi label="Avg. turnaround" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader
            eyebrow="Legal"
            title="E-Signatures"
            description="Failed to load signatures"
          />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const awaiting = agreements.filter((a) => a.status === "Awaiting signature").length;
  const signed = agreements.filter((a) => a.status === "Signed").length;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader
          eyebrow="Legal"
          title="E-Signatures"
          description="Send documents for e-signature. Track opens, views and audit trail from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <PenTool className="h-3.5 w-3.5" /> Send for signature
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Kpi label="Awaiting" value={String(awaiting)} sub="From database" />
          <Kpi label="Signed (30d)" value={String(signed)} sub="From database" />
          <Kpi label="Avg. turnaround" value="—" sub="Needs timestamp tracking" />
        </div>
        <div className="space-y-2">
          {agreements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                <PenTool className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">{a.counterparty}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {a.status}
              </Badge>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          ))}
          {agreements.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No agreements found. Add agreements to the database to see them here.
            </div>
          )}
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
