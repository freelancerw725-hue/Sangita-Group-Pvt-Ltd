import { createFileRoute } from "@tanstack/react-router";
import {
  getLeadMetrics,
  getLeadPipelineMetrics,
  getRevenueMetrics,
  getEmailMetrics,
  getEmailCampaignMetrics,
  getInvoiceMetrics,
  getTaskMetrics,
  getCustomerMetrics,
  getRevenueTrend,
  getPipelineStages,
  getCashFlow,
  getExpenseBreakdown,
  getPnL,
  getRecentActivity,
  getAutomationHealth,
} from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/leads")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [metrics, pipeline] = await Promise.all([
            getLeadMetrics(),
            getLeadPipelineMetrics(),
          ]);
          return json({ metrics, pipeline });
        } catch (e) {
          console.error("[dashboard/leads] Error:", e);
          return errorJson("Failed to fetch lead metrics", 500);
        }
      },
    },
  },
});
