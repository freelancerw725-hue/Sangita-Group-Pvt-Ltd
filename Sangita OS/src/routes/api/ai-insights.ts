import { createFileRoute } from "@tanstack/react-router";
import {
  getRevenueMetrics,
  getRevenueTrend,
  getPipelineStages,
  getCashFlow,
  getExpenseBreakdown,
  getPnL,
  getRecentActivity,
  getAutomationHealth,
} from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/ai-insights")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check if Supabase is properly configured
          if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn(
              "[ai-insights] Missing Supabase credentials. Returning fallback data.",
            );
            // Return minimal empty state
            return json({
              revenue: {
                revenue: 0,
                growth: null,
                margin: null,
                mrr: 0,
              },
              health: [
                { area: "Sales", score: 50 },
                { area: "Marketing", score: 50 },
                { area: "Development", score: 50 },
                { area: "Finance", score: 50 },
                { area: "Customer Success", score: 50 },
                { area: "Product", score: 50 },
                { area: "Operations", score: 50 },
                { area: "Automation", score: 50 },
              ],
              risks: [],
              missedOpps: [],
              churnRisk: [],
              forecast: [],
              revenueTrend: [],
              aiRecs: [],
            });
          }

          const [
            revenueMetrics,
            revenueTrend,
            pipeline,
            cashFlow,
            expenses,
            pnl,
            activities,
            automation,
          ] = await Promise.all([
            getRevenueMetrics(),
            getRevenueTrend(),
            getPipelineStages(),
            getCashFlow(),
            getExpenseBreakdown(),
            getPnL(),
            getRecentActivity(50),
            getAutomationHealth(),
          ]);

          // Compute health scores from real data
          const health = computeHealthScores(
            revenueMetrics,
            pipeline,
            cashFlow,
            expenses,
            activities,
            automation,
          );

          // Compute risks from real data
          const risks = computeRisks(
            revenueMetrics,
            pipeline,
            cashFlow,
            expenses,
            activities,
            automation,
          );

          // Compute missed opportunities from real data
          const missedOpps = computeMissedOpps(revenueMetrics, pipeline, activities);

          // Compute churn risk from real data
          const churnRisk = computeChurnRisk(revenueMetrics, pipeline, activities);

          // Generate forecast from real data
          const forecast = generateForecast(revenueTrend, pnl);

          // Generate AI recommendations from real data
          const aiRecs = generateAIRecommendations(
            revenueMetrics,
            pipeline,
            cashFlow,
            expenses,
            activities,
            automation,
          );

          return json({
            revenue: {
              revenue: revenueMetrics.revenueMTD,
              growth: revenueMetrics.revenueGrowthPct,
              margin:
                revenueMetrics.revenueLastMonth > 0
                  ? Math.round(
                      ((revenueMetrics.revenueMTD - revenueMetrics.revenueLastMonth) /
                        revenueMetrics.revenueLastMonth) *
                        100 *
                        10,
                    ) / 10
                  : null,
              mrr: computeMRR(pnl),
            },
            health,
            risks,
            missedOpps,
            churnRisk,
            forecast,
            revenueTrend,
            aiRecs,
          });
        } catch (e) {
          console.error("[ai-insights] Error:", e);
          // Return graceful fallback instead of 500 error
          return json({
            revenue: {
              revenue: 0,
              growth: null,
              margin: null,
              mrr: 0,
            },
            health: [
              { area: "Sales", score: 50 },
              { area: "Marketing", score: 50 },
              { area: "Development", score: 50 },
              { area: "Finance", score: 50 },
              { area: "Customer Success", score: 50 },
              { area: "Product", score: 50 },
              { area: "Operations", score: 50 },
              { area: "Automation", score: 50 },
            ],
            risks: [],
            missedOpps: [],
            churnRisk: [],
            forecast: [],
            revenueTrend: [],
            aiRecs: [],
          });
        }
      },
    },
  },
});

function computeHealthScores(
  revenue: any,
  pipeline: any[],
  cashFlow: any[],
  expenses: any[],
  activities: any[],
  automation: any,
): { area: string; score: number }[] {
  const areas = [
    { area: "Sales", score: computeSalesHealth(pipeline, revenue) },
    { area: "Marketing", score: computeMarketingHealth(activities, revenue) },
    { area: "Development", score: computeDevHealth(activities) },
    { area: "Finance", score: computeFinanceHealth(revenue, cashFlow, expenses) },
    { area: "Customer Success", score: computeCustSuccessHealth(pipeline, activities) },
    { area: "Product", score: computeProductHealth(activities) },
    { area: "Operations", score: computeOpsHealth(automation, activities) },
    { area: "Automation", score: computeAutomationHealth(automation) },
  ];
  return areas;
}

function computeSalesHealth(pipeline: any[], revenue: any): number {
  if (pipeline.length === 0) return 50;
  const totalPipeline = pipeline.reduce((s, p) => s + p.value, 0);
  const target = 10000000; // 1Cr target
  const ratio = totalPipeline / target;
  return Math.min(100, Math.max(0, Math.round(50 + ratio * 50)));
}

