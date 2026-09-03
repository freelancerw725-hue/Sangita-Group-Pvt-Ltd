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
import { Plus, PenTool } from "lucide-react";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/agreements")({
  head: () => ({ meta: [{ title: "Agreements — Sangita OS" }] }),
  component: AgreementsPage,
});

function AgreementsPage() {
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
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Legal"
            title="Agreements"
            description="Loading agreements from database..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonKpi label="Signed" />
            <SkeletonKpi label="Awaiting signature" />
            <SkeletonKpi label="In review" />
            <SkeletonKpi label="Draft" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Legal" title="Agreements" description="Failed to load agreements" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const statuses = ["Signed", "Awaiting signature", "In review", "Draft"];

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Legal"
          title="Agreements"
          description="MSA, NDA, SOW — track status, counter-party and e-signature from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> New agreement
            </Button>
          }
        />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {statuses.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div>
              <div className="text-2xl font-semibold mt-1">
                {agreements.filter((a) => a.status === s).length}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase">Agreement</TableHead>
                <TableHead className="text-[11px] uppercase">Counterparty</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Value</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-[11px] uppercase">Updated</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((a) => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="font-medium">
                    {a.id} · {a.title}
                  </TableCell>
                  <TableCell>{a.counterparty}</TableCell>
                  <TableCell className="text-right">{a.value ? inr(a.value) : "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${a.status === "Signed" ? "border-emerald-500/40 text-emerald-300" : a.status === "Awaiting signature" ? "border-amber-500/40 text-amber-300" : "border-slate-500/40 text-slate-300"}`}
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.updated || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                      <PenTool className="h-3 w-3" /> Sign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {agreements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No agreements found. Add to database to see them here.
                </TableCell>
              </TableRow>
            )}
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonKpi({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="h-6 w-16 bg-muted rounded mt-1" />
    </div>
  );
}
