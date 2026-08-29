import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { REVENUE_TREND } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Download, Sparkles } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader eyebrow="Operations" title="Reports" description="Weekly, monthly and board-ready reports — AI-drafted, human-approved." actions={<Button size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export PDF</Button>} />
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Revenue vs target</div>
            <div className="h-56"><ResponsiveContainer><LineChart data={REVENUE_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} /><Line type="monotone" dataKey="target" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Expenses</div>
            <div className="h-56"><ResponsiveContainer><BarChart data={REVENUE_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Bar dataKey="expenses" fill="#f43f5e" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-sm font-medium text-primary flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4" /> Weekly executive summary</div>
          <div className="text-xs text-muted-foreground space-y-1.5"><p>Revenue closed at ₹94.2L (+18% WoW). 6 deals won.</p><p>Cash: ₹2.4Cr on hand. Runway 18 months.</p><p>Client concentration risk at 48%.</p></div>
        </div>
      </div>
    </AppLayout>
  ),
});