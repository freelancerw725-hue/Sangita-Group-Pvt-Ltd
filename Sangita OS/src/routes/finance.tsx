import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { CASH_FLOW, EXPENSE_BREAKDOWN } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { Sparkles, Download, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Finance — Sangita OS" }, { name: "description", content: "Cash, runway, P&L, and AI commentary." }] }),
  component: FinancePage,
});

function FinancePage() {
  const COLORS = ["#3b82f6","#a855f7","#10b981","#f59e0b","#f43f5e"];
  const pnl = [
    { m: "Feb", rev: 184, cogs: 55, opex: 62, profit: 67 },
    { m: "Mar", rev: 212, cogs: 63, opex: 68, profit: 81 },
    { m: "Apr", rev: 248, cogs: 71, opex: 74, profit: 103 },
    { m: "May", rev: 231, cogs: 68, opex: 78, profit: 85 },
    { m: "Jun", rev: 289, cogs: 82, opex: 84, profit: 123 },
    { m: "Jul", rev: 342, cogs: 96, opex: 92, profit: 154 },
    { m: "Aug", rev: 378, cogs: 102, opex: 98, profit: 178 },
  ];
  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader eyebrow="Finance" title="Cash, runway & P&L" description="Auto-updating financials with AI-written management commentary."
          actions={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export P&L</Button><Button size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> AI commentary</Button></div>} />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi label="Cash on hand" value="₹2.4Cr" delta="+₹32L MoM" up />
          <Kpi label="Runway" value="18 months" delta="+2 vs Jul" up />
          <Kpi label="Burn (net)" value="₹18L/mo" delta="Stable" up={false} />
          <Kpi label="Gross margin" value="72.4%" delta="+1.4pt" up />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Cashflow — Inflow vs Outflow (₹L)</div>
            <div className="h-64"><ResponsiveContainer><AreaChart data={CASH_FLOW}><defs><linearGradient id="fin1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="fin2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#fin1)" /><Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fill="url(#fin2)" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Expense breakdown</div>
            <div className="h-56"><ResponsiveContainer><PieChart><Pie data={EXPENSE_BREAKDOWN} dataKey="value" nameKey="category" innerRadius={40} outerRadius={80} stroke="none">{EXPENSE_BREAKDOWN.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div>
            <div className="mt-2 space-y-1">{EXPENSE_BREAKDOWN.map((e, i) => <div key={e.category} className="flex justify-between text-xs"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />{e.category}</span><span>{e.value}%</span></div>)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">P&L (₹L)</div>
            <div className="h-64"><ResponsiveContainer><BarChart data={pnl}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="m" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="rev" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} /><Bar dataKey="cogs" fill="#f59e0b" name="COGS" radius={[4,4,0,0]} /><Bar dataKey="opex" fill="#f43f5e" name="Opex" radius={[4,4,0,0]} /><Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm font-medium text-primary flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4" /> AI Management Commentary</div>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Revenue reached ₹3.78Cr in August, +10.5% MoM — outpacing target by 5.3%. Growth driven by SwiftGrowth Enterprise renewals and Libriofy net-new.</p>
              <p>Gross margin expanded 140 bps to 72.4% as infra costs normalized post-migration. Opex up ₹6L absorbed by revenue expansion.</p>
              <p><span className="text-amber-300">Risk:</span> Client concentration — top 3 = 48% MRR. Recommend diversification via mid-market outbound this quarter.</p>
              <p><span className="text-emerald-300">Estimate:</span> If current trend holds, Q4 revenue ≈ ₹13.2Cr, profit ≈ ₹3.7Cr. Not a guarantee.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
function Kpi({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  const Icon = up ? TrendingUp : TrendingDown;
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div><div className={`text-[11px] mt-0.5 flex items-center gap-1 ${up ? "text-emerald-400" : "text-amber-400"}`}><Icon className="h-3 w-3" /> {delta}</div></div>;
}