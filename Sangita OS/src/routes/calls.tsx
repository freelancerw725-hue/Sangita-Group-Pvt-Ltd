import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { CALLS } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";

export const Route = createFileRoute("/calls")({
  head: () => ({ meta: [{ title: "Calls — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader eyebrow="Revenue" title="Call Logs" description="Every dial, transcribed and scored." actions={<Button size="sm" className="gap-2"><Phone className="h-3.5 w-3.5" /> Dial contact</Button>} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Contact</TableHead><TableHead className="text-[11px] uppercase">Company</TableHead><TableHead className="text-[11px] uppercase">Direction</TableHead><TableHead className="text-[11px] uppercase">Duration</TableHead><TableHead className="text-[11px] uppercase">Outcome</TableHead><TableHead className="text-[11px] uppercase">Time</TableHead></TableRow></TableHeader>
            <TableBody>{CALLS.map((c) => (<TableRow key={c.id} className="border-border"><TableCell className="text-sm font-medium">{c.contact}</TableCell><TableCell className="text-xs">{c.company}</TableCell><TableCell>{c.direction === "in" ? <span className="flex items-center gap-1 text-xs text-emerald-400"><PhoneIncoming className="h-3.5 w-3.5" />In</span> : <span className="flex items-center gap-1 text-xs text-primary"><PhoneOutgoing className="h-3.5 w-3.5" />Out</span>}</TableCell><TableCell className="text-xs">{c.duration}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{c.outcome}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{c.at}</TableCell></TableRow>))}</TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  ),
});