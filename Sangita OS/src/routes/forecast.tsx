import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { FORECAST_12M } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Operations" title="12-Month Forecast" description="Best / Expected / Worst case revenue paths based on current trends." />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3"><div className="text-sm font-medium">Revenue paths (₹L)</div><Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Estimate — not a guarantee</Badge></div>
          <div className="h-80"><ResponsiveContainer><LineChart data={FORECAST_12M}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="Best" /><Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} name="Expected" /><Line type="monotone" dataKey="worst" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" name="Worst" /><Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} name="Profit" /></LineChart></ResponsiveContainer></div>
        </div>
      </div>
    </AppLayout>
  ),
});