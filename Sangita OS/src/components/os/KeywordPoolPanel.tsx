import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pause, Play, Trash2, Edit2, Search, Sparkles, Target, Loader2 } from "lucide-react";
import type { Keyword } from "@/lib/keywords/types";

type KeywordRow = Keyword & { todaySearches?: number; remaining?: number; reachedToday?: boolean };

export function KeywordPoolPanel() {
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordRow | null>(null);
  const [aiPreview, setAiPreview] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  async function fetchKeywords() {
    setLoading(true);
    try {
      const res = await fetch("/api/keywords");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setKeywords(data.keywords ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load keywords");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeywords();
  }, []);

  const filtered = keywords.filter((k) => {
    const matchQ = !q || (k.keyword + k.source + k.status).toLowerCase().includes(q.toLowerCase());
    const matchS = filterSource === "all" || k.source === filterSource;
    const matchSt = filterStatus === "all" || k.status === filterStatus;
    return matchQ && matchS && matchSt;
  });

  async function handleAdd(form: {
    keyword: string;
    dailyTarget: number;
    priority: number;
    source: string;
    notes: string;
  }) {
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keyword: form.keyword,
          source: form.source,
          dailyTarget: form.dailyTarget,
          priority: form.priority,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Keyword added: ${data.keyword.keyword}`);
      setAddOpen(false);
      fetchKeywords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    }
  }

  async function handleUpdate(id: string, patch: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/keywords/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Keyword updated");
      setEditOpen(false);
      setEditing(null);
      fetchKeywords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function toggleStatus(k: KeywordRow) {
    const action = k.status === "active" ? "pause" : "activate";
    try {
      const res = await fetch(`/api/keywords/${k.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Keyword ${action}d`);
      fetchKeywords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this keyword?")) return;
    try {
      const res = await fetch(`/api/keywords/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Keyword deleted");
      fetchKeywords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleAiPreview() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/keywords/ai?count=5&seed=Bihar%20News");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAiPreview(data.keywords ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI preview failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAiAdd() {
    if (aiPreview.length === 0) return;
    try {
      const res = await fetch("/api/keywords/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keywords: aiPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`AI: ${data.insertedCount} added, ${data.duplicateCount} duplicates skipped`);
      setAiPreview([]);
      fetchKeywords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Keyword Pool — Lead Finder
            <Badge variant="outline" className="text-[10px]">
              {keywords.length} total
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {keywords.filter((k) => k.status === "active").length} active
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Central pool for AI + Manual keywords. n8n will consume via{" "}
            <code className="bg-muted px-1 rounded">/api/keywords/next</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAiPreview}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            Preview AI
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Add Keyword
              </Button>
            </DialogTrigger>
            <AddKeywordDialog onSubmit={handleAdd} />
          </Dialog>
        </div>
      </div>

      {aiPreview.length > 0 && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Suggestions (stub — no paid API)
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {aiPreview.map((k) => (
              <Badge key={k} variant="secondary" className="text-xs">
                {k}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleAiAdd}>
              Add all to pool
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAiPreview([])}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keywords…"
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchKeywords} className="h-9">
          Refresh
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-[11px] uppercase">Keyword</TableHead>
              <TableHead className="text-[11px] uppercase">Source</TableHead>
              <TableHead className="text-[11px] uppercase">Status</TableHead>
              <TableHead className="text-[11px] uppercase">Priority</TableHead>
              <TableHead className="text-[11px] uppercase">Daily Target</TableHead>
              <TableHead className="text-[11px] uppercase">Today</TableHead>
              <TableHead className="text-[11px] uppercase">Total Searches</TableHead>
              <TableHead className="text-[11px] uppercase">Leads</TableHead>
              <TableHead className="text-[11px] uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                  No keywords. Add “Bihar News”, “Patna News”, or generate via AI.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((k) => (
                <TableRow key={k.id} className="border-border">
                  <TableCell className="text-sm font-medium">{k.keyword}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${k.source === "ai" ? "border-violet-500/40 text-violet-300" : "border-emerald-500/40 text-emerald-300"}`}
                    >
                      {k.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${k.status === "active" ? "border-emerald-500/40 text-emerald-300" : k.status === "paused" ? "border-amber-500/40 text-amber-300" : "border-slate-500/40 text-slate-300"}`}
                    >
                      {k.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{k.priority}</TableCell>
                  <TableCell className="text-xs">{k.dailyTarget}</TableCell>
                  <TableCell className="text-xs">
                    <span className={k.reachedToday ? "text-amber-400 font-medium" : ""}>
                      {k.todaySearches ?? 0}/{k.dailyTarget}
                    </span>
                    {k.reachedToday && (
                      <span className="ml-1 text-[10px] text-amber-400">✓ reached</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{k.totalSearches}</TableCell>
                  <TableCell className="text-xs">
                    {k.totalNewLeads}/{k.totalLeadsFound}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={k.status === "active" ? "Pause" : "Activate"}
                        onClick={() => toggleStatus(k)}
                      >
                        {k.status === "active" ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => {
                          setEditing(k);
                          setEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-400"
                        title="Delete"
                        onClick={() => handleDelete(k.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
      >
        {editing && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit keyword</DialogTitle>
            </DialogHeader>
            <EditKeywordForm
              keyword={editing}
              onSubmit={(patch) => handleUpdate(editing.id, patch)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function AddKeywordDialog({
  onSubmit,
}: {
  onSubmit: (f: {
    keyword: string;
    dailyTarget: number;
    priority: number;
    source: string;
    notes: string;
  }) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [dailyTarget, setDailyTarget] = useState(100);
  const [priority, setPriority] = useState(5);
  const [source] = useState("manual");
  const [notes, setNotes] = useState("");
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add manual keyword</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 py-2">
        <div>
          <label className="text-xs font-medium">Keyword *</label>
          <Input
            placeholder="e.g., Bihar News"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Duplicate protection: “Bihar News” == “bihar news”.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Daily target</label>
            <Input
              type="number"
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
              min={1}
              max={10000}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Priority (1=highest)</label>
            <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">Notes</label>
          <Textarea
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSubmit({ keyword, dailyTarget, priority, source, notes })}
          disabled={!keyword.trim()}
        >
          Add keyword
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditKeywordForm({
  keyword,
  onSubmit,
  onCancel,
}: {
  keyword: KeywordRow;
  onSubmit: (p: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [kw, setKw] = useState(keyword.keyword);
  const [dailyTarget, setDailyTarget] = useState(keyword.dailyTarget);
  const [priority, setPriority] = useState(keyword.priority);
  const [status, setStatus] = useState(keyword.status);
  const [notes, setNotes] = useState(keyword.notes ?? "");
  return (
    <div className="grid gap-3 py-2">
      <div>
        <label className="text-xs font-medium">Keyword</label>
        <Input value={kw} onChange={(e) => setKw(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Daily target</label>
          <Input
            type="number"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Priority</label>
          <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">Status</label>
        <Select value={status} onValueChange={(v) => setStatus(v as Keyword["status"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSubmit({ keyword: kw, dailyTarget, priority, status, notes: notes || null })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