function computeMarketingHealth(activities: any[], revenue: any): number {
  const marketingActivities = activities.filter(
    (a) => a.type === "campaign" || a.type === "email" || a.type === "sync",
  ).length;
  return Math.min(100, Math.max(0, 40 + marketingActivities * 5));
}

function computeDevHealth(activities: any[]): number {
  const devActivities = activities.filter(
    (a) => a.type === "commit" || a.type === "deploy" || a.type === "feature",
  ).length;
  return Math.min(100, Math.max(0, 60 + devActivities * 4));
}

function computeFinanceHealth(revenue: any, cashFlow: any[], expenses: any[]): number {
  const growth = revenue.revenueGrowthPct ?? 0;
  const positiveCashFlow = cashFlow.filter((c) => c.inflow > c.outflow).length;
  const cashFlowScore = cashFlow.length > 0 ? (positiveCashFlow / cashFlow.length) * 100 : 50;
  return Math.min(100, Math.max(0, Math.round((growth + 10) * 3 + cashFlowScore * 0.5)));
}

function computeCustSuccessHealth(pipeline: any[], activities: any[]): number {
  const wonStage = pipeline.find((p) => p.stage.toLowerCase() === "won");
  const wonValue = wonStage?.value || 0;
  const totalPipeline = pipeline.reduce((s, p) => s + p.value, 0);
  const winRate = totalPipeline > 0 ? (wonValue / totalPipeline) * 100 : 50;
  return Math.min(100, Math.max(0, Math.round(40 + winRate)));
}

function computeProductHealth(activities: any[]): number {
  const productActivities = activities.filter(
    (a) => a.type === "feature" || a.type === "release" || a.type === "bug",
  ).length;
  return Math.min(100, Math.max(0, 50 + productActivities * 3));
}

function computeOpsHealth(automation: any, activities: any[]): number {
  const automationScore =
    automation.leadSearchJobs.successRate || automation.verificationJobs.successRate || 50;
  const opsActivities = activities.filter(
    (a) => a.type === "meeting" || a.type === "call" || a.type === "task",
  ).length;
  return Math.min(100, Math.max(0, Math.round(automationScore * 0.7 + opsActivities * 2)));
}

function computeAutomationHealth(automation: any): number {
  const scores = [
    automation.leadSearchJobs.successRate,
    automation.verificationJobs.successRate,
    automation.bulkMailImport.successRate,
  ].filter(Boolean);
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
}

function computeRisks(
  revenue: any,
  pipeline: any[],
  cashFlow: any[],
  expenses: any[],
  activities: any[],
  automation: any,
): { title: string; severity: "High" | "Medium" | "Low"; detail: string }[] {
  const risks: { title: string; severity: "High" | "Medium" | "Low"; detail: string }[] = [];

  // Revenue concentration risk
  if (revenue.activeCustomers > 0 && revenue.activeCustomers < 10) {
    risks.push({
      title: "Revenue concentration",
      severity: "High",
      detail: `Only ${revenue.activeCustomers} active customers. Diversify customer base.`,
    });
  }

  // Pipeline risk
  const totalPipeline = pipeline.reduce((s, p) => s + p.value, 0);
  if (totalPipeline < 5000000) {
    // Less than 50L pipeline
    risks.push({
      title: "Low pipeline coverage",
      severity: "High",
      detail: `Pipeline value ${Math.round(totalPipeline / 100000)}L. Target 3x revenue.`,
    });
  }

  // Cash flow risk
  const negativeMonths = cashFlow.filter((c) => c.inflow < c.outflow).length;
  if (negativeMonths > cashFlow.length / 2) {
    risks.push({
      title: "Negative cash flow trend",
      severity: "High",
      detail: `${negativeMonths} of last ${cashFlow.length} months had negative cash flow.`,
    });
  }

  // Automation health
  if (
    automation.leadSearchJobs.status === "down" ||
    automation.verificationJobs.status === "down"
  ) {
    risks.push({
      title: "Automation pipeline degraded",
      severity: "High",
      detail: "Lead search or verification jobs failing. Check n8n workflows.",
    });
  } else if (
    automation.leadSearchJobs.status === "degraded" ||
    automation.verificationJobs.status === "degraded"
  ) {
    risks.push({
      title: "Automation pipeline degraded",
      severity: "Medium",
      detail: "Some automation jobs have elevated failure rates.",
    });
  }

  // Overdue invoices would come from invoice metrics
  // Added at runtime in the dashboard

  return risks;
}

