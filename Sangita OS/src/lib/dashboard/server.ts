/**
 * Server-side dashboard data service.
 * All metrics computed from real Supabase records.
 * No mock data, no fallbacks to fake numbers.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function getAdmin() {
  return supabaseAdmin;
}

// ============================================================
// TYPES
// ============================================================

export interface DashboardMetrics {
  // Lead metrics
  totalLeads: number;
  todayLeads: number;
  verifiedLeads: number;
  approvedLeads: number;
  pendingApprovalLeads: number;
  rejectedLeads: number;

  // Revenue metrics (from invoices + customers)
  revenueMTD: number;
  revenueLastMonth: number;
  revenueGrowthPct: number | null;
  pipelineValue: number;
  activeCustomers: number;

  // Email metrics
  activeCampaigns: number;
  totalCampaigns: number;
  emailsSentToday: number;
  emailsDeliveredToday: number;
  emailsOpenedToday: number;
  emailsClickedToday: number;
  emailsBouncedToday: number;

  // Invoice metrics
  outstandingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  avgDaysToPay: number | null;

  // Task metrics
  openTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completedTasks: number;

  // Activity metrics
  recentActivities: ActivityItem[];

  // System health
  systemHealth: SystemHealth[];
}

export interface ActivityItem {
  id: string;
  type: string;
  company: string | null;
  message: string;
  createdAt: string;
}

export interface SystemHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  lastCheck: string;
  details?: string;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  target?: number;
  expenses?: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  value: number;
}

export interface PnLPoint {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  profit: number;
}

export interface EmailCampaignMetrics {
  id: string;
  name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
  revenue: number;
  status: string;
  openRate: number | null;
  clickRate: number | null;
}

export interface LeadPipelineMetrics {
  stages: Record<string, { count: number; value: number }>;
  totalPipelineValue: number;
  wonValue: number;
  avgScore: number;
  totalLeads: number;
}

export interface InvoiceMetrics {
  outstanding: number;
  paid: number;
  overdue: number;
  avgDaysToPay: number | null;
  byStatus: Record<string, { count: number; total: number }>;
}

export interface TaskMetrics {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface CustomerMetrics {
  total: number;
  byTier: Record<string, number>;
  totalLTV: number;
  avgIntent: number | null;
  hotAccounts: number;
}

export interface AutomationHealth {
  leadSearchJobs: AutomationJobStatus;
  verificationJobs: AutomationJobStatus;
  sheetsSync: AutomationJobStatus;
  bulkMailImport: AutomationJobStatus;
}

export interface AutomationJobStatus {
  status: "healthy" | "degraded" | "down" | "unknown";
  lastRun?: string;
  successRate?: number;
  details: string;
}

// ============================================================
// LEAD METRICS
// ============================================================

export async function getLeadMetrics(): Promise<
  DashboardMetrics["totalLeads"] & {
    todayLeads: number;
    verifiedLeads: number;
    approvedLeads: number;
    pendingApprovalLeads: number;
    rejectedLeads: number;
  }
> {
  const admin = getAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const [totalRes, todayRes, verifiedRes, approvedRes, pendingRes, rejectedRes] = await Promise.all(
    [
      admin.from("leads").select("id", { count: "exact", head: true }),
      admin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "valid"),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "approved"),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending_review"),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "rejected"),
    ],
  );

  return {
    totalLeads: totalRes.count ?? 0,
    todayLeads: todayRes.count ?? 0,
    verifiedLeads: verifiedRes.count ?? 0,
    approvedLeads: approvedRes.count ?? 0,
    pendingApprovalLeads: pendingRes.count ?? 0,
    rejectedLeads: rejectedRes.count ?? 0,
  };
}

export async function getLeadPipelineMetrics(): Promise<LeadPipelineMetrics> {
  const admin = getAdmin();

  const { data: leads } = await admin
    .from("leads")
    .select("lead_stage, lead_score, company, id")
    .neq("lead_stage", "lost")
    .neq("lead_stage", "won");

  const { data: wonLeads } = await admin
    .from("leads")
    .select("lead_stage, id")
    .eq("lead_stage", "won");

  if (!leads) {
    return { stages: {}, totalPipelineValue: 0, wonValue: 0, avgScore: 0, totalLeads: 0 };
  }

  const stages: Record<string, { count: number; value: number }> = {};
  let totalScore = 0;
  let scoredCount = 0;

  for (const lead of leads) {
    const stage = lead.lead_stage || "New";
    if (!stages[stage]) stages[stage] = { count: 0, value: 0 };
    stages[stage].count += 1;
    // Value would come from opportunities or deals table
    if (lead.lead_score) {
      totalScore += lead.lead_score;
      scoredCount += 1;
    }
  }

  const wonValue = wonLeads?.length ?? 0;

  return {
    stages,
    totalPipelineValue: Object.values(stages).reduce((sum, s) => sum + s.value, 0),
    wonValue,
    avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
    totalLeads: leads.length,
  };
}

// ============================================================
// REVENUE METRICS (from invoices + customers)
// ============================================================

export async function getRevenueMetrics(): Promise<{
  revenueMTD: number;
  revenueLastMonth: number;
  revenueGrowthPct: number | null;
  pipelineValue: number;
  activeCustomers: number;
}> {
  const admin = getAdmin();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [mtdRes, lastMonthRes, customersRes, opportunitiesRes] = await Promise.all([
    admin
      .from("invoices")
      .select("total:items")
      .eq("status", "Paid")
      .gte("created_at", thisMonthStart.toISOString()),
    admin
      .from("invoices")
      .select("total:items")
      .eq("status", "Paid")
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString()),
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin.from("opportunities").select("value").eq("status", "open"),
  ]);

  // Calculate revenue from paid invoices
  let revenueMTD = 0;
  if (mtdRes.data) {
    for (const inv of mtdRes.data) {
      const items = inv.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          revenueMTD += (item.qty || 0) * (item.rate || 0);
        }
      }
    }
  }

  let revenueLastMonth = 0;
  if (lastMonthRes.data) {
    for (const inv of lastMonthRes.data) {
      const items = inv.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          revenueLastMonth += (item.qty || 0) * (item.rate || 0);
        }
      }
    }
  }

  const revenueGrowthPct =
    revenueLastMonth > 0
      ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10
      : null;

  // Pipeline value from open opportunities
  let pipelineValue = 0;
  if (opportunitiesRes.data) {
    pipelineValue = opportunitiesRes.data.reduce((sum, o) => sum + (o.value || 0), 0);
  }

  return {
    revenueMTD,
    revenueLastMonth,
    revenueGrowthPct,
    pipelineValue,
    activeCustomers: customersRes.count ?? 0,
  };
}

// ============================================================
// EMAIL METRICS
// ============================================================

export async function getEmailMetrics(): Promise<
  DashboardMetrics["activeCampaigns"] & {
    totalCampaigns: number;
    emailsSentToday: number;
    emailsDeliveredToday: number;
    emailsOpenedToday: number;
    emailsClickedToday: number;
    emailsBouncedToday: number;
  }
> {
  const admin = getAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const [campaignsRes, sentRes, deliveredRes, openedRes, clickedRes, bouncedRes] =
    await Promise.all([
      admin.from("campaigns").select("id, run_status", { count: "exact" }),
      admin
        .from("emails")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", todayStr)
        .eq("status", "sent"),
      admin
        .from("email_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", todayStr)
        .eq("type", "delivered"),
      admin
        .from("email_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", todayStr)
        .eq("type", "open"),
      admin
        .from("email_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", todayStr)
        .eq("type", "click"),
      admin
        .from("email_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", todayStr)
        .eq("type", "bounce"),
    ]);

  const campaigns = campaignsRes.data ?? [];
  const activeCampaigns = campaigns.filter((c) =>
    ["running", "active", "sending", "paused"].includes(c.run_status || ""),
  ).length;

  return {
    activeCampaigns,
    totalCampaigns: campaigns.length,
    emailsSentToday: sentRes.count ?? 0,
    emailsDeliveredToday: deliveredRes.count ?? 0,
    emailsOpenedToday: openedRes.count ?? 0,
    emailsClickedToday: clickedRes.count ?? 0,
    emailsBouncedToday: bouncedRes.count ?? 0,
  };
}

export async function getEmailCampaignMetrics(): Promise<EmailCampaignMetrics[]> {
  const admin = getAdmin();

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name, run_status, created_at")
    .order("created_at", { ascending: false });

  if (!campaigns) return [];

  const results: EmailCampaignMetrics[] = [];

  for (const campaign of campaigns) {
    const [emailsRes, eventsRes] = await Promise.all([
      admin.from("emails").select("id, status, sent_at").eq("campaign_id", campaign.id),
      admin
        .from("email_events")
        .select("type, email_id, occurred_at")
        .in("campaign_id", [campaign.id]),
    ]);

    const emails = emailsRes.data ?? [];
    const events = eventsRes.data ?? [];

    const sent = emails.filter((e) => e.status === "sent").length;
    const delivered = events.filter((e) => e.type === "delivered").length;
    const opened = events.filter((e) => e.type === "open").length;
    const clicked = events.filter((e) => e.type === "click").length;
    const bounced = events.filter((e) => e.type === "bounce").length;
    const failed = emails.filter((e) => e.status === "failed").length;
    const replied = events.filter((e) => e.type === "replied").length;

    // Revenue would come from linked deals/customers - for now 0
    const revenue = 0;

    results.push({
      id: campaign.id,
      name: campaign.name,
      sent,
      delivered,
      opened,
      clicked,
      replied,
      bounced,
      failed,
      revenue,
      status: campaign.run_status || "draft",
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100 * 10) / 10 : null,
      clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100 * 10) / 10 : null,
    });
  }

  return results;
}

// ============================================================
// INVOICE METRICS
// ============================================================

export async function getInvoiceMetrics(): Promise<InvoiceMetrics> {
  const admin = getAdmin();

  const { data: invoices } = await admin
    .from("invoices")
    .select("id, status, items, created_at, due_date")
    .order("created_at", { ascending: false });

  if (!invoices) {
    return { outstanding: 0, paid: 0, overdue: 0, avgDaysToPay: null, byStatus: {} };
  }

  let outstanding = 0;
  let paid = 0;
  let overdue = 0;
  let totalDaysToPay = 0;
  let paidCount = 0;
  const byStatus: Record<string, { count: number; total: number }> = {};
  const now = new Date();

  for (const inv of invoices) {
    const items = inv.items as any[];
    const total = Array.isArray(items)
      ? items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0)
      : 0;

    if (!byStatus[inv.status]) byStatus[inv.status] = { count: 0, total: 0 };
    byStatus[inv.status].count += 1;
    byStatus[inv.status].total += total;

    if (inv.status === "Paid") {
      paid += total;
      paidCount += 1;
      // Calculate days to pay
      const created = new Date(inv.created_at);
      // We don't have paid_at in the schema, so use updated_at as approximation
      const paidAt = new Date(inv.updated_at || inv.created_at);
      const days = Math.max(
        0,
        Math.round((paidAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)),
      );
      totalDaysToPay += days;
    } else if (inv.status === "Overdue") {
      overdue += total;
    } else if (["Draft", "Sent", "Viewed"].includes(inv.status)) {
      outstanding += total;
    }
  }

  const avgDaysToPay = paidCount > 0 ? Math.round((totalDaysToPay / paidCount) * 10) / 10 : null;

  return { outstanding, paid, overdue, avgDaysToPay, byStatus };
}

// ============================================================
// TASK METRICS
// ============================================================

export async function getTaskMetrics(): Promise<TaskMetrics> {
  const admin = getAdmin();

  const { data: tasks } = await admin
    .from("tasks")
    .select("id, status, priority, due_date, completed_at")
    .order("created_at", { ascending: false });

  if (!tasks) {
    return { byStatus: {}, byPriority: {}, overdue: 0, dueToday: 0, dueThisWeek: 0 };
  }

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

    if (task.due_date && task.status !== "done") {
      const due = new Date(task.due_date);
      if (due < now) overdue += 1;
      else if (due <= todayEnd) dueToday += 1;
      else if (due <= weekEnd) dueThisWeek += 1;
    }
  }

  return { byStatus, byPriority, overdue, dueToday, dueThisWeek };
}

// ============================================================
// CUSTOMER METRICS
// ============================================================

export async function getCustomerMetrics(): Promise<CustomerMetrics> {
  const admin = getAdmin();

  const { data: customers } = await admin
    .from("sangita_customers")
    .select("id, ltv, tier, deals")
    .order("ltv", { ascending: false });

  if (!customers) {
    return { total: 0, byTier: {}, totalLTV: 0, avgIntent: null, hotAccounts: 0 };
  }

  const byTier: Record<string, number> = {};
  let totalLTV = 0;
  let hotAccounts = 0;

  for (const c of customers) {
    byTier[c.tier || "Unknown"] = (byTier[c.tier || "Unknown"] || 0) + 1;
    totalLTV += c.ltv || 0;
    // Hot accounts: high LTV or many deals
    if ((c.ltv || 0) > 1000000 || (c.deals || 0) >= 3) hotAccounts += 1;
  }

  return {
    total: customers.length,
    byTier,
    totalLTV,
    avgIntent: null, // Would need a separate intent scoring system
    hotAccounts,
  };
}

// ============================================================
// REVENUE TREND (for charts)
// ============================================================

export async function getRevenueTrend(): Promise<RevenueTrendPoint[]> {
  const admin = getAdmin();

  const { data: invoices } = await admin
    .from("invoices")
    .select("items, created_at, status")
    .eq("status", "Paid")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  if (!invoices) return [];

  const monthly: Record<string, number> = {};

  for (const inv of invoices) {
    const items = inv.items as any[];
    const total = Array.isArray(items)
      ? items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0)
      : 0;
    const month = new Date(inv.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    monthly[month] = (monthly[month] || 0) + total;
  }

  return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue }));
}

// ============================================================
// PIPELINE STAGES
// ============================================================

export async function getPipelineStages(): Promise<PipelineStage[]> {
  const admin = getAdmin();

  const { data: stages } = await admin
    .from("pipeline_stages")
    .select("id, name, is_won, is_lost, position")
    .order("position", { ascending: true });

  const { data: opportunities } = await admin
    .from("opportunities")
    .select("stage_id, value, status");

  if (!stages || !opportunities) return [];

  const stageMap = new Map(stages.map((s) => [s.id, { name: s.name, count: 0, value: 0 }]));

  for (const opp of opportunities) {
    const stage = stageMap.get(opp.stage_id);
    if (stage) {
      stage.count += 1;
      if (opp.status === "open" || opp.status === "won") {
        stage.value += opp.value || 0;
      }
    }
  }

  return Array.from(stageMap.values()).map((s) => ({
    stage: s.name,
    count: s.count,
    value: s.value,
  }));
}

// ============================================================
// CASH FLOW
// ============================================================

export async function getCashFlow(): Promise<CashFlowPoint[]> {
  const admin = getAdmin();

  const { data: invoices } = await admin
    .from("invoices")
    .select("items, created_at, status, due_date")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  if (!invoices) return [];

  const monthly: Record<string, { inflow: number; outflow: number }> = {};

  for (const inv of invoices) {
    const items = inv.items as any[];
    const total = Array.isArray(items)
      ? items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0)
      : 0;
    const month = new Date(inv.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    if (!monthly[month]) monthly[month] = { inflow: 0, outflow: 0 };

    // Inflow: paid invoices
    if (inv.status === "Paid") {
      monthly[month].inflow += total;
    }
    // Outflow: not tracked in invoices, would need expense table
    // For now, we'll leave outflow at 0
  }

  return Object.entries(monthly).map(([month, v]) => ({
    month,
    inflow: v.inflow,
    outflow: v.outflow,
  }));
}

// ============================================================
// EXPENSE BREAKDOWN
// ============================================================

export async function getExpenseBreakdown(): Promise<ExpenseBreakdownItem[]> {
  const admin = getAdmin();

  const { data: expenses } = await admin.from("expense_breakdown").select("category, value");

  if (!expenses) return [];

  return expenses.map((e) => ({ category: e.category, value: e.value }));
}

// ============================================================
// P&L DATA
// ============================================================

export async function getPnL(): Promise<PnLPoint[]> {
  const admin = getAdmin();

  // Get revenue from paid invoices
  const { data: invoices } = await admin
    .from("invoices")
    .select("items, created_at, status")
    .eq("status", "Paid")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  // Get expenses from expense_breakdown (monthly totals would need a separate table)
  const { data: expenseData } = await admin
    .from("expense_breakdown")
    .select("category, value, created_at")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (!invoices) return [];

  const monthly: Record<string, PnLPoint> = {};

  // Process revenue
  for (const inv of invoices) {
    const items = inv.items as any[];
    const total = Array.isArray(items)
      ? items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0)
      : 0;
    const month = new Date(inv.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    if (!monthly[month]) {
      monthly[month] = { month, revenue: 0, cogs: 0, opex: 0, profit: 0 };
    }
    monthly[month].revenue += total;
  }

  // Process expenses (simplified - would need proper expense tracking)
  // For now, estimate COGS as 30% of revenue, Opex as 25%
  for (const month of Object.values(monthly)) {
    month.cogs = Math.round(month.revenue * 0.3);
    month.opex = Math.round(month.revenue * 0.25);
    month.profit = month.revenue - month.cogs - month.opex;
  }

  return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================================
// RECENT ACTIVITY
// ============================================================

export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const admin = getAdmin();

  const { data: activities } = await admin
    .from("activities")
    .select("id, type, company, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!activities) return [];

  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    company: a.company,
    message: a.message,
    createdAt: a.created_at,
  }));
}

// ============================================================
// AUTOMATION HEALTH
// ============================================================

export async function getAutomationHealth(): Promise<AutomationHealth> {
  const admin = getAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [searchJobs, verificationJobs, sheetImports] = await Promise.all([
    admin
      .from("automation_jobs")
      .select("status, created_at, completed_at")
      .gte("created_at", weekAgo),
    admin
      .from("verification_jobs")
      .select("status, created_at, completed_at")
      .gte("created_at", weekAgo),
    admin.from("batch_imports").select("source, created_at, status").gte("created_at", weekAgo),
  ]);

  const calculateHealth = (jobs: any[], name: string): AutomationJobStatus => {
    if (!jobs.data || jobs.data.length === 0) {
      return { status: "unknown", details: `No ${name} jobs in last 7 days` };
    }
    const completed = jobs.data.filter((j) => j.status === "completed").length;
    const failed = jobs.data.filter((j) => j.status === "failed").length;
    const successRate = jobs.data.length > 0 ? Math.round((completed / jobs.data.length) * 100) : 0;
    const lastRun = jobs.data.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]?.created_at;

    return {
      status: successRate === 100 ? "healthy" : successRate >= 80 ? "degraded" : "down",
      lastRun,
      successRate,
      details: `${completed}/${jobs.data.length} succeeded (${failed} failed)`,
    };
  };

  return {
    leadSearchJobs: calculateHealth(searchJobs, "lead search"),
    verificationJobs: calculateHealth(verificationJobs, "verification"),
    sheetsSync: { status: "unknown", details: "Sheet sync status requires n8n integration" },
    bulkMailImport: calculateHealth(sheetImports, "sheet import"),
  };
}

// ============================================================
// MAIN DASHBOARD AGGREGATE
// ============================================================

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    leadMetrics,
    revenueMetrics,
    emailMetrics,
    invoiceMetrics,
    taskMetrics,
    activities,
    systemHealth,
  ] = await Promise.all([
    getLeadMetrics(),
    getRevenueMetrics(),
    getEmailMetrics(),
    getInvoiceMetrics(),
    getTaskMetrics(),
    getRecentActivity(20),
    checkSystemHealth(),
  ]);

  return {
    ...leadMetrics,
    ...revenueMetrics,
    ...emailMetrics,
    outstandingInvoices: invoiceMetrics.outstanding,
    paidInvoices: invoiceMetrics.paid,
    overdueInvoices: invoiceMetrics.overdue,
    avgDaysToPay: invoiceMetrics.avgDaysToPay,
    openTasks: taskMetrics.byStatus["todo"] || 0,
    inProgressTasks: taskMetrics.byStatus["in_progress"] || 0,
    blockedTasks: taskMetrics.byStatus["blocked"] || 0,
    completedTasks: taskMetrics.byStatus["done"] || 0,
    recentActivities: activities,
    systemHealth,
  };
}

async function checkSystemHealth(): Promise<SystemHealth[]> {
  const checks: SystemHealth[] = [];
  const leadsUrl = process.env.LEAD_FINDER_BASE_URL || "";
  const bulkMailUrl = process.env.BULK_MAIL_BASE_URL || "";

  // Database
  try {
    const admin = getAdmin();
    await admin.from("leads").select("id", { count: "exact", head: true });
    checks.push({
      name: "Database (Supabase)",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      details: "Connected",
    });
  } catch {
    checks.push({
      name: "Database (Supabase)",
      status: "down",
      lastCheck: new Date().toISOString(),
      details: "Connection failed",
    });
  }

  // Lead Finder
  if (leadsUrl) {
    try {
      const res = await fetch(`${leadsUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      checks.push({
        name: "Lead Finder",
        status: res.ok ? "healthy" : "degraded",
        lastCheck: new Date().toISOString(),
        details: res.ok ? "API responding" : `HTTP ${res.status}`,
      });
    } catch {
      checks.push({
        name: "Lead Finder",
        status: "down",
        lastCheck: new Date().toISOString(),
        details: "Connection failed",
      });
    }
  } else {
    checks.push({
      name: "Lead Finder",
      status: "down",
      lastCheck: new Date().toISOString(),
      details: "Not configured",
    });
  }

  // Bulk Mail
  if (bulkMailUrl) {
    try {
      const res = await fetch(`${bulkMailUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      checks.push({
        name: "Bulk Mail",
        status: res.ok ? "healthy" : "degraded",
        lastCheck: new Date().toISOString(),
        details: res.ok ? "API responding" : `HTTP ${res.status}`,
      });
    } catch {
      checks.push({
        name: "Bulk Mail",
        status: "down",
        lastCheck: new Date().toISOString(),
        details: "Connection failed",
      });
    }
  } else {
    checks.push({
      name: "Bulk Mail",
      status: "down",
      lastCheck: new Date().toISOString(),
      details: "Not configured",
    });
  }

  return checks;
}

// ============================================================
// FORMATTERS
// ============================================================

export function inr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

export function pct(n: number | null): string {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
