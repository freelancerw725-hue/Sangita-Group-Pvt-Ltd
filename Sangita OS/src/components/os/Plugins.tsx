import { ExternalLink, Search, Mail } from "lucide-react";

export function getLeadsUrl(): string | null {
  // Client-side URLs must be exposed via VITE_ prefix
  // Fallback to LEAD_FINDER_BASE_URL for backward compat (if someone set it as VITE_)
  const url =
    (import.meta.env.VITE_LEADS_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_LEAD_FINDER_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_LEADS_URL as string | undefined) ||
    "";
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

export function getBulkMailUrl(): string | null {
  const url =
    (import.meta.env.VITE_BULK_MAIL_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_BULK_MAIL_URL as string | undefined) ||
    "";
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

export function Plugins() {
  const leadsUrl = getLeadsUrl();
  const bulkMailUrl = getBulkMailUrl();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-sm font-semibold">Plugins</div>
      <div className="text-xs text-muted-foreground mb-4">Open your connected apps — each opens in a new tab</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Leads */}
        <div className="rounded-xl border border-border bg-background p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Search className="h-4 w-4" />
            </div>
            {leadsUrl ? (
              <a
                href={leadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Leads in new tab"
                className="h-8 w-8 rounded-md border border-border bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <div className="mt-3">
            <div className="text-sm font-medium">Leads</div>
            <div className="text-xs text-muted-foreground">Find and manage leads</div>
          </div>
          <div className="mt-4">
            {leadsUrl ? (
              <a
                href={leadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium items-center gap-1.5 hover:bg-primary/90"
              >
                Open Leads <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="inline-flex h-8 px-3 rounded-md border border-border bg-muted text-xs font-medium items-center text-muted-foreground">
                Not configured
              </span>
            )}
          </div>
          {!leadsUrl && (
            <div className="mt-2 text-[10px] text-muted-foreground">Set VITE_LEADS_BASE_URL in .env to enable</div>
          )}
        </div>

        {/* Bulk Mail */}
        <div className="rounded-xl border border-border bg-background p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-500">
              <Mail className="h-4 w-4" />
            </div>
            {bulkMailUrl ? (
              <a
                href={bulkMailUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Bulk Mail in new tab"
                className="h-8 w-8 rounded-md border border-border bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <div className="mt-3">
            <div className="text-sm font-medium">Bulk Mail</div>
            <div className="text-xs text-muted-foreground">Manage email campaigns</div>
          </div>
          <div className="mt-4">
            {bulkMailUrl ? (
              <a
                href={bulkMailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium items-center gap-1.5 hover:bg-emerald-500"
              >
                Open Bulk Mail <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="inline-flex h-8 px-3 rounded-md border border-border bg-muted text-xs font-medium items-center text-muted-foreground">
                Not configured
              </span>
            )}
          </div>
          {!bulkMailUrl && (
            <div className="mt-2 text-[10px] text-muted-foreground">Set VITE_BULK_MAIL_BASE_URL in .env to enable</div>
          )}
        </div>
      </div>
    </div>
  );
}
