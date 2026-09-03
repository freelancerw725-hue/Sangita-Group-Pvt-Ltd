import { useEffect, useState } from "react";
import { Pause, Play, XCircle, RefreshCw, Mail, Clock, AlertTriangle } from "lucide-react";

type CampaignSummary = {
  id: number;
  name: string;
  status: string;
};

type Progress = {
  campaignId: number;
  id: number;
  name: string;
  status: string;
  runStatus: string;
  progress: {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    retry: number;
    cancelled: number;
  };
  dailyLimit: number;
  todaySent: number;
  remainingToday: number;
  percentComplete: number;
};

export function CampaignMonitor() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchList() {
    try {
      const res = await fetch("/api/bulk-mail-progress");
      const data = await res.json().catch(() => ({}));
      const list: CampaignSummary[] = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    } catch {
      // ignore
    }
  }

  async function fetchProgress(id: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bulk-mail-progress?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      const data = await res.json();
      setProgress(data as Progress);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (selectedId) fetchProgress(selectedId);
  }, [selectedId]);

  async function control(action: "pause" | "resume" | "cancel") {
    if (!selectedId) return;
    setActionLoading(action);
    try {
      const res = await fetch("/api/bulk-mail-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
      // Refresh progress
      await fetchProgress(selectedId);
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const status = progress?.status?.toLowerCase() || progress?.runStatus?.toLowerCase() || "";
  const isRunning = status === "running" || status === "active";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Campaign Monitoring
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              Bulk Mail
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Manual control — existing queue & worker remain source of truth
          </div>
        </div>
        <button
          onClick={() => selectedId && fetchProgress(selectedId)}
          className="h-8 px-2 rounded-md border border-border bg-background text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {campaigns.length > 0 && (
        <div className="mb-4">
          <label className="text-xs text-muted-foreground">Select campaign</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading campaign progress...
        </div>
      ) : error ? (
        <div className="py-4 text-sm text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      ) : !progress ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No campaigns found. Create a Draft Campaign via Bulk Mail Batch → Create Campaign.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">{progress.name}</div>
              <div className="text-xs text-muted-foreground">
                ID {progress.campaignId} · {progress.progress.total} recipients
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-widest ${
                isRunning
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : isPaused
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : isCompleted
                      ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                      : isCancelled
                        ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/30"
              }`}
            >
              {progress.status}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.progress.sent} / {progress.progress.total} sent
              </span>
              <span className="font-medium">{progress.percentComplete}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Daily Limit
              </div>
              <div className="text-lg font-semibold mt-1">{progress.dailyLimit}</div>
              <div className="text-xs text-muted-foreground">per sender/day</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Sent Today
              </div>
              <div className="text-lg font-semibold mt-1">{progress.todaySent}</div>
              <div className="text-xs text-emerald-400">remaining {progress.remainingToday}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Pending
              </div>
              <div className="text-lg font-semibold mt-1">{progress.progress.pending}</div>
              <div className="text-xs text-muted-foreground">retry {progress.progress.retry}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
            <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
              <div className="text-muted-foreground">Processing</div>
              <div className="font-semibold mt-1">{progress.progress.processing}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
              <div className="text-muted-foreground">Failed</div>
              <div className="font-semibold mt-1 text-rose-400">{progress.progress.failed}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
              <div className="text-muted-foreground">Retry</div>
              <div className="font-semibold mt-1 text-amber-400">{progress.progress.retry}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
              <div className="text-muted-foreground">Cancelled</div>
              <div className="font-semibold mt-1">{progress.progress.cancelled}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {isRunning && (
              <button
                onClick={() => control("pause")}
                disabled={!!actionLoading}
                className="h-8 px-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs inline-flex items-center gap-1.5 hover:bg-amber-500/20"
              >
                <Pause className="h-3.5 w-3.5" />{" "}
                {actionLoading === "pause" ? "Pausing..." : "Pause"}
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => control("resume")}
                disabled={!!actionLoading}
                className="h-8 px-3 rounded-md bg-emerald-600 text-white text-xs inline-flex items-center gap-1.5 hover:bg-emerald-500"
              >
                <Play className="h-3.5 w-3.5" />{" "}
                {actionLoading === "resume" ? "Resuming..." : "Resume"}
              </button>
            )}
            {!isCancelled && !isCompleted && (
              <button
                onClick={() => control("cancel")}
                disabled={!!actionLoading}
                className="h-8 px-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs inline-flex items-center gap-1.5 hover:bg-rose-500/20"
              >
                <XCircle className="h-3.5 w-3.5" />{" "}
                {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
              </button>
            )}
            {isCompleted && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Completed — worker auto-detected terminal states
              </span>
            )}
          </div>
        </div>
      )}

      {campaigns.length === 0 && !loading && !error && (
        <div className="text-xs text-muted-foreground mt-3">
          No Bulk Mail campaigns yet. Import a Lead Finder sheet → Create Draft Campaign → Start to
          queue.
        </div>
      )}
    </div>
  );
}
