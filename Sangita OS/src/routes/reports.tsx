import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { CHART } from "@/lib/chart-colors";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Sangita OS" }] }),
  component: Reports,
});

function Reports() {
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/dashboard/revenue");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setRevenueTrend(data.trend || []);
      } catch (e) {
        console.error("Reports load error:", e);
        setRevenueTrend([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader
          eyebrow="Operations"
          title="Reports"
          description="Weekly, monthly and board-ready reports — AI-drafted, human-approved."
          actions={
            <Button size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Revenue vs target</div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART.teal}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#71717a"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Monthly breakdown</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="revenue" fill={CHART.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="text-base font-semibold">AI-Generated Insights</div>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Revenue trending {revenueTrend.length > 1 && revenueTrend[revenueTrend.length - 1]?.revenue > revenueTrend[revenueTrend.length - 2]?.revenue ? 'up' : 'down'} month-over-month.
              {revenueTrend.length === 0 && ' No data available yet.'}
            </p>
            <p>Configure Supabase to see real revenue analysis and forecasts.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
