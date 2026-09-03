import { createFileRoute } from "@tanstack/react-router";
import { getEmailMetrics, getEmailCampaignMetrics } from "@/lib/dashboard/server";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/dashboard/email")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check if Supabase is properly configured
          if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn(
              "[dashboard/email] Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
            );
            // Return empty state instead of error - allows UI to show "No campaigns yet"
            return json({ 
              metrics: {
                activeCampaigns: 0,
                totalCampaigns: 0,
                emailsSentToday: 0,
                emailsDeliveredToday: 0,
                emailsOpenedToday: 0,
                emailsClickedToday: 0,
                emailsBouncedToday: 0,
              }, 
              campaigns: [] 
            });
          }

          const [metrics, campaigns] = await Promise.all([
            getEmailMetrics(),
            getEmailCampaignMetrics(),
          ]);
          return json({ metrics, campaigns });
        } catch (e) {
          console.error("[dashboard/email] Error:", e);
          // Return empty state on error instead of 500 - allows graceful degradation
          return json({ 
            metrics: {
              activeCampaigns: 0,
              totalCampaigns: 0,
              emailsSentToday: 0,
              emailsDeliveredToday: 0,
              emailsOpenedToday: 0,
              emailsClickedToday: 0,
              emailsBouncedToday: 0,
            }, 
            campaigns: [] 
          });
        }
      },
    },
  },
});
