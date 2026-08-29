import LeadDashboard from "@/components/lead-dashboard";
import { buildStats } from "@/lib/lead-utils";
import { getSearchHistory, getStoredLeads } from "@/lib/lead-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [leads, history] = await Promise.all([getStoredLeads(), getSearchHistory()]);
  const stats = buildStats(leads);

  return <LeadDashboard initialLeads={leads} initialHistory={history} initialStats={stats} />;
}