function computeMissedOpps(
  revenue: any,
  pipeline: any[],
  activities: any[],
): { title: string; cost: number; why: string; action: string }[] {
  const missed: { title: string; cost: number; why: string; action: string }[] = [];

  // Stalled deals in pipeline
  const stalledStages = ["New", "Qualified", "Proposal"];
  for (const stage of stalledStages) {
    const stageData = pipeline.find((p) => p.stage === stage);
    if (stageData && stageData.count > 5) {
      missed.push({
        title: `${stageData.count} deals stalled in ${stage}`,
        cost: Math.round(stageData.value * 0.3),
        why: `Deals sitting in ${stage} stage for extended period without progression.`,
        action: "Review and advance or disqualify",
      });
    }
  }

  // No follow-up activities
  const recentActivities = activities.filter((a) => {
    const age = Date.now() - new Date(a.createdAt).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  });
  if (recentActivities.length < 10) {
    missed.push({
      title: "Low outreach activity",
      cost: 500000,
      why: "Few recent sales activities recorded. Pipeline may stall.",
      action: "Schedule proactive outreach",
    });
  }

  return missed;
}

function computeChurnRisk(
  revenue: any,
  pipeline: any[],
  activities: any[],
): { client: string; product: string; risk: number; reason: string }[] {
  // This would need actual customer usage data
  // For now, return empty array indicating no data
  return [];
}

function generateForecast(
  revenueTrend: { month: string; revenue: number }[],
  pnl: { month: string; revenue: number; profit: number }[],
): { month: string; revenue: number; profit: number; best: number; worst: number }[] {
  if (revenueTrend.length < 3) return [];

  // Simple linear trend projection
  const recentRevenue = revenueTrend.slice(-3).map((r) => r.revenue);
  const avgGrowth =
    recentRevenue.reduce((sum, r, i) => {
      if (i === 0) return sum;
      return sum + (r - recentRevenue[i - 1]) / recentRevenue[i - 1];
    }, 0) /
    (recentRevenue.length - 1);

  const lastRevenue = recentRevenue[recentRevenue.length - 1];
  const lastProfit = pnl.length > 0 ? pnl[pnl.length - 1].profit : Math.round(lastRevenue * 0.28);

  const months = [
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
  ];
  const startIdx = months.indexOf(revenueTrend[revenueTrend.length - 1]?.month || "Jul") + 1;

  return Array.from({ length: 12 }).map((_, i) => {
    const month = months[(startIdx + i) % 12];
    const projectedRevenue = Math.round(lastRevenue * Math.pow(1 + avgGrowth, i + 1));
    const projectedProfit = Math.round(projectedRevenue * (lastProfit / lastRevenue));
    return {
      month,
      revenue: projectedRevenue,
      profit: projectedProfit,
      best: Math.round(projectedRevenue * 1.14),
      worst: Math.round(projectedRevenue * 0.82),
    };
  });
}

function computeMRR(pnl: { month: string; revenue: number; profit: number }[]): number {
  // MRR from recurring revenue in P&L
  // For now, use last month's revenue as proxy
  return pnl.length > 0 ? pnl[pnl.length - 1].revenue : 0;
}

function generateAIRecommendations(
  revenue: any,
  pipeline: any[],
  cashFlow: any[],
  expenses: any[],
  activities: any[],
  automation: any,
): { title: string; impact: string; confidence: number; why: string }[] {
  const recs: { title: string; impact: string; confidence: number; why: string }[] = [];

  // Revenue-based recommendation
  if (revenue.revenueGrowthPct !== null && revenue.revenueGrowthPct > 5) {
    recs.push({
      title: "Push renewals this week",
      impact: `+${Math.round(revenue.revenueMTD * 0.1)}`,
      confidence: 82,
      why: "Revenue trending above target. Closing pending renewals locks the quarter.",
    });
  }

  // Pipeline recommendation
  const totalPipeline = pipeline.reduce((s, p) => s + p.value, 0);
  if (totalPipeline < revenue.revenueMTD * 3) {
    recs.push({
      title: "Accelerate mid-market outbound",
      impact: "+30% pipeline coverage",
      confidence: 74,
      why: `Pipeline (${Math.round(totalPipeline / 100000)}L) below 3x revenue target. Outbound needed.`,
    });
  }

  // Cost optimization
  if (expenses.length > 0) {
    const totalExpenses = expenses.reduce((s, e) => s + e.value, 0);
    const largest = expenses.sort((a, b) => b.value - a.value)[0];
    if (largest && largest.value > totalExpenses * 0.3) {
      recs.push({
        title: `Optimize ${largest.category} spend`,
        impact: `-${Math.round(largest.value * 0.15)}`,
        confidence: 85,
        why: `${largest.category} is ${Math.round((largest.value / totalExpenses) * 100)}% of expenses. Right-sizing saves costs.`,
      });
    }
  }

  // Automation health
  if (
    automation.leadSearchJobs.status === "degraded" ||
    automation.verificationJobs.status === "degraded"
  ) {
    recs.push({
      title: "Fix automation pipeline",
      impact: "Restore lead flow",
      confidence: 90,
      why: "Lead search/verification jobs have elevated failures. Pipeline at risk.",
    });
  }

  return recs.slice(0, 6);
}
