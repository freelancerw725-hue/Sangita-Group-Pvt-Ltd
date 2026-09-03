import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast — Sangita OS" }] }),
  component: ForecastPage,
});

function ForecastPage() {
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/forecast");
        if (!res.ok) throw new Error("Failed to fetch forecast");
        const data = await res.json();
        setForecast(data.forecast || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Operations" title="12-Month Forecast" description="Loading forecast from database..." />
          <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
            <div className="h-80 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Operations" title="12-Month Forecast" description="Failed to load forecast" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">{error}</div>
        </div>
      </AppLayout>
    );
  }

  // If no forecast data, try to generate from revenue trend
  const hasData = forecast.length > 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Operations" title="12-Month Forecast" description={hasData ? "Best / Expected / Worst case revenue paths from forecast_12m table." : "No forecast data available. Forecasts are generated from real revenue trends."} />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3"><div className="text-sm font-medium">Revenue paths (₹L)</div>{hasData ? <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">From database</Badge> : <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Estimate — not a guarantee</Badge>}</div>
          <div className="h-80">{hasData ? (
            <ResponsiveContainer>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="Best" />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} name="Expected" />
                <Line type="monotone" dataKey="worst" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" name="Worst" />
                <Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              <p>No forecast data in database. Run the forecasting job or add records to forecast_12m table.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}