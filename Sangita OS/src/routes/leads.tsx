import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  Paperclip,
  Clock,
  TrendingUp,
  Filter,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/dashboard/server";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Lead Pipeline — Sangita OS" },
      { name: "description", content: "Kanban lead pipeline from real database records." },
    ],
  }),
  component: LeadsPage,
});

type LeadStage = "New" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
const LEAD_STAGES: LeadStage[] = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: LeadStage;
  owner: string;
  source: string;
  score: number;
  priority: "High" | "Medium" | "Low";
  createdAt: string;
  lastActivity: string;
  nextAction: string;
  aiNext: string;
  tags: string[];
  notes: { at: string; author: string; text: string }[];
  emails: { at: string; subject: string; direction: "in" | "out" }[];
  whatsapp: { at: string; text: string; direction: "in" | "out" }[];
  tasks: { title: string; done: boolean; due: string }[];
  attachments: { name: string; size: string }[];
  timeline: { at: string; type: string; text: string }[];
};

type LeadRow = {
  id: string;
  channel_id: string | null;
  email: string;
  normalized_email: string;
  company: string | null;
  contact: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  telegram: string | null;
  country: string | null;
  subscribers: number | null;
  lead_status: string;
  lead_stage: string | null;
  lead_score: number | null;
  source: string | null;
  keyword: string | null;
  matched_keywords: string | null;
  notes: string | null;
  crm_notes: string | null;
  tags: string[] | null;
  verification_status: string;
  approval_status: string;
  lead_owner: string | null;
  send_mail: boolean | null;
  status: string | null;
  reply_status: string | null;
  sent_time: string | null;
  last_followup_time: string | null;
  followup_count: number;
  thread_id: string | null;
  campaign_id: string | null;
  demo_sent: boolean | null;
  demo_sent_time: string | null;
  demo_type: string | null;
  interested: boolean | null;
  meeting_scheduled: boolean | null;
  closed_won: boolean | null;
  closed_lost: boolean | null;
  last_reply_time: string | null;
  email_sent_at: string | null;
  email_thread_id: string | null;
  added_date: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
};

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const owners = useState(() => Array.from(new Set(leads.map((l) => l.owner))))[0];

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesQ =
        !q ||
        (l.name + l.company + l.email + l.tags.join(" ")).toLowerCase().includes(q.toLowerCase());
      const matchesO = ownerFilter === "all" || l.owner === ownerFilter;
      const matchesP = priorityFilter === "all" || l.priority === priorityFilter;
      return matchesQ && matchesO && matchesP;
    });
  }, [leads, q, ownerFilter, priorityFilter]);

  const byStage = (s: LeadStage) => filtered.filter((l) => l.stage === s);
  const pipelineValue = filtered
    .filter((l) => l.stage !== "Lost" && l.stage !== "Won")
    .reduce((a, b) => a + b.value, 0);
  const wonValue = filtered.filter((l) => l.stage === "Won").reduce((a, b) => a + b.value, 0);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(transformLeads(data.leads || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function transformLeads(rows: LeadRow[]): Lead[] {
    return rows.map((row) => {
      const stage = mapStage(row.lead_stage);
      const priority = mapPriority(row.lead_score);
      return {
        id: row.id,
        name: row.contact || row.email.split("@")[0],
        company: row.company || "Unknown",
        email: row.email,
        phone: row.phone || "",
        value: estimateValue(row),
        stage,
        owner: row.lead_owner || "Unassigned",
        source: row.source || row.keyword || "Unknown",
        score: row.lead_score || 50,
        priority,
        createdAt: row.created_at?.split("T")[0] || "",
        lastActivity: row.last_updated ? formatRelativeTime(row.last_updated) : "Unknown",
        nextAction: getNextAction(stage),
        aiNext: getAINextAction(stage, row),
        tags: row.tags || [],
        notes: [],
        emails: [],
        whatsapp: [],
        tasks: [],
        attachments: [],
        timeline: [],
      };
    });
  }

  function mapStage(dbStage: string | null): LeadStage {
    if (!dbStage) return "New";
    const stage = dbStage.toLowerCase();
    if (["new", "lead", "prospect"].includes(stage)) return "New";
    if (["qualified", "qualifying"].includes(stage)) return "Qualified";
    if (["proposal", "proposing"].includes(stage)) return "Proposal";
    if (["negotiation", "negotiating"].includes(stage)) return "Negotiation";
    if (["won", "closed_won", "customer"].includes(stage)) return "Won";
    if (["lost", "closed_lost"].includes(stage)) return "Lost";
    return "New";
  }

  function mapPriority(score: number | null): "High" | "Medium" | "Low" {
    if (!score) return "Medium";
    if (score >= 80) return "High";
    if (score >= 50) return "Medium";
    return "Low";
  }

  function estimateValue(row: LeadRow): number {
    // Estimate value from subscribers or use a default
    if (row.subscribers && row.subscribers > 0) {
      return Math.min(1000000, Math.max(50000, row.subscribers * 50));
    }
    // Default values by stage
    const stage = mapStage(row.lead_stage);
    const defaults: Record<LeadStage, number> = {
      New: 100000,
      Qualified: 250000,
      Proposal: 500000,
      Negotiation: 750000,
      Won: 1000000,
      Lost: 0,
    };
    return defaults[stage] || 100000;
  }

  function getNextAction(stage: LeadStage): string {
    const actions: Record<LeadStage, string> = {
      New: "Qualify lead",
      Qualified: "Send proposal",
      Proposal: "Follow up on proposal",
      Negotiation: "Close terms",
      Won: "Handoff to CS",
      Lost: "Archive",
    };
    return actions[stage];
  }

  function getAINextAction(stage: LeadStage, row: LeadRow): string {
    const base = getNextAction(stage);
    if (stage === "New")
      return `${base} — Score: ${row.lead_score || 50}. ${row.company ? `Research ${row.company}` : "Research company"}.`;
    if (stage === "Qualified")
      return `${base} — Send personalized proposal based on ${row.keyword || "search"} intent.`;
    if (stage === "Proposal")
      return `${base} — ${row.company} opened proposal. Send ROI calculator.`;
    if (stage === "Negotiation")
      return `${base} — ${row.company} in negotiation. Offer flexible terms.`;
    if (stage === "Won") return `${base} — Schedule onboarding.`;
    return `${base} — Learn from loss. Add to nurture.`;
  }

  function formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function move(id: string, to: LeadStage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: to } : l)));
    toast.success(`Moved to ${to}`);
    // TODO: API call to update lead stage in database
  }
  function bulkMove(to: LeadStage) {
    setLeads((prev) => prev.map((l) => (selected.includes(l.id) ? { ...l, stage: to } : l)));
    toast.success(`${selected.length} leads → ${to}`);
    setSelected([]);
  }
  function addLead(form: Partial<Lead>) {
    const id = `L-${1100 + leads.length}`;
    const now = new Date().toISOString().slice(0, 10);
    setLeads((prev) => [
      {
        id,
        name: form.name ?? "Untitled",
        company: form.company ?? "—",
        email: form.email ?? "",
        phone: form.phone ?? "",
        value: Number(form.value) || 0,
        stage: (form.stage as LeadStage) ?? "New",
        owner: form.owner ?? "You",
        source: form.source ?? "Manual",
        score: 50,
        priority: (form.priority as Lead["priority"]) ?? "Medium",
        createdAt: now,
        lastActivity: "just now",
        nextAction: "Qualify",
        aiNext: "AI will suggest a next step after first activity.",
        tags: [],
        notes: [],
        emails: [],
        whatsapp: [],
        tasks: [],
        attachments: [],
        timeline: [{ at: "just now", type: "created", text: "Lead created" }],
      },
      ...prev,
    ]);
    toast.success("Lead created (local only - not saved to database)");
    setAddOpen(false);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1600px] mx-auto">
          <PageHeader
            eyebrow="Revenue"
            title="Lead Pipeline"
            description="Loading leads from database..."
          />
          <div className="space-y-3">
            {LEAD_STAGES.map((stage) => (
              <div
                key={stage}
                className="rounded-xl border border-border bg-card/50 p-3 min-h-[380px]"
              >
                <div className="text-xs font-medium mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stageDot(stage)}`} /> {stage}
                  <span className="text-[10px] text-muted-foreground">Loading...</span>
                </div>
                <div className="h-80" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1600px] mx-auto">
          <PageHeader eyebrow="Revenue" title="Lead Pipeline" description="Failed to load leads" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchLeads}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="Lead Pipeline"
          description="Drag deals across stages. Data from real database records."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Prioritize
              </Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Lead
                  </Button>
                </DialogTrigger>
                <AddLeadDialog onSubmit={addLead} />
              </Dialog>
            </div>
          }
        />

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Open pipeline",
              value: inr(pipelineValue),
              icon: TrendingUp,
              tone: "text-primary",
            },
            {
              label: "Won this quarter",
              value: inr(wonValue),
              icon: TrendingUp,
              tone: "text-emerald-400",
            },
            {
              label: "Total leads",
              value: `${filtered.length}`,
              icon: Users,
              tone: "text-foreground",
            },
            {
              label: "Avg. score",
              value: `${Math.round(filtered.reduce((a, b) => a + b.score, 0) / (filtered.length || 1))}/100`,
              icon: Sparkles,
              tone: "text-amber-400",
            },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {k.label}
              </div>
              <div className={`mt-1 text-xl font-semibold ${k.tone}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads, companies, tags…"
              className="pl-9 h-9"
            />
          </div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="h-3.5 w-3.5" /> More filters
          </Button>
          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{selected.length} selected</span>
              <Select onValueChange={(v) => bulkMove(v as LeadStage)}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Bulk move to…" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
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
              onToggleSelect={(id) =>
                setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
              }
            />
          ))}
        </div>
      </div>

      <Sheet open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {openLead && (
            <LeadDrawer
              lead={openLead}
              onMove={(s) => {
                move(openLead.id, s);
                setOpenLead({ ...openLead, stage: s });
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function StageColumn({
  stage,
  leads,
  onDrop,
  onOpen,
  selected,
  onToggleSelect,
}: {
  stage: LeadStage;
  leads: Lead[];
  onDrop: (id: string) => void;
  onOpen: (l: Lead) => void;
  selected: string[];
  onToggleSelect: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const value = leads.reduce((a, b) => a + b.value, 0);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
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
            onDragStart={(e) =>
              (e as unknown as DragEvent).dataTransfer.setData("text/plain", l.id)
            }
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
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {l.score}
                  </span>
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
    New: "bg-slate-400",
    Qualified: "bg-blue-400",
    Proposal: "bg-violet-400",
    Negotiation: "bg-amber-400",
    Won: "bg-emerald-400",
    Lost: "bg-rose-400",
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
            <div className="text-xs text-muted-foreground font-normal">
              {lead.name} · {lead.email}
            </div>
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
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI Next Best Action
        </div>
        <div className="mt-1 text-sm">{lead.aiNext}</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="h-7 text-xs">
            Do it now
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Snooze 24h
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {lead.tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">
            {t}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="timeline" className="mt-5">
        <TabsList className="grid grid-cols-6 h-9">
          <TabsTrigger value="timeline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs">
            <Mail className="h-3 w-3 mr-1" />
            Email
          </TabsTrigger>
          <TabsTrigger value="wa" className="text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            Notes
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs">
            <Paperclip className="h-3 w-3 mr-1" />
            Files
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-3 space-y-2">
          {lead.timeline.map((t, i) => (
            <div key={i} className="flex gap-3 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">{t.at}</span>
              <span className="text-primary uppercase text-[10px] w-14 shrink-0">{t.type}</span>
              <span>{t.text}</span>
            </div>
          ))}
          {lead.timeline.length === 0 && (
            <div className="text-xs text-muted-foreground">No activity yet.</div>
          )}
        </TabsContent>
        <TabsContent value="email" className="mt-3 space-y-2">
          {lead.emails.map((e, i) => (
            <div key={i} className="rounded-md border border-border p-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">{e.subject}</span>
                <span className="text-muted-foreground">
                  {e.direction === "in" ? "Inbound" : "Outbound"} · {e.at}
                </span>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="mt-2 gap-2">
            <Mail className="h-3.5 w-3.5" /> Compose
          </Button>
        </TabsContent>
        <TabsContent value="wa" className="mt-3 space-y-2">
          {lead.whatsapp.map((w, i) => (
            <div
              key={i}
              className={`text-xs rounded-md p-2 max-w-[80%] ${w.direction === "in" ? "bg-card border border-border" : "bg-primary/10 ml-auto"}`}
            >
              <div>{w.text}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{w.at}</div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="mt-2 gap-2">
            <MessageCircle className="h-3.5 w-3.5" /> Send WhatsApp
          </Button>
        </TabsContent>
        <TabsContent value="notes" className="mt-3 space-y-2">
          {lead.notes.map((n, i) => (
            <div key={i} className="rounded-md border border-border p-2 text-xs">
              <div className="text-muted-foreground">
                {n.author} · {n.at}
              </div>
              <div className="mt-1">{n.text}</div>
            </div>
          ))}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={2}
          />
          <Button
            size="sm"
            onClick={() => {
              if (note) {
                toast.success("Note saved");
                setNote("");
              }
            }}
          >
            Save note
          </Button>
        </TabsContent>
        <TabsContent value="tasks" className="mt-3 space-y-2">
          {lead.tasks.map((t, i) => (
            <label
              key={i}
              className="flex items-center gap-2 text-xs rounded-md border border-border p-2"
            >
              <Checkbox defaultChecked={t.done} />
              <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              <span className="ml-auto text-muted-foreground">{t.due}</span>
            </label>
          ))}
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        </TabsContent>
        <TabsContent value="files" className="mt-3 space-y-2">
          {lead.attachments.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-border p-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                {a.name}
              </div>
              <span className="text-muted-foreground">{a.size}</span>
            </div>
          ))}
          <Button size="sm" variant="outline" className="gap-2">
            <Paperclip className="h-3.5 w-3.5" /> Attach
          </Button>
        </TabsContent>
      </Tabs>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Phone className="h-3.5 w-3.5" /> Call
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
      </div>
    </>
  );
}

function AddLeadDialog({ onSubmit }: { onSubmit: (form: Partial<Lead>) => void }) {
  const [form, setForm] = useState<Partial<Lead>>({ stage: "New", priority: "Medium" });
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add a new lead</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Contact name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Company"
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <Input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          placeholder="Deal value (₹)"
          type="number"
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
        />
        <Input placeholder="Owner" onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        <Select onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}>
          <SelectTrigger>
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setForm({ ...form, priority: v as Lead["priority"] })}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Source"
          className="col-span-2"
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)}>Create lead</Button>
      </DialogFooter>
    </DialogContent>
  );
}
