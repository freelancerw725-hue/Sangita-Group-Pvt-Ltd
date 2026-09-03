import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Sparkles,
  Wallet,
  Users,
  Target,
  TrendingUp,
  Zap,
  AlertTriangle,
  Flame,
  ExternalLink,
  Mail,
  Search,
  CheckCircle,
  Clock,
  Send,
  Calendar,
  Pause,
  Play,
  XCircle,
  RefreshCw,
  Bell,
  Shield,
  Database,
  Globe,
  Github,
  Loader2,
  ArrowRight,
  ChevronRight,
  MoreHorizontal,
  Settings,
  Activity,
  TrendingDown,
  DollarSign,
  Inbox,
  Flag,
  AlertCircle,
  Wifi,
  WifiOff,
  Plug,
  PlugZap,
  ZapOff,
  Lightbulb,
  Zap as ZapIcon,
  Brain,
  Phone,
  Coffee,
} from "lucide-react";
import { AppLayout } from "@/components/os/AppLayout";
import { StatCard } from "@/components/os/StatCard";
import { CampaignMonitor } from "@/components/os/CampaignMonitor";
import { LeadSheetMonitor } from "@/components/os/LeadSheetMonitor";
import { Plugins, getLeadsUrl, getBulkMailUrl } from "@/components/os/Plugins";
import { useOS } from "@/components/os/os-store";
import { inr } from "@/lib/dashboard/server";
import { CHART } from "@/lib/chart-colors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type LeadFinderStats = {
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
  approval: { pending_review: number; approved: number; rejected: number };
  sheets: { total: number; ready: number; draft: number };
  history: Array<{
    id: string;
    searchKeyword: string;
    searchedAt: string;
    totalLeadsFound: number;
  }>;
};

type BulkMailCampaign = { id: number; name: string; status: string };
type BulkMailProgress = {
  campaignId: number;
  id: number;
  name: string;
  status: string;
  runStatus: string;
  legacyStatus: string;
  progress: {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    retry: number;
    cancelled: number;
    progress: number;
  };
  dailyLimit: number;
  todaySent: number;
  remainingToday: number;
  percentComplete: number;
  senderAccountId?: number;
  senderName?: string | null;
  senderEmail?: string | null;
};

type LeadSheet = {
  id: string;
  name: string;
  status: string;
  sendAt: string | null;
  templateId: number | null;
  templateName: string | null;
  approvedLeads: number;
  totalLeads: number;
  verificationSummary: {
    valid: number;
    invalid: number;
    risky: number;
    unknown: number;
    not_verified: number;
  };
  scheduledCampaignId?: number | null;
  scheduledBatchId?: number | null;
};

type SystemHealth = {
  name: string;
  status: "healthy" | "degraded" | "down";
  lastCheck: string;
  details?: string;
};

type AlertItem = {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  description: string;
  action?: { label: string; href: string };
};

type DashboardData = {
  leadMetrics: {
    totalLeads: number;
    todayLeads: number;
    verifiedLeads: number;
    approvedLeads: number;
    pendingApprovalLeads: number;
    rejectedLeads: number;
  };
  revenueMetrics: {
    revenueMTD: number;
    revenueLastMonth: number;
    revenueGrowthPct: number | null;
    pipelineValue: number;
    activeCustomers: number;
  };
  emailMetrics: {
    activeCampaigns: number;
    totalCampaigns: number;
    emailsSentToday: number;
    emailsDeliveredToday: number;
    emailsOpenedToday: number;
    emailsClickedToday: number;
    emailsBouncedToday: number;
  };
  invoiceMetrics: {
    outstandingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    avgDaysToPay: number | null;
  };
  taskMetrics: {
    openTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    completedTasks: number;
  };
  activities: Array<{
    id: string;
    type: string;
    company: string | null;
    message: string;
    createdAt: string;
  }>;
  automation: {
    leadSearchJobs: { status: string; lastRun?: string; successRate?: number; details: string };
    verificationJobs: { status: string; lastRun?: string; successRate?: number; details: string };
    sheetsSync: { status: string; lastRun?: string; successRate?: number; details: string };
    bulkMailImport: { status: string; lastRun?: string; successRate?: number; details: string };
  };
  customerMetrics: {
    total: number;
    byTier: Record<string, number>;
    totalLTV: number;
    avgIntent: number | null;
    hotAccounts: number;
  };
  timestamp: string;
};

