import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
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
import { Plus, Download } from "lucide-react";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Sangita OS" }] }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/quotations");
        if (!res.ok) throw new Error("Failed to fetch quotations");
        const data = await res.json();
        setQuotations(data.quotations || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const openValue = quotations
      .filter((q) => q.status === "Sent")
      .reduce((s, q) => s + (q.value || 0), 0);
    const accepted = quotations
      .filter((q) => q.status === "Accepted")
      .reduce((s, q) => s + (q.value || 0), 0);
    const total = quotations.filter((q) => q.status === "Sent" || q.status === "Accepted").length;
    const won = quotations.filter((q) => q.status === "Accepted").length;
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const avgDeal =
      quotations.length > 0
        ? quotations.reduce((s, q) => s + (q.value || 0), 0) / quotations.length
        : 0;
    return { openValue, accepted, winRate, avgDeal };
  }, [quotations]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Finance"
            title="Quotations"
            description="Loading quotes from database..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonKpi label="Open value" />
            <SkeletonKpi label="Accepted" />
            <SkeletonKpi label="Win rate" />
            <SkeletonKpi label="Avg. deal" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Finance"
            title="Quotations"
            description="Failed to load quotations"
          />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Finance"
          title="Quotations"
          description="Send, track and convert quotes into invoices — GST-ready from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> New quote
            </Button>
          }
        />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Open value" value={inr(stats.openValue)} sub="Awaiting response" />
          <Kpi label="Accepted" value={inr(stats.accepted)} sub="Total accepted value" />
          <Kpi label="Win rate" value={`${stats.winRate}%`} sub="Rolling" />
          <Kpi label="Avg. deal" value={inr(Math.round(stats.avgDeal))} sub="Across all quotes" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase">Quote</TableHead>
                <TableHead className="text-[11px] uppercase">Client</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Value</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-[11px] uppercase">Valid until</TableHead>
                <TableHead className="text-[11px] uppercase">Owner</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id} className="border-border">
                  <TableCell className="font-medium">{q.id}</TableCell>
                  <TableCell>{q.client}</TableCell>
                  <TableCell className="text-right font-semibold">{inr(q.value || 0)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${q.status === "Accepted" ? "border-emerald-500/40 text-emerald-300" : q.status === "Rejected" ? "border-rose-500/40 text-rose-300" : q.status === "Draft" ? "border-slate-500/40 text-slate-300" : "border-blue-500/40 text-blue-300"}`}
                    >
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {q.validity ? new Date(q.validity).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{q.owner || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {quotations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  No quotations found. Add to database to see them here.
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
