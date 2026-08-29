/**
 * Read-only client for Lead Finder stats — used by Sangita OS dashboard.
 * No DB duplication, just HTTP fetch to Lead Finder's /api/automation/stats.
 * Server-only (do not expose secrets to browser).
 */

export interface LeadFinderStats {
  generatedAt: string;
  totalLeads: number;
  todayLeads: number;
  newLeads: number;
  verification: {
    valid: number;
    invalid: number;
    risky: number;
    unknown: number;
    not_verified: number;
  };
  approval: {
    pending_review: number;
    approved: number;
    rejected: number;
  };
  sheets: {
    total: number;
    ready: number;
    draft: number;
  };
  history: Array<{ id: string; searchKeyword: string; searchedAt: string; totalLeadsFound: number }>;
}

export async function fetchLeadFinderStats(): Promise<LeadFinderStats | null> {
  const base = process.env.LEAD_FINDER_BASE_URL?.trim() || process.env.LEAD_FINDER_URL?.trim() || "https://sangita-lead-finder.vercel.app";
  const key = process.env.LEAD_FINDER_API_KEY?.trim() || process.env.LEAD_FINDER_AUTOMATION_KEY?.trim() || process.env.AUTOMATION_API_KEY?.trim();
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/api/automation/stats`;
  try {
    const headers: Record<string, string> = {};
    if (key) headers["x-api-key"] = key;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data as LeadFinderStats;
  } catch {
    return null;
  }
}