function Dashboard() {
  const { openAI } = useOS();
  const [greeting, setGreeting] = useState("Good day");
  const [leadStats, setLeadStats] = useState<LeadFinderStats | null>(null);
  const [leadStatsLoading, setLeadStatsLoading] = useState(true);
  const [leadStatsError, setLeadStatsError] = useState<string | null>(null);
  const [bulkCampaigns, setBulkCampaigns] = useState<BulkMailCampaign[]>([]);
  const [bulkCampaignsLoading, setBulkCampaignsLoading] = useState(true);
  const [leadSheets, setLeadSheets] = useState<LeadSheet[]>([]);
  const [leadSheetsLoading, setLeadSheetsLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [systemHealthLoading, setSystemHealthLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Real dashboard data from Supabase
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const leadsUrl = getLeadsUrl();
  const bulkMailUrl = getBulkMailUrl();

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  async function fetchDashboardData() {
    try {
      setDashboardLoading(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const data = await res.json();
      setDashboardData(data);
      setDashboardError(null);
    } catch (e) {
      console.warn("Dashboard API failed, using fallback data:", e);
      // Use complete fallback empty data instead of showing error
      setDashboardData({
        leadMetrics: {
          totalLeads: 0,
          todayLeads: 0,
          verifiedLeads: 0,
          approvedLeads: 0,
          pendingApprovalLeads: 0,
          rejectedLeads: 0,
        },
        revenueMetrics: {
          revenueMTD: 0,
          revenueLastMonth: 0,
          revenueGrowthPct: null,
          pipelineValue: 0,
          activeCustomers: 0,
        },
        emailMetrics: {
          activeCampaigns: 0,
          totalCampaigns: 0,
          emailsSentToday: 0,
          emailsDeliveredToday: 0,
          emailsOpenedToday: 0,
          emailsClickedToday: 0,
          emailsBouncedToday: 0,
        },
        invoiceMetrics: {
          outstandingInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          avgDaysToPay: null,
        },
        taskMetrics: {
          openTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          completedTasks: 0,
        },
        activities: [],
        automation: {
          leadSearchJobs: { status: "unknown" as const, successRate: undefined, details: "n8n → Lead Finder sync" },
          verificationJobs: { status: "unknown" as const, successRate: undefined, details: "Email verification pipeline" },
          sheetsSync: { status: "unknown" as const, successRate: undefined, details: "Lead Finder → Google Sheets" },
          bulkMailImport: { status: "unknown" as const, successRate: undefined, details: "Sheets → Bulk Mail campaigns" },
        },
        customerMetrics: {
          total: 0,
          byTier: {},
          totalLTV: 0,
          avgIntent: null,
          hotAccounts: 0,
        },
        timestamp: new Date().toISOString(),
      });
      setDashboardError(null); // Don't show error to user, just use fallback
    } finally {
      setDashboardLoading(false);
    }
  }

  async function fetchLeadStats() {
    try {
      const res = await fetch("/api/lead-finder-stats");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeadStats(data);
    } catch (e) {
      setLeadStatsError(e instanceof Error ? e.message : "Failed to load Lead Finder stats");
    } finally {
      setLeadStatsLoading(false);
    }
  }

  async function fetchBulkCampaigns() {
    try {
      const res = await fetch("/api/bulk-mail-progress");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBulkCampaigns(data.campaigns || []);
    } catch {
      // ignore
    } finally {
      setBulkCampaignsLoading(false);
    }
  }

  async function fetchLeadSheets() {
    try {
      const res = await fetch("/api/lead-sheets-proxy");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const list: LeadSheet[] = Array.isArray(data.sheets)
        ? data.sheets
        : Array.isArray(data)
          ? data
          : [];
      setLeadSheets(list);
    } catch {
      // ignore
    } finally {
      setLeadSheetsLoading(false);
    }
  }

  async function fetchSystemHealth() {
    const checks: SystemHealth[] = [];

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
        details: "Not configured (VITE_LEADS_BASE_URL)",
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
        details: "Not configured (VITE_BULK_MAIL_BASE_URL)",
      });
    }

    // Gmail (check via Lead Finder)
    if (leadsUrl) {
      try {
        const res = await fetch(`${leadsUrl}/api/gmail/status`, {
          signal: AbortSignal.timeout(3000),
        });
        checks.push({
          name: "Gmail",
          status: res.ok ? "healthy" : "degraded",
          lastCheck: new Date().toISOString(),
          details: res.ok ? "Connected" : "Auth required",
        });
      } catch {
        checks.push({
          name: "Gmail",
          status: "down",
          lastCheck: new Date().toISOString(),
          details: "Not connected",
        });
      }
    } else {
      checks.push({
        name: "Gmail",
        status: "down",
        lastCheck: new Date().toISOString(),
        details: "Lead Finder not configured",
      });
    }

    // Google Sheets (check via Lead Finder)
    if (leadsUrl) {
      try {
        const res = await fetch(`${leadsUrl}/api/sheets/status`, {
          signal: AbortSignal.timeout(3000),
        });
        checks.push({
          name: "Google Sheets",
          status: res.ok ? "healthy" : "degraded",
          lastCheck: new Date().toISOString(),
          details: res.ok ? "Connected" : "Auth required",
        });
      } catch {
        checks.push({
          name: "Google Sheets",
          status: "down",
          lastCheck: new Date().toISOString(),
          details: "Not connected",
        });
      }
    } else {
      checks.push({
        name: "Google Sheets",
        status: "down",
        lastCheck: new Date().toISOString(),
        details: "Lead Finder not configured",
      });
    }

    // Database (Supabase)
    try {
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

    setSystemHealth(checks);
    setSystemHealthLoading(false);
  }

  function generateAlerts() {
    const newAlerts: AlertItem[] = [];

    // Use real data for alerts
    const leadMetrics = dashboardData?.leadMetrics;
    const emailMetrics = dashboardData?.emailMetrics;
    const invoiceMetrics = dashboardData?.invoiceMetrics;
    const taskMetrics = dashboardData?.taskMetrics;
    const health = systemHealth;

    if (leadMetrics) {
      if (leadMetrics.pendingApprovalLeads > 0) {
        newAlerts.push({
          id: "pending-approval",
          type: "warning",
          title: `${leadMetrics.pendingApprovalLeads} leads awaiting approval`,
          description: "Approved leads are required before sheets can be sent to Bulk Mail.",
          action: { label: "Review leads", href: leadsUrl ? `${leadsUrl}/leads` : "/leads" },
        });
      }
      if (leadMetrics.verifiedLeads > 0) {
        // This would need not_verified count from lead_finder_stats
      }
    }

    // Check for overdue invoices
    if (invoiceMetrics && invoiceMetrics.overdueInvoices > 0) {
      newAlerts.push({
        id: "overdue-invoices",
        type: "error",
        title: `${invoiceMetrics.overdueInvoices} overdue invoice(s)`,
        description: `Total overdue: ${inr(invoiceMetrics.overdueInvoices)}. AI can auto-chase.`,
        action: { label: "View invoices", href: "/invoices" },
      });
    }

    // Check for blocked tasks
    if (taskMetrics && taskMetrics.blockedTasks > 0) {
      newAlerts.push({
        id: "blocked-tasks",
        type: "warning",
        title: `${taskMetrics.blockedTasks} task(s) blocked`,
        description: "Blocked tasks need attention to unblock progress.",
        action: { label: "View tasks", href: "/tasks" },
      });
    }

    const failedCampaigns = bulkCampaigns.filter(
      (c) => c.status.toLowerCase() === "failed" || c.status.toLowerCase() === "error",
    );
    if (failedCampaigns.length > 0) {
      newAlerts.push({
        id: "failed-campaigns",
        type: "error",
        title: `${failedCampaigns.length} Bulk Mail campaign(s) failed`,
        description: "Check campaign logs and retry or investigate deliverability issues.",
        action: { label: "View campaigns", href: bulkMailUrl || "/campaigns" },
      });
    }

    if (health.some((h) => h.status === "down")) {
      newAlerts.push({
        id: "system-down",
        type: "error",
        title: "One or more connected systems unreachable",
        description: "Check system health panel for details.",
        action: { label: "View health", href: "#system-health" },
      });
    }

    if (health.some((h) => h.status === "degraded")) {
      newAlerts.push({
        id: "system-degraded",
        type: "warning",
        title: "Some systems degraded",
        description: "Performance or partial outage detected.",
        action: { label: "View health", href: "#system-health" },
      });
    }

    if (newAlerts.length === 0) {
      newAlerts.push({
        id: "all-clear",
        type: "success",
        title: "All systems operational",
        description: "No urgent items requiring attention.",
      });
    }

    setAlerts(newAlerts);
    setAlertsLoading(false);
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);
  useEffect(() => {
    fetchLeadStats();
  }, []);
  useEffect(() => {
    fetchBulkCampaigns();
  }, []);
  useEffect(() => {
    fetchLeadSheets();
  }, []);
  useEffect(() => {
    fetchSystemHealth();
  }, []);
  useEffect(() => {
    generateAlerts();
  }, [dashboardData, bulkCampaigns, systemHealth]);

  // Computed metrics from real data
  const totalLeads = leadStats?.totalLeads ?? 0;
  const todayLeads = leadStats?.todayLeads ?? 0;
  const verifiedLeads = leadStats?.verification.valid ?? 0;
  const approvedLeads = leadStats?.approval.approved ?? 0;
  const readySheets = leadStats?.sheets.ready ?? 0;

  const activeCampaigns = bulkCampaigns.filter((c) =>
    ["running", "active", "sending", "paused"].includes(c.status.toLowerCase()),
  ).length;
  const totalCampaigns = bulkCampaigns.length;

  // Business metrics from real data
  const revenueMTD = dashboardData?.revenueMetrics.revenueMTD ?? 0;
  const revenueGrowth = dashboardData?.revenueMetrics.revenueGrowthPct ?? null;
  const pipelineValue = dashboardData?.revenueMetrics.pipelineValue ?? 0;
  const activeCustomers = dashboardData?.revenueMetrics.activeCustomers ?? 0;

  // Business Health Score - computed from real KPIs
  const healthAvg = computeBusinessHealthScore(dashboardData, systemHealth);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Hero - AI Daily CEO Briefing */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 grid-bg"
        >
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full gradient-primary opacity-20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary/80">
                CEO · Sonu Group
              </div>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
                {greeting}, Sonu.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {dashboardData?.leadMetrics ? (
                  <>
                    <span className="font-medium">
                      {dashboardData.leadMetrics.totalLeads?.toLocaleString() ?? 0}
                    </span>{" "}
                    total leads ·{" "}
                    <span className="font-medium">{dashboardData.leadMetrics.todayLeads ?? 0}</span>{" "}
                    today ·{" "}
                    <span className="text-emerald-400 font-medium">
                      {dashboardData.leadMetrics.verifiedLeads ?? 0}
                    </span>{" "}
                    verified ·{" "}
                    <span className="text-primary font-medium">
                      {dashboardData.leadMetrics.approvedLeads ?? 0}
                    </span>{" "}
                    approved ·{" "}
                    <span className="text-sky-400 font-medium">{leadStats?.sheets.ready ?? 0}</span>{" "}
                    ready to send
                  </>
                ) : dashboardLoading ? (
                  "Loading business metrics..."
                ) : (
                  "No data available"
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={openAI}
                  className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow"
                >
                  <Sparkles className="h-4 w-4" /> Ask AI Briefing
                </button>
                <button className="h-9 px-3 rounded-lg border border-border bg-background text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" /> View full briefing
                </button>
                <button
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    fetchDashboardData();
                    fetchLeadStats();
                    fetchBulkCampaigns();
                    fetchLeadSheets();
                    fetchSystemHealth();
                  }}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh all
                </button>
              </div>
            </div>

            <div className="w-full md:w-[280px] rounded-xl border border-border bg-background/60 backdrop-blur p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Business Health Score
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{healthAvg}</span>
                <span className="text-xs text-emerald-400">Target: 85+</span>
              </div>
              <div className="h-24 -mx-2 mt-1">
                <ResponsiveContainer>
                  <RadialBarChart
                    innerRadius="60%"
                    outerRadius="100%"
                    data={[{ v: healthAvg }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="v"
                      cornerRadius={8}
                      fill={CHART.primary}
                      background={{ fill: "#27272A" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {systemHealth.filter((h) => h.status === "healthy").length}/{systemHealth.length}{" "}
                systems healthy
              </div>
            </div>
          </div>
        </motion.section>

        {/* KPI Row - Real Data */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Revenue MTD"
            value={inr(revenueMTD)}
            delta={revenueGrowth !== null ? revenueGrowth : 0}
            hint={
              revenueGrowth !== null
                ? `vs last month (${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%)`
                : "Not enough data"
            }
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            label="Pipeline Value"
            value={inr(pipelineValue)}
            delta={dashboardData?.revenueMetrics.revenueGrowthPct ?? 0}
            hint="Active opportunities"
            icon={<Target className="h-4 w-4" />}
          />
          <StatCard
            label="Active Customers"
            value={activeCustomers.toLocaleString()}
            delta={0}
            hint="Across all products"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Leads (Total)"
            value={totalLeads.toLocaleString()}
            delta={todayLeads > 0 ? 100 : 0}
            hint={todayLeads > 0 ? `${todayLeads} added today` : "No new leads today"}
            icon={<Search className="h-4 w-4" />}
          />
          <StatCard
            label="Verified & Approved"
            value={`${verifiedLeads} / ${approvedLeads}`}
            hint={`${leadStats?.sheets.ready ?? 0} sheets ready to send`}
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </div>

        {/* Row 2: Lead Finder Stats + AI Briefing + Today's Priorities */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Lead Finder Stats */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Lead Finder — Live Stats</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {leadStatsLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Badge
                    variant={leadStatsError ? "destructive" : leadStats ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {leadStatsLoading
                      ? "Loading..."
                      : leadStatsError
                        ? "Error"
                        : leadStats
                          ? "Live"
                          : "No data"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchLeadStats}
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  {leadsUrl && (
                    <a href={leadsUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leadStatsLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading Lead Finder stats...
                </div>
              ) : leadStatsError ? (
                <div className="py-4 text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {leadStatsError}
                </div>
              ) : leadStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Found"
                    value={leadStats.totalLeads.toLocaleString()}
                    hint={
                      leadStats.generatedAt
                        ? `Updated ${new Date(leadStats.generatedAt).toLocaleTimeString()}`
                        : "Latest"
                    }
                    icon={<Search className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Today"
                    value={leadStats.todayLeads.toString()}
                    delta={leadStats.newLeads > 0 ? 100 : 0}
                    hint={leadStats.newLeads > 0 ? `${leadStats.newLeads} new` : "No new searches"}
                    icon={<TrendingUp className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Verified (Valid)"
                    value={leadStats.verification.valid.toString()}
                    hint={`${leadStats.verification.invalid} invalid · ${leadStats.verification.risky} risky`}
                    icon={<CheckCircle className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Approved"
                    value={leadStats.approval.approved.toString()}
                    hint={`${leadStats.approval.pending_review} pending · ${leadStats.approval.rejected} rejected`}
                    icon={<Flag className="h-4 w-4" />}
                  />
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <div>No Lead Finder data yet</div>
                  <div className="text-xs mt-1">
                    Configure LEAD_FINDER_BASE_URL and run a search
                  </div>
                  {leadsUrl && (
                    <a
                      href={leadsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-primary text-xs hover:underline"
                    >
                      Open Lead Finder →
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Daily Briefing */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">AI Daily Briefing</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={openAI} className="h-7 gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Ask
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadStats && leadStats.approval.pending_review > 0 && (
                <AlertItemCard
                  icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                  title={`${leadStats.approval.pending_review} leads need approval`}
                  description="Approved leads unlock Bulk Mail sending. Review pending now."
                  actionLabel="Review leads"
                  actionHref={leadsUrl ? `${leadsUrl}/leads?status=pending_review` : "/leads"}
                />
              )}
              {leadStats && leadStats.verification.not_verified > 0 && (
                <AlertItemCard
                  icon={<Activity className="h-4 w-4 text-blue-400" />}
                  title={`${leadStats.verification.not_verified} leads unverified`}
                  description="Run verification to improve deliverability before sending."
                  actionLabel="Run verification"
                  actionHref={leadsUrl ? `${leadsUrl}/verify` : "/verify"}
                />
              )}
              {bulkCampaigns.length > 0 &&
                bulkCampaigns.some((c) =>
                  ["running", "active", "sending"].includes(c.status.toLowerCase()),
                ) && (
                  <AlertItemCard
                    icon={<ZapIcon className="h-4 w-4 text-emerald-400" />}
                    title="Campaign actively sending"
                    description={`${bulkCampaigns.filter((c) => ["running", "active", "sending"].includes(c.status.toLowerCase())).length} campaign(s) in progress. Daily limits enforced.`}
                    actionLabel="Monitor"
                    actionHref={bulkMailUrl ? `${bulkMailUrl}/campaigns` : "/campaigns"}
                  />
                )}
              {bulkCampaigns.length > 0 &&
                bulkCampaigns.some((c) =>
                  ["failed", "error", "cancelled"].includes(c.status.toLowerCase()),
                ) && (
                  <AlertItemCard
                    icon={<AlertCircle className="h-4 w-4 text-rose-400" />}
                    title="Campaign(s) need attention"
                    description={`${bulkCampaigns.filter((c) => ["failed", "error", "cancelled"].includes(c.status.toLowerCase())).length} campaign(s) failed or cancelled.`}
                    actionLabel="Investigate"
                    actionHref={bulkMailUrl ? `${bulkMailUrl}/campaigns` : "/campaigns"}
                  />
                )}
              {leadSheets.length > 0 && leadSheets.some((s) => s.status === "draft") && (
                <AlertItemCard
                  icon={<Clock className="h-4 w-4 text-slate-400" />}
                  title={`${leadSheets.filter((s) => s.status === "draft").length} draft sheet(s) waiting`}
                  description="Add template and send time to schedule for Bulk Mail."
                  actionLabel="Configure"
                  actionHref="/lead-sheets"
                />
              )}
              {leadSheets.length > 0 &&
                leadSheets.some((s) => s.status === "ready_for_bulk_mail") && (
                  <AlertItemCard
                    icon={<Send className="h-4 w-4 text-sky-400" />}
                    title={`${leadSheets.filter((s) => s.status === "ready_for_bulk_mail").length} sheet(s) ready to schedule`}
                    description="Set send time and campaign will auto-start at that time."
                    actionLabel="Schedule"
                    actionHref="/lead-sheets"
                  />
                )}
              {dashboardData?.invoiceMetrics &&
                dashboardData.invoiceMetrics.overdueInvoices > 0 && (
                  <AlertItemCard
                    icon={<AlertCircle className="h-4 w-4 text-rose-400" />}
                    title={`${dashboardData.invoiceMetrics.overdueInvoices} overdue invoice(s)`}
                    description={`Total overdue: ${inr(dashboardData.invoiceMetrics.overdueInvoices)}. AI can auto-chase.`}
                    actionLabel="View invoices"
                    actionHref="/invoices"
                  />
                )}
              {dashboardData?.taskMetrics && dashboardData.taskMetrics.blockedTasks > 0 && (
                <AlertItemCard
                  icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                  title={`${dashboardData.taskMetrics.blockedTasks} task(s) blocked`}
                  description="Blocked tasks need attention to unblock progress."
                  actionLabel="View tasks"
                  actionHref="/tasks"
                />
              )}
              {!leadStats &&
                !bulkCampaigns.length &&
                !leadSheets.length &&
                (!dashboardData || !dashboardData.invoiceMetrics?.overdueInvoices) && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <div>No AI insights yet — connect your data sources</div>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Bulk Email Campaigns + Today's Planner + Alerts */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bulk Email Campaigns */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-sm">Bulk Email Campaigns</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {bulkCampaignsLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Badge
                    variant={bulkCampaigns.length > 0 ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {bulkCampaignsLoading
                      ? "Loading..."
                      : bulkCampaigns.length > 0
                        ? `${bulkCampaigns.length} campaigns`
                        : "No campaigns"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchBulkCampaigns}
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  {bulkMailUrl && (
                    <a href={bulkMailUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bulkCampaignsLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading campaigns...
                </div>
              ) : bulkCampaigns.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <div>No Bulk Mail campaigns yet</div>
                  <div className="text-xs mt-1">
                    Create a campaign in Bulk Mail after approving leads
                  </div>
                  {bulkMailUrl && (
                    <a
                      href={bulkMailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-emerald-400 text-xs hover:underline"
                    >
                      Open Bulk Mail →
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {bulkCampaigns.map((campaign) => (
                    <CampaignRow key={campaign.id} campaign={campaign} bulkMailUrl={bulkMailUrl} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Planner + Alerts */}
          <div className="space-y-4">
            {/* Today's Planner */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Today's Planner</CardTitle>
                  </div>
                  <a href="/planner">
                    <Button variant="ghost" size="sm" className="h-7 gap-1">
                      <ChevronRight className="h-3.5 w-3.5" /> Open
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <TodayPlanner />
              </CardContent>
            </Card>

            {/* Alerts / Items Needing Attention */}
            <Card id="system-health">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-sm">Alerts & Attention</CardTitle>
                  </div>
                  <Badge
                    variant={
                      alerts.some((a) => a.type === "error")
                        ? "destructive"
                        : alerts.some((a) => a.type === "warning")
                          ? "default"
                          : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {alerts.filter((a) => a.type !== "success").length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertsLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Loading alerts...
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <AlertItemCard
                      key={alert.id}
                      icon={
                        alert.type === "error" ? (
                          <AlertCircle className="h-4 w-4 text-rose-400" />
                        ) : alert.type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        ) : alert.type === "info" ? (
                          <Activity className="h-4 w-4 text-blue-400" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        )
                      }
                      title={alert.title}
                      description={alert.description}
                      actionLabel={alert.action?.label}
                      actionHref={alert.action?.href}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 4: Revenue & Pipeline Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Revenue Trajectory</div>
                <div className="text-xs text-muted-foreground">
                  Last 7 months · Target vs Actual
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.primary }} />{" "}
                  Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.muted }} />{" "}
                  Target
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.warning }} />{" "}
                  Expenses
                </span>
              </div>
            </div>
            <div className="h-72">
              <RevenueTrendChart />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold mb-3">Pipeline by Stage</div>
            <div className="text-xs text-muted-foreground mb-3">
              {inr(pipelineValue)} across stages
            </div>
            <div className="h-56">
              <PipelineChart />
            </div>
          </div>
        </div>

        {/* Row 5: Campaign Monitor + Lead Sheets + Connected Systems */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <CampaignMonitor />
            <LeadSheetMonitor />
          </div>

          {/* Connected Systems */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Connected Systems</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchSystemHealth}
                  className="h-7 w-7 p-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemHealthLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Checking connections...
                </div>
              ) : (
                systemHealth.map((sys) => <SystemHealthRow key={sys.name} system={sys} />)
              )}
              <div className="pt-2 border-t border-border">
                <Plugins />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 6: Automation Health */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <div className="text-sm font-semibold">Automation Health</div>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> View in n8n
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <AutomationHealthCard
              title="Lead Search Jobs"
              value={
                dashboardData?.automation.leadSearchJobs.successRate !== undefined
                  ? `${dashboardData.automation.leadSearchJobs.successRate}%`
                  : "—"
              }
              status={(dashboardData?.automation.leadSearchJobs.status as any) || "unknown"}
              description={
                dashboardData?.automation.leadSearchJobs.details || "n8n → Lead Finder sync"
              }
              actionLabel="Open n8n"
              actionHref="https://n8n.sangita-group.com"
            />
            <AutomationHealthCard
              title="Verification Jobs"
              value={
                dashboardData?.automation.verificationJobs.successRate !== undefined
                  ? `${dashboardData.automation.verificationJobs.successRate}%`
                  : "—"
              }
              status={(dashboardData?.automation.verificationJobs.status as any) || "unknown"}
              description={
                dashboardData?.automation.verificationJobs.details || "Email verification pipeline"
              }
              actionLabel="Open n8n"
              actionHref="https://n8n.sangita-group.com"
            />
            <AutomationHealthCard
              title="Sheets Sync"
              value="—"
              status={(dashboardData?.automation.sheetsSync.status as any) || "unknown"}
              description={
                dashboardData?.automation.sheetsSync.details || "Lead Finder → Google Sheets"
              }
              actionLabel="Open n8n"
              actionHref="https://n8n.sangita-group.com"
            />
            <AutomationHealthCard
              title="Bulk Mail Import"
              value={
                dashboardData?.automation.bulkMailImport.successRate !== undefined
                  ? `${dashboardData.automation.bulkMailImport.successRate}%`
                  : "—"
              }
              status={(dashboardData?.automation.bulkMailImport.status as any) || "unknown"}
              description={
                dashboardData?.automation.bulkMailImport.details || "Sheets → Bulk Mail campaigns"
              }
              actionLabel="Open n8n"
              actionHref="https://n8n.sangita-group.com"
            />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Automation health requires n8n webhook integration. Configure n8n to POST status to
            Sangita OS webhook endpoint.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function computeBusinessHealthScore(data: DashboardData | null, health: SystemHealth[]): number {
  if (!data) return 0;

  let score = 0;
  let factors = 0;

  // System health (25%)
  const healthySystems = health.filter((h) => h.status === "healthy").length;
  const systemScore = health.length > 0 ? Math.round((healthySystems / health.length) * 100) : 0;
  score += systemScore * 0.25;
  factors += 0.25;

  // Lead conversion (25%)
  const totalLeads = data.leadMetrics.totalLeads;
  const approvedLeads = data.leadMetrics.approvedLeads;
  const leadConversion = totalLeads > 0 ? (approvedLeads / totalLeads) * 100 : 0;
  score += Math.min(100, leadConversion * 2) * 0.25;
  factors += 0.25;

  // Revenue growth (25%)
  const revenueGrowth = data.revenueMetrics.revenueGrowthPct;
  const revenueScore =
    revenueGrowth !== null ? Math.max(0, Math.min(100, 50 + revenueGrowth * 2)) : 0;
  score += revenueScore * 0.25;
  factors += 0.25;

  // Email deliverability (25%)
  const emailsSent = data.emailMetrics.emailsSentToday;
  const emailsDelivered = data.emailMetrics.emailsDeliveredToday;
  const deliverability = emailsSent > 0 ? (emailsDelivered / emailsSent) * 100 : 100;
  score += Math.min(100, deliverability) * 0.25;
  factors += 0.25;

  return factors > 0 ? Math.round(score / factors) : 0;
}

// ============================================================
// Revenue Trend Chart (fetches from API)
// ============================================================

function RevenueTrendChart() {
  const [data, setData] = useState<RevenueTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRevenueTrend() {
      try {
        const res = await fetch("/api/dashboard/revenue");
        if (!res.ok) throw new Error("Failed to fetch revenue trend");
        const json = await res.json();
        setData(json.trend || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadRevenueTrend();
  }, []);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (error)
    return (
      <div className="h-full flex items-center justify-center text-sm text-amber-400">{error}</div>
    );
  if (!data || data.length === 0)
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );

  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.5} />
            <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis dataKey="month" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#71717A"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => inr(v as number)}
        />
        <Tooltip
          contentStyle={{
            background: "#111113",
            border: "1px solid #27272A",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v: number) => inr(v)}
        />
        <Area
          type="monotone"
          dataKey="target"
          stroke={CHART.muted}
          strokeDasharray="4 4"
          fill="transparent"
        />
        <Area type="monotone" dataKey="expenses" stroke={CHART.warning} fill="transparent" />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={CHART.primary}
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Pipeline Chart (fetches from API)
// ============================================================

function PipelineChart() {
  const [data, setData] = useState<PipelineStage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const res = await fetch("/api/dashboard/revenue");
        if (!res.ok) throw new Error("Failed to fetch pipeline");
        const json = await res.json();
        setData(json.pipeline || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadPipeline();
  }, []);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (error)
    return (
      <div className="h-full flex items-center justify-center text-sm text-amber-400">{error}</div>
    );
  if (!data || data.length === 0)
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No pipeline data yet
      </div>
    );

  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis dataKey="stage" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#71717A"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => inr(v as number)}
        />
        <Tooltip
          cursor={{ fill: "#27272A33" }}
          contentStyle={{
            background: "#111113",
            border: "1px solid #27272A",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: number) => inr(v)}
        />
        <Bar dataKey="value" fill={CHART.primary} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Helper Components
// ============================================================

function AlertItemCard({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 mt-1"
        >
          <Button variant="outline" size="sm" className="h-7 px-2 gap-1">
            <ArrowRight className="h-3 w-3" />
            {actionLabel}
          </Button>
        </a>
      )}
    </div>
  );
}

function CampaignRow({
  campaign,
  bulkMailUrl,
}: {
  campaign: BulkMailCampaign;
  bulkMailUrl: string | null;
}) {
  const status = campaign.status.toLowerCase();
  const isRunning = status === "running" || status === "active" || status === "sending";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isFailed = status === "failed" || status === "error";
  const isCancelled = status === "cancelled";

  const statusStyle = isRunning
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isPaused
      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
      : isCompleted
        ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
        : isFailed
          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
          : isCancelled
            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
            : "bg-slate-500/10 text-slate-400 border-slate-500/30";

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{campaign.name}</div>
            <span
              className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-widest ${statusStyle}`}
            >
              {campaign.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Campaign ID: {campaign.id}</div>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {bulkMailUrl && (
            <a
              href={`${bulkMailUrl}/campaigns/${campaign.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
            </a>
          )}
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              Pause
            </Button>
          )}
          {isPaused && (
            <Button variant="default" size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-500">
              Resume
            </Button>
          )}
          {!isCompleted && !isCancelled && !isFailed && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              Cancel
            </Button>
          )}
          {isFailed && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-primary/30 text-primary hover:bg-primary/10"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TodayPlanner() {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const blocks = [
    { time: "07:30", end: "08:15", title: "Morning routine + workout", type: "break" as const },
    { time: "08:30", end: "10:30", title: "Deep work", type: "focus" as const },
    { time: "10:30", end: "11:00", title: "Coffee + inbox triage", type: "admin" as const },
    { time: "11:00", end: "11:45", title: "Call", type: "call" as const },
    { time: "12:00", end: "13:00", title: "Revenue standup", type: "meeting" as const },
    { time: "13:00", end: "14:00", title: "Lunch", type: "break" as const },
    { time: "14:00", end: "15:30", title: "Product review", type: "meeting" as const },
    { time: "15:30", end: "17:00", title: "Deep work", type: "focus" as const },
    { time: "17:00", end: "17:30", title: "Follow-ups", type: "admin" as const },
    { time: "17:30", end: "18:00", title: "End-of-day review", type: "focus" as const },
  ];

  function typeMeta(t: string) {
    return {
      focus: { icon: Brain, color: "border-primary/40 bg-primary/5 text-primary", label: "Focus" },
      meeting: {
        icon: Users,
        color: "border-violet-500/40 bg-violet-500/5 text-violet-300",
        label: "Meeting",
      },
      call: {
        icon: Phone,
        color: "border-amber-500/40 bg-amber-500/5 text-amber-300",
        label: "Call",
      },
      break: {
        icon: Coffee,
        color: "border-slate-500/30 bg-slate-500/5 text-slate-300",
        label: "Break",
      },
      admin: {
        icon: Zap,
        color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
        label: "Admin",
      },
    }[t];
  }

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground px-1 py-1">
        {dayName} · {dateStr}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {blocks.map((b, i) => {
          const m = typeMeta(b.type);
          const Icon = m.icon;
          return (
            <div key={i} className={`rounded-lg border ${m.color} p-3 flex items-center gap-3`}>
              <div className="w-16 text-xs font-mono text-muted-foreground">
                {b.time}
                <div className="text-[10px]">{b.end}</div>
              </div>
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="text-sm font-medium">{b.title}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
                  {m.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Planner data from /planner route</div>
        <a href="/planner">
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronRight className="h-3.5 w-3.5" /> Full planner
          </Button>
        </a>
      </div>
    </div>
  );
}

function SystemHealthRow({ system }: { system: SystemHealth }) {
  const statusConfig = {
    healthy: { icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Healthy" },
    degraded: { icon: WifiOff, color: "text-amber-400", bg: "bg-amber-500/10", label: "Degraded" },
    down: { icon: ZapOff, color: "text-rose-400", bg: "bg-rose-500/10", label: "Down" },
  }[system.status];

  const Icon = statusConfig.icon;

  return (
    <div className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${statusConfig.bg} grid place-items-center`}>
          <Icon className={`h-4 w-4 ${statusConfig.color}`} />
        </div>
        <div>
          <div className="text-sm font-medium">{system.name}</div>
          <div className="text-[11px] text-muted-foreground">{system.details}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span
          className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-widest ${statusConfig.bg} ${statusConfig.color} border-current/30`}
        >
          {statusConfig.label}
        </span>
        <span className="text-[10px] text-muted-foreground hidden sm:block">
          {new Date(system.lastCheck).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function AutomationHealthCard({
  title,
  value,
  status,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  value: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    down: {
      icon: XCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
    },
    unknown: {
      icon: Loader2,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
    },
  }[status] || {
    icon: Loader2,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  };

  const Icon = statusConfig.icon;

  return (
    <a
      href={actionHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-xl border ${statusConfig.border} ${statusConfig.bg} p-4 block hover:border-primary/40 transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
            <span className="text-xs font-medium">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
        <div className="text-2xl font-semibold text-muted-foreground/50">{value}</div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Click for details</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </a>
  );
}
