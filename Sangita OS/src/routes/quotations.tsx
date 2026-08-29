import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { QUOTATIONS, inr } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download } from "lucide-react";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Finance" title="Quotations" description="Send, track and convert quotes into invoices — GST-ready." actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New quote</Button>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Open value" value={inr(QUOTATIONS.filter((q) => q.status === "Sent").reduce((s, q) => s + q.value, 0))} sub="Awaiting response" />
          <Kpi label="Accepted" value={inr(QUOTATIONS.filter((q) => q.status === "Accepted").reduce((s, q) => s + q.value, 0))} sub="This quarter" />
          <Kpi label="Win rate" value="68%" sub="Rolling 90d" />
          <Kpi label="Avg. deal" value="₹3.4L" sub="Across all quotes" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Quote</TableHead><TableHead className="text-[11px] uppercase">Client</TableHead><TableHead className="text-[11px] uppercase text-right">Value</TableHead><TableHead className="text-[11px] uppercase">Status</TableHead><TableHead className="text-[11px] uppercase">Valid until</TableHead><TableHead className="text-[11px] uppercase">Owner</TableHead><TableHead className="text-[11px] uppercase text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{QUOTATIONS.map((q) => (
              <TableRow key={q.id} className="border-border">
                <TableCell className="font-medium">{q.id}</TableCell>
                <TableCell>{q.client}</TableCell>
                <TableCell className="text-right font-semibold">{inr(q.value)}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${q.status === "Accepted" ? "border-emerald-500/40 text-emerald-300" : q.status === "Rejected" ? "border-rose-500/40 text-rose-300" : q.status === "Draft" ? "border-slate-500/40 text-slate-300" : "border-blue-500/40 text-blue-300"}`}>{q.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{q.validity}</TableCell>
                <TableCell className="text-xs">{q.owner}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  ),
});
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div><div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div></div>; }