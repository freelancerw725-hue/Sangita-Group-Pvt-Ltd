import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { EMAIL_CAMPAIGNS, inr } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/email")({
  head: () => ({ meta: [{ title: "Bulk Email — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Revenue" title="Bulk Email" description="Segmented campaigns with AI-drafted subject lines and follow-ups." actions={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI compose</Button><Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New campaign</Button></div>} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Campaign</TableHead><TableHead className="text-[11px] uppercase text-right">Sent</TableHead><TableHead className="text-[11px] uppercase text-right">Open %</TableHead><TableHead className="text-[11px] uppercase text-right">Click %</TableHead><TableHead className="text-[11px] uppercase text-right">Revenue</TableHead><TableHead className="text-[11px] uppercase">Status</TableHead></TableRow></TableHeader>
            <TableBody>{EMAIL_CAMPAIGNS.map((c) => (<TableRow key={c.id} className="border-border"><TableCell className="text-sm font-medium">{c.name}</TableCell><TableCell className="text-right text-xs">{c.sent.toLocaleString()}</TableCell><TableCell className="text-right text-xs">{c.open}%</TableCell><TableCell className="text-right text-xs">{c.click}%</TableCell><TableCell className="text-right font-semibold text-emerald-400">{inr(c.revenue)}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell></TableRow>))}</TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  ),
});