import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, Sparkles, Wallet, Users, Target, TrendingUp,
  Zap, AlertTriangle, Flame,
} from "lucide-react";
import { AppLayout } from "@/components/os/AppLayout";
import { StatCard } from "@/components/os/StatCard";
import { CampaignMonitor } from "@/components/os/CampaignMonitor";
import { LeadSheetMonitor } from "@/components/os/LeadSheetMonitor";
import { Plugins } from "@/components/os/Plugins";
import { useOS } from "@/components/os/os-store";
import {
  AI_SUGGESTIONS, HEALTH, PIPELINE, PRIORITIES, PRODUCTS,
  REVENUE_TREND, inr,
} from "@/lib/mock";
import { CHART } from "@/lib/chart-colors";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { openAI } = useOS();
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const totalRev = REVENUE_TREND.reduce((s, r) => s + r.revenue, 0);
  const lastMonth = REVENUE_TREND[REVENUE_TREND.length - 1];
  const prevMonth = REVENUE_TREND[REVENUE_TREND.length - 2];
  const growth = ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
  const healthAvg = Math.round(HEALTH.reduce((s, h) => s + h.score, 0) / HEALTH.length);
  const pipeValue = PIPELINE.reduce((s, p) => s + p.value, 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 grid-bg"
        >
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full gradient-primary opacity-20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary/80">
                CEO · Sangita Group
              </div>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
                {greeting}, Sangita.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                August is pacing <span className="text-emerald-400 font-medium">+5.3% over target</span>.
                Business health is <span className="text-foreground font-medium">{healthAvg}/100</span>.
                Three moves will lock the quarter — ask AI for the play.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={openAI}
                  className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow"
                >
                  <Sparkles className="h-4 w-4" /> Ask Sangita AI
                </button>
                <button className="h-9 px-3 rounded-lg border border-border bg-background text-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowUpRight className="h-4 w-4" /> View briefing
                </button>
              </div>
            </div>

            <div className="w-full md:w-[280px] rounded-xl border border-border bg-background/60 backdrop-blur p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Business Health Score
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{healthAvg}</span>
                <span className="text-xs text-emerald-400">+4 wk/wk</span>
              </div>
              <div className="h-24 -mx-2 mt-1">
                <ResponsiveContainer>
                  <RadialBarChart
                    innerRadius="60%" outerRadius="100%"
                    data={[{ v: healthAvg }]} startAngle={90} endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="v" cornerRadius={8} fill={CHART.primary} background={{ fill: "#27272A" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.section>

        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue MTD" value={inr(lastMonth.revenue)} delta={growth} hint="vs previous month" icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Pipeline Value" value={inr(pipeValue)} delta={12.8} hint="active opportunities" icon={<Target className="h-4 w-4" />} />
          <StatCard label="Active Customers" value="1,284" delta={4.6} hint="across 3 products" icon={<Users className="h-4 w-4" />} />
          <StatCard label="AI Automations" value="47 running" delta={-6.2} hint="3 failed silently" icon={<Zap className="h-4 w-4" />} />
        </div>

        {/* Revenue + Health */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Revenue trajectory</div>
                <div className="text-xs text-muted-foreground">
                  {inr(totalRev)} across last 7 months · <span className="text-emerald-400">+{growth.toFixed(1)}%</span> Aug
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART.primary }} /> Revenue</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART.muted }} /> Target</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART.warning }} /> Expenses</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={REVENUE_TREND} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="month" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v as number)} />
                  <Tooltip
                    contentStyle={{ background: "#111113", border: "1px solid #27272A", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Area type="monotone" dataKey="target" stroke={CHART.muted} strokeDasharray="4 4" fill="transparent" />
                  <Area type="monotone" dataKey="expenses" stroke={CHART.warning} fill="transparent" />
                  <Area type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Business health by area</div>
            <div className="text-xs text-muted-foreground mb-3">Weighted score, last 7 days</div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={HEALTH} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="area" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    cursor={{ fill: "#27272A33" }}
                    contentStyle={{ background: "#111113", border: "1px solid #27272A", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {HEALTH.map((h) => (
                      <Cell key={h.area} fill={h.score >= 85 ? CHART.success : h.score >= 75 ? CHART.primary : CHART.warning} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Priorities + Pipeline + AI */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Today's priorities</div>
                <div className="text-xs text-muted-foreground">Ranked by AI on revenue & risk impact</div>
              </div>
              <button className="text-xs text-primary hover:underline">Open planner →</button>
            </div>
            <ul className="divide-y divide-border">
              {PRIORITIES.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <span className={
                    "h-2 w-2 rounded-full " +
                    (p.level === "high" ? "bg-red-500" : p.level === "med" ? "bg-amber-400" : "bg-emerald-500")
                  } />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.owner} · Due {p.due}
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                    {p.impact}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">AI briefing</div>
            </div>
            <div className="space-y-3">
              {AI_SUGGESTIONS.map((s, i) => (
                <button
                  key={s.title}
                  onClick={openAI}
                  className="w-full text-left rounded-lg border border-border bg-background p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {i === 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      : i === 1 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      : <Flame className="h-3.5 w-3.5 text-red-400" />}
                    Insight
                  </div>
                  <div className="mt-1 text-sm font-medium">{s.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.body}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Monitoring — Bulk Mail (Step 4) */}
        <CampaignMonitor />

        {/* Lead Sheets — Approval-Gated Sending (Step 6) */}
        <LeadSheetMonitor />

        {/* Plugins — Overview launchers (Phase 5) */}
        <Plugins />

        {/* Pipeline + Products */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Lead pipeline</div>
                <div className="text-xs text-muted-foreground">{inr(pipeValue)} across {PIPELINE.reduce((s, p) => s + p.count, 0)} opportunities</div>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={PIPELINE} margin={{ top: 10, right: 8, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="stage" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v as number)} />
                  <Tooltip
                    cursor={{ fill: "#27272A33" }}
                    contentStyle={{ background: "#111113", border: "1px solid #27272A", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Bar dataKey="value" fill={CHART.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold mb-3">Products</div>
            <div className="space-y-3">
              {PRODUCTS.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center text-white text-xs font-semibold">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.users} customers</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{inr(p.mrr)}</div>
                    <div className="text-[11px] text-emerald-400">+{p.delta}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
