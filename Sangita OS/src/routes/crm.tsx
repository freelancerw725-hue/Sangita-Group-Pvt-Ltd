import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { CONTACTS, LEADS, inr } from "@/lib/business-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import { Search, Plus, Mail, Phone, MessageCircle, Sparkles, Filter, Star } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM — Sangita OS" }, { name: "description", content: "Contacts, accounts, and AI-drafted follow-ups." }] }),
  component: CRMPage,
});

function CRMPage() {
  const [q, setQ] = useState(""); const [tier, setTier] = useState("all");
  const [open, setOpen] = useState<typeof CONTACTS[number] | null>(null);
  const filtered = CONTACTS.filter((c) => (!q || (c.name + c.company).toLowerCase().includes(q.toLowerCase())) && (tier === "all" || c.tier === tier));
  const totalLtv = CONTACTS.reduce((s, c) => s + c.ltv, 0);
  const tierMix = ["Enterprise","Mid-market","SMB"].map((t) => ({ name: t, value: CONTACTS.filter((c) => c.tier === t).length }));
  const COLORS = ["#3b82f6","#a855f7","#10b981"];
  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader eyebrow="Revenue" title="CRM · Accounts & Contacts" description="Every relationship, remembered. AI drafts follow-ups, scores intent, and keeps context across email + WhatsApp."
          actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add contact</Button>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Contacts" value={String(CONTACTS.length)} sub="8 companies" />
          <Kpi label="Pipeline LTV" value={inr(totalLtv)} sub="Across all deals" />
          <Kpi label="Hot accounts" value="3" sub="Score > 85" />
          <Kpi label="Avg. intent" value="76" sub="+4 this week" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-md"><Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts, companies…" className="pl-9 h-9" /></div>
              <Select value={tier} onValueChange={setTier}><SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All tiers</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem><SelectItem value="Mid-market">Mid-market</SelectItem><SelectItem value="SMB">SMB</SelectItem></SelectContent></Select>
              <Button variant="outline" size="sm" className="gap-2 h-9"><Filter className="h-3.5 w-3.5" /> More</Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-border"><TableHead className="text-[11px] uppercase">Contact</TableHead><TableHead className="text-[11px] uppercase">Company</TableHead><TableHead className="text-[11px] uppercase">Tier</TableHead><TableHead className="text-[11px] uppercase text-right">LTV</TableHead><TableHead className="text-[11px] uppercase">Deals</TableHead><TableHead className="text-[11px] uppercase">Last touch</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="border-border cursor-pointer hover:bg-primary/5" onClick={() => setOpen(c)}>
                      <TableCell><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-primary/15 text-primary grid place-items-center text-[10px] font-semibold">{c.name.split(" ").map((n) => n[0]).join("")}</div><div><div className="text-sm font-medium">{c.name}</div><div className="text-[11px] text-muted-foreground">{c.role}</div></div></div></TableCell>
                      <TableCell className="text-sm">{c.company}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.tier}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{inr(c.ltv)}</TableCell>
                      <TableCell className="text-xs">{c.deals}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.lastTouch}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium mb-2">Tier mix</div>
              <div className="h-40"><ResponsiveContainer><PieChart><Pie data={tierMix} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65} stroke="none">{tierMix.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2"><Sparkles className="h-4 w-4" /> AI suggested outreach</div>
              <div className="space-y-2 text-xs">
                <div className="rounded-md border border-primary/20 p-2"><div className="font-medium">Rajat @ Acme</div><div className="text-muted-foreground">Nudge on MSA — no reply in 24h</div></div>
                <div className="rounded-md border border-primary/20 p-2"><div className="font-medium">Rhea @ Kestrel</div><div className="text-muted-foreground">Share SOC2 doc — asked last call</div></div>
                <div className="rounded-md border border-primary/20 p-2"><div className="font-medium">Sneha @ Verdant</div><div className="text-muted-foreground">Nurture — cold since Jul 12</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {open && (
            <div>
              <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-primary/15 text-primary grid place-items-center font-semibold">{open.name.split(" ").map((n) => n[0]).join("")}</div><div><div className="text-lg font-semibold">{open.name}</div><div className="text-xs text-muted-foreground">{open.role} · {open.company}</div></div></div>
              <div className="grid grid-cols-3 gap-2 mt-4"><Button size="sm" variant="outline" className="gap-2"><Mail className="h-3.5 w-3.5" /> Email</Button><Button size="sm" variant="outline" className="gap-2"><Phone className="h-3.5 w-3.5" /> Call</Button><Button size="sm" variant="outline" className="gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button></div>
              <div className="grid grid-cols-3 gap-2 mt-4"><Info k="LTV" v={inr(open.ltv)} /><Info k="Deals" v={String(open.deals)} /><Info k="Tier" v={open.tier} /></div>
              <div className="mt-4"><div className="text-xs font-medium mb-2 flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /> Related leads</div>
                <div className="space-y-2">{LEADS.filter((l) => l.company === open.company).map((l) => (<div key={l.id} className="rounded-md border border-border p-2 text-xs"><div className="flex justify-between"><span className="font-medium">{l.id} · {l.stage}</span><span>{inr(l.value)}</span></div><div className="text-muted-foreground">{l.aiNext}</div></div>))}{LEADS.filter((l) => l.company === open.company).length === 0 && <div className="text-xs text-muted-foreground">No open leads.</div>}</div></div>
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3"><div className="text-xs font-medium text-primary flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI-drafted follow-up</div><div className="text-xs mt-1 text-muted-foreground">Hi {open.name.split(" ")[0]}, following up on our conversation — happy to jump on a quick call this week if useful. Meanwhile, sharing our latest case study relevant to {open.company}.</div><div className="flex gap-2 mt-2"><Button size="sm" className="h-7 text-xs">Send</Button><Button size="sm" variant="outline" className="h-7 text-xs">Regenerate</Button></div></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div><div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div></div>;
}
function Info({ k, v }: { k: string; v: string }) { return <div className="rounded-md border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className="text-sm font-medium mt-0.5">{v}</div></div>; }