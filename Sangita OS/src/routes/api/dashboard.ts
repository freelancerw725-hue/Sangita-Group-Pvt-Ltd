import { createFileRoute } from "@tanstack/react-router";
import {
  getLeadMetrics,
  getRevenueMetrics,
  getEmailMetrics,
  getInvoiceMetrics,
  getTaskMetrics,
  getRecentActivity,
  getAutomationHealth,
  getCustomerMetrics,
} from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [
            leadMetrics,
            revenueMetrics,
            emailMetrics,
            invoiceMetrics,
            taskMetrics,
            activities,
            automation,
            customerMetrics,
          ] = await Promise.all([
            getLeadMetrics(),
            getRevenueMetrics(),
            getEmailMetrics(),
            getInvoiceMetrics(),
            getTaskMetrics(),
            getRecentActivity(20),
            getAutomationHealth(),
            getCustomerMetrics(),
          ]);

          return json({
            leadMetrics,
            revenueMetrics,
            emailMetrics,
            invoiceMetrics,
            taskMetrics,
            activities,
            automation,
            customerMetrics,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("[dashboard] Error:", e);
          return errorJson("Failed to fetch dashboard data", 500);
        }
      },
    },
  },
});
