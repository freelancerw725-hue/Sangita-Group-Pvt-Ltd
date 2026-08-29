import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { AGREEMENTS } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenTool, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/signatures")({
  head: () => ({ meta: [{ title: "Signatures — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader eyebrow="Legal" title="E-Signatures" description="Send documents for e-signature. Track opens, views and audit trail." actions={<Button size="sm" className="gap-2"><PenTool className="h-3.5 w-3.5" /> Send for signature</Button>} />
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Awaiting</div><div className="text-2xl font-semibold mt-1 flex items-center gap-2"><Clock className="h-5 w-5 text-amber-400" /> 4</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Signed (30d)</div><div className="text-2xl font-semibold mt-1 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> 12</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg. turnaround</div><div className="text-2xl font-semibold mt-1">1.8 days</div></div>
        </div>
        <div className="space-y-2">
          {AGREEMENTS.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><PenTool className="h-4 w-4" /></div>
              <div className="flex-1"><div className="text-sm font-medium">{a.title}</div><div className="text-[11px] text-muted-foreground">{a.counterparty}</div></div>
              <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
              <Button size="sm" variant="outline">View</Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});