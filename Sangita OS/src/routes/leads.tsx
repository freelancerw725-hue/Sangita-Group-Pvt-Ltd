import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { useMemo, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { LEADS, LEAD_STAGES, type Lead, type LeadStage, inr } from "@/lib/business-data";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Sparkles, Phone, Mail, MessageCircle, Paperclip, Clock, TrendingUp, Filter, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Lead Pipeline — Sangita OS" }, { name: "description", content: "Kanban lead pipeline with AI-suggested next actions." }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(LEADS);
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const owners = useMemo(() => Array.from(new Set(leads.map((l) => l.owner))), [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesQ = !q || (l.name + l.company + l.email + l.tags.join(" ")).toLowerCase().includes(q.toLowerCase());
      const matchesO = ownerFilter === "all" || l.owner === ownerFilter;
      const matchesP = priorityFilter === "all" || l.priority === priorityFilter;
      return matchesQ && matchesO && matchesP;
    });
  }, [leads, q, ownerFilter, priorityFilter]);

  const byStage = (s: LeadStage) => filtered.filter((l) => l.stage === s);
  const pipelineValue = filtered.filter((l) => l.stage !== "Lost" && l.stage !== "Won").reduce((a, b) => a + b.value, 0);
  const wonValue = filtered.filter((l) => l.stage === "Won").reduce((a, b) => a + b.value, 0);

  function move(id: string, to: LeadStage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: to } : l)));
    toast.success(`Moved to ${to}`);
  }
  function bulkMove(to: LeadStage) {
    setLeads((prev) => prev.map((l) => (selected.includes(l.id) ? { ...l, stage: to } : l)));
    toast.success(`${selected.length} leads → ${to}`);
    setSelected([]);
  }
  function addLead(form: Partial<Lead>) {
    const id = `L-${1100 + leads.length}`;
    const now = new Date().toISOString().slice(0, 10);
    setLeads((prev) => [{
      id, name: form.name ?? "Untitled", company: form.company ?? "—", email: form.email ?? "",
      phone: form.phone ?? "", value: Number(form.value) || 0, stage: (form.stage as LeadStage) ?? "New",
      owner: form.owner ?? "You", source: form.source ?? "Manual", score: 50, priority: (form.priority as Lead["priority"]) ?? "Medium",
      createdAt: now, lastActivity: "just now", nextAction: "Qualify", aiNext: "AI will suggest a next step after first activity.",
      tags: [], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [{ at: "just now", type: "created", text: "Lead created" }],
    }, ...prev]);
    toast.success("Lead created");
    setAddOpen(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="Lead Pipeline"
          description="Drag deals across stages. AI recommends the next best action for every lead."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Prioritize</Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Lead</Button></DialogTrigger>
                <AddLeadDialog onSubmit={addLead} />
              </Dialog>
            </div>
          }
        />

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Open pipeline", value: inr(pipelineValue), icon: TrendingUp, tone: "text-primary" },
            { label: "Won this quarter", value: inr(wonValue), icon: TrendingUp, tone: "text-emerald-400" },
            { label: "Total leads", value: `${filtered.length}`, icon: Users, tone: "text-foreground" },
            { label: "Avg. score", value: `${Math.round(filtered.reduce((a, b) => a + b.score, 0) / (filtered.length || 1))}/100`, icon: Sparkles, tone: "text-amber-400" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className={`mt-1 text-xl font-semibold ${k.tone}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads, companies, tags…" className="pl-9 h-9" />
          </div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              <SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2 h-9"><Filter className="h-3.5 w-3.5" /> More filters</Button>
          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{selected.length} selected</span>
              <Select onValueChange={(v) => bulkMove(v as LeadStage)}>
                <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Bulk move to…" /></SelectTrigger>
                <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-6 gap-3 min-w-0">
          {LEAD_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              leads={byStage(stage)}
              onDrop={(id) => move(id, stage)}
              onOpen={setOpenLead}
              selected={selected}
              onToggleSelect={(id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])}
            />
          ))}
        </div>
      </div>

      <Sheet open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {openLead && <LeadDrawer lead={openLead} onMove={(s) => { move(openLead.id, s); setOpenLead({ ...openLead, stage: s }); }} />}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function StageColumn({ stage, leads, onDrop, onOpen, selected, onToggleSelect }: {
  stage: LeadStage; leads: Lead[]; onDrop: (id: string) => void; onOpen: (l: Lead) => void;
  selected: string[]; onToggleSelect: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const value = leads.reduce((a, b) => a + b.value, 0);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) onDrop(id); }}
      className={`rounded-xl border ${over ? "border-primary bg-primary/5" : "border-border bg-card/50"} p-3 min-h-[420px] transition-colors`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stageDot(stage)}`} />
          <span className="text-xs font-medium">{stage}</span>
          <span className="text-[10px] text-muted-foreground">{leads.length}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{inr(value)}</span>
      </div>
      <div className="space-y-2">
        {leads.map((l) => (
          <motion.div
            key={l.id}
            layout
            draggable
            onDragStart={(e) => (e as unknown as DragEvent).dataTransfer.setData("text/plain", l.id)}
            onClick={() => onOpen(l)}
            className="rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selected.includes(l.id)}
                onCheckedChange={() => onToggleSelect(l.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{l.company}</div>
                  <PriorityDot p={l.priority} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{l.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">{inr(l.value)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{l.score}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="truncate">{l.aiNext.split(".")[0]}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {leads.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-8">Drop leads here</div>
        )}
      </div>
    </div>
  );
}

function stageDot(s: LeadStage) {
  return {
    New: "bg-slate-400", Qualified: "bg-blue-400", Proposal: "bg-violet-400",
    Negotiation: "bg-amber-400", Won: "bg-emerald-400", Lost: "bg-rose-400",
  }[s];
}
function PriorityDot({ p }: { p: Lead["priority"] }) {
  const cls = p === "High" ? "bg-rose-400" : p === "Medium" ? "bg-amber-400" : "bg-slate-500";
  return <span className={`h-1.5 w-1.5 rounded-full ${cls}`} title={p} />;
}

function LeadDrawer({ lead, onMove }: { lead: Lead; onMove: (s: LeadStage) => void }) {
  const [note, setNote] = useState("");
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
            {lead.company.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div>{lead.company}</div>
            <div className="text-xs text-muted-foreground font-normal">{lead.name} · {lead.email}</div>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Value</div>
          <div className="text-lg font-semibold">{inr(lead.value)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
          <div className="text-lg font-semibold text-primary">{lead.score}/100</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Stage</div>
          <Select value={lead.stage} onValueChange={(v) => onMove(v as LeadStage)}>
            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI Next Best Action
        </div>
        <div className="mt-1 text-sm">{lead.aiNext}</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="h-7 text-xs">Do it now</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">Snooze 24h</Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {lead.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
      </div>

      <Tabs defaultValue="timeline" className="mt-5">
        <TabsList className="grid grid-cols-6 h-9">
          <TabsTrigger value="timeline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="email" className="text-xs"><Mail className="h-3 w-3 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="wa" className="text-xs"><MessageCircle className="h-3 w-3 mr-1" />WhatsApp</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
          <TabsTrigger value="files" className="text-xs"><Paperclip className="h-3 w-3 mr-1" />Files</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-3 space-y-2">
          {lead.timeline.map((t, i) => (
            <div key={i} className="flex gap-3 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">{t.at}</span>
              <span className="text-primary uppercase text-[10px] w-14 shrink-0">{t.type}</span>
              <span>{t.text}</span>
            </div>
          ))}
          {lead.timeline.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
        </TabsContent>
        <TabsContent value="email" className="mt-3 space-y-2">
          {lead.emails.map((e, i) => (
            <div key={i} className="rounded-md border border-border p-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">{e.subject}</span>
                <span className="text-muted-foreground">{e.direction === "in" ? "Inbound" : "Outbound"} · {e.at}</span>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="mt-2 gap-2"><Mail className="h-3.5 w-3.5" /> Compose</Button>
        </TabsContent>
        <TabsContent value="wa" className="mt-3 space-y-2">
          {lead.whatsapp.map((w, i) => (
            <div key={i} className={`text-xs rounded-md p-2 max-w-[80%] ${w.direction === "in" ? "bg-card border border-border" : "bg-primary/10 ml-auto"}`}>
              <div>{w.text}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{w.at}</div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="mt-2 gap-2"><MessageCircle className="h-3.5 w-3.5" /> Send WhatsApp</Button>
        </TabsContent>
        <TabsContent value="notes" className="mt-3 space-y-2">
          {lead.notes.map((n, i) => (
            <div key={i} className="rounded-md border border-border p-2 text-xs">
              <div className="text-muted-foreground">{n.author} · {n.at}</div>
              <div className="mt-1">{n.text}</div>
            </div>
          ))}
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" rows={2} />
          <Button size="sm" onClick={() => { if (note) { toast.success("Note saved"); setNote(""); } }}>Save note</Button>
        </TabsContent>
        <TabsContent value="tasks" className="mt-3 space-y-2">
          {lead.tasks.map((t, i) => (
            <label key={i} className="flex items-center gap-2 text-xs rounded-md border border-border p-2">
              <Checkbox defaultChecked={t.done} />
              <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              <span className="ml-auto text-muted-foreground">{t.due}</span>
            </label>
          ))}
          <Button size="sm" variant="outline" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add task</Button>
        </TabsContent>
        <TabsContent value="files" className="mt-3 space-y-2">
          {lead.attachments.map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
              <div className="flex items-center gap-2"><Paperclip className="h-3.5 w-3.5" />{a.name}</div>
              <span className="text-muted-foreground">{a.size}</span>
            </div>
          ))}
          <Button size="sm" variant="outline" className="gap-2"><Paperclip className="h-3.5 w-3.5" /> Attach</Button>
        </TabsContent>
      </Tabs>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="gap-2"><Phone className="h-3.5 w-3.5" /> Call</Button>
        <Button variant="outline" size="sm" className="gap-2"><Mail className="h-3.5 w-3.5" /> Email</Button>
        <Button variant="outline" size="sm" className="gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
      </div>
    </>
  );
}

function AddLeadDialog({ onSubmit }: { onSubmit: (form: Partial<Lead>) => void }) {
  const [form, setForm] = useState<Partial<Lead>>({ stage: "New", priority: "Medium" });
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Add a new lead</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Contact name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Company" onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <Input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Deal value (₹)" type="number" onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        <Input placeholder="Owner" onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        <Select onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}>
          <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select onValueChange={(v) => setForm({ ...form, priority: v as Lead["priority"] })}>
          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
        </Select>
        <Input placeholder="Source" className="col-span-2" onChange={(e) => setForm({ ...form, source: e.target.value })} />
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)}>Create lead</Button>
      </DialogFooter>
    </DialogContent>
  );
}