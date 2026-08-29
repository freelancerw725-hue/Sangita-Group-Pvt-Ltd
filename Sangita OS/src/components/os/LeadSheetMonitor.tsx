import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertTriangle, XCircle, Send, Calendar } from "lucide-react";

type LeadSheet = {
  id: string;
  name: string;
  status: string;
  sendAt: string | null;
  templateId: number | null;
  templateName: string | null;
  approvedLeads: number;
  totalLeads: number;
  verificationSummary: { valid: number; invalid: number; risky: number; unknown: number; not_verified: number };
  scheduledCampaignId?: number | null;
  scheduledBatchId?: number | null;
};

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "WAITING_FOR_APPROVAL",
    ready_for_bulk_mail: "READY_TO_SCHEDULE",
    scheduled: "SCHEDULED",
    sending: "SENDING",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    archived: "BLOCKED",
  };
  return map[s] ?? s.toUpperCase();
}

function statusColor(s: string) {
  if (s === "scheduled") return "bg-sky-500/10 text-sky-400 border-sky-500/30";
  if (s === "ready_for_bulk_mail") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "sending") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  if (s === "completed") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (s === "cancelled") return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  if (s === "draft") return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
}

export function LeadSheetMonitor() {
  const [sheets, setSheets] = useState<LeadSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSheets() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-sheets-proxy");
      if (!res.ok) throw new Error("Failed to fetch Lead Sheets");
      const data = await res.json().catch(() => ({}));
      const list: LeadSheet[] = Array.isArray(data.sheets) ? data.sheets : Array.isArray(data) ? data : [];
      setSheets(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSheets();
    const id = setInterval(fetchSheets, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Lead Sheets — Approval-Gated Sending
          </div>
          <div className="text-xs text-muted-foreground">Manual approval + template + sendAt = automatic sending (no manual START needed at send time)</div>
        </div>
        <button onClick={fetchSheets} className="h-8 px-2 rounded-md border border-border bg-background text-xs">Refresh</button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Loading Lead Sheets...</div>
      ) : error ? (
        <div className="py-4 text-sm text-amber-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</div>
      ) : sheets.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No Lead Sheets yet. Approve leads in Lead Finder → create sheet → select template → set send time.</div>
      ) : (
        <div className="space-y-3">
          {sheets.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Approved: {s.approvedLeads} / {s.totalLeads} · Valid: {s.verificationSummary.valid} · Invalid: {s.verificationSummary.invalid}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-widest ${statusColor(s.status)}`}>
                  {statusLabel(s.status)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md border border-border bg-card p-2">
                  <div className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Template</div>
                  <div className="font-medium mt-1">{s.templateName ?? <span className="text-amber-400">Not selected</span>}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-2">
                  <div className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Send Time</div>
                  <div className="font-medium mt-1">{s.sendAt ? new Date(s.sendAt).toLocaleString() : <span className="text-amber-400">Not scheduled</span>}</div>
                </div>
                <div className="rounded-md border border-border bg-card p-2">
                  <div className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Campaign</div>
                  <div className="font-medium mt-1">{s.scheduledCampaignId ? `Campaign #${s.scheduledCampaignId}` : "Not created"}</div>
                </div>
              </div>
              {s.status === "scheduled" && s.sendAt && new Date(s.sendAt) > new Date() && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Waiting until {new Date(s.sendAt).toLocaleString()} — will auto-start and respect daily/hourly limits, pause/cancel respected
                </div>
              )}
              {s.status === "scheduled" && s.sendAt && new Date(s.sendAt) <= new Date() && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <Send className="h-3 w-3" /> Send time reached — n8n will re-check approval and start campaign automatically (idempotent)
                </div>
              )}
              {s.status === "draft" && (
                <div className="mt-2 text-xs text-amber-400">WAITING_FOR_APPROVAL — approve leads to make eligible (valid ≠ approved)</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
