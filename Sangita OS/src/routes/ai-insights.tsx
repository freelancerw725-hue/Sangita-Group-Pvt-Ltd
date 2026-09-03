import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Brain,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { inr } from "@/lib/dashboard/server";
import { CHART } from "@/lib/chart-colors";

export const Route = createFileRoute("/ai-insights")({
  head: () => ({
    meta: [
      { title: "AI Insights — Sangita OS" },
      {
        name: "description",
        content:
          "Executive intelligence — health, forecasts, risk & recommendations from real data.",
      },
    ],
  }),
  component: AiInsights,
});

function AiInsights() {
  const [data, setData] = useState<{
    revenue: { revenue: number; growth: number | null; margin: number | null; mrr: number };
    health: { area: string; score: number }[];
    risks: { title: string; severity: string; detail: string }[];
    missedOpps: { title: string; cost: number; why: string; action: string }[];
    churnRisk: { client: string; product: string; risk: number; reason: string }[];
    forecast: { month: string; revenue: number; profit: number; best: number; worst: number }[];
    revenueTrend: { month: string; revenue: number; target?: number; expenses?: number }[];
    aiRecs: { title: string; impact: string; confidence: number; why: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/ai-insights");
        if (!res.ok) throw new Error("Failed to fetch AI insights");
        const json = await res.json();
        setData(json);
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
        <div className="p-6 max-w-[1600px] mx-auto">
          <PageHeader
            eyebrow="AI Insights"
            title="Executive Intelligence"
            description="Loading real-time insights from your business data..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="col-span-2">
              <SkeletonChart />
            </div>
            <div>
              <SkeletonCard />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1600px] mx-auto">
          <PageHeader
            eyebrow="AI Insights"
            title="Executive Intelligence"
            description="Failed to load insights"
          />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1600px] mx-auto">
          <PageHeader
            eyebrow="AI Insights"
            title="Executive Intelligence"
            description="No data available"
          />
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p>No AI insights available yet. Connect your data sources.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Compute business score from real data
  const score = computeBusinessScore(data);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          eyebrow="AI Insights"
          title="Executive Intelligence"
          description="Business health, forecasts, and AI-drafted recommendations — updated as real data flows in."
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Weekly briefing
              </Button>
              <Button size="sm" className="gap-2">
                <Brain className="h-3.5 w-3.5" /> Ask AI
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-4 gap-3 mb-5">
          <BigScore score={score} />
          <Kpi
            label="Revenue (MTD)"
            value={inr(data.revenue.revenue)}
            delta={
              data.revenue.growth !== null
                ? `${data.revenue.growth > 0 ? "+" : ""}${data.revenue.growth}%`
                : "—"
            }
            tone={data.revenue.growth !== null && data.revenue.growth >= 0 ? "up" : "down"}
            hint="vs last month"
          />
          <Kpi
            label="Profit margin"
            value={data.revenue.margin !== null ? `${data.revenue.margin}%` : "—"}
            delta="—"
            tone="up"
            hint="Target 30%"
          />
          <Kpi
            label="MRR"
            value={inr(data.revenue.mrr)}
            delta="—"
            tone="up"
            hint="Recurring revenue"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Revenue trend & 12-month forecast</div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Estimate
              </Badge>
            </div>
            <div className="h-64">
              <RevenueForecastChart trend={data.revenueTrend} forecast={data.forecast} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Health by area</div>
            <div className="space-y-2">
              {data.health.map((h) => (
                <div key={h.area}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{h.area}</span>
                    <span className="font-semibold">{h.score}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${h.score}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full ${h.score > 85 ? "bg-emerald-400" : h.score > 70 ? "bg-primary" : "bg-amber-400"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
              <Target className="h-4 w-4" /> Today's Focus
            </div>
            <ol className="space-y-2 text-sm">
              {data.aiRecs.slice(0, 4).map((r, i) => (
                <li key={r.title} className="flex gap-2">
                  <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span>{r.title}</span>
                  <span className="text-emerald-400 ml-auto">{r.impact}</span>
                </li>
              ))}
              {data.aiRecs.length === 0 && (
                <li className="text-muted-foreground">No recommendations yet</li>
              )}
            </ol>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> AI Recommendations
            </div>
            <div className="space-y-3">
              {data.aiRecs.map((r) => (
                <div key={r.title} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">{r.impact}</span>
                      <span className="text-muted-foreground">{r.confidence}% conf.</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{r.why}</div>
                </div>
              ))}
              {data.aiRecs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>
                    No AI recommendations yet. Recommendations are generated from your business
                    data.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Risk radar
            </div>
            <div className="space-y-2">
              {data.risks.map((r) => (
                <div key={r.title} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${r.severity === "High" ? "border-rose-500/40 text-rose-300" : r.severity === "Medium" ? "border-amber-500/40 text-amber-300" : "border-slate-500/40 text-slate-300"}`}
                    >
                      {r.severity}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-0.5">{r.detail}</div>
                </div>
              ))}
              {data.risks.length === 0 && (
                <div className="text-xs text-muted-foreground">No risks identified yet</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <Flame className="h-4 w-4 text-rose-400" /> Missed opportunities
            </div>
            <div className="space-y-2">
              {data.missedOpps.map((m) => (
                <div key={m.title} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-rose-400 font-semibold">{inr(m.cost)}</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">{m.why}</div>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] mt-1 gap-1">
                    <Zap className="h-3 w-3" /> {m.action}
                  </Button>
                </div>
              ))}
              {data.missedOpps.length === 0 && (
                <div className="text-xs text-muted-foreground">No missed opportunities tracked</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-rose-400" /> Churn early-warning
            </div>
            <div className="space-y-2">
              {data.churnRisk.map((c) => (
                <div key={c.client} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.client}</span>
                    <span
                      className={`font-semibold ${c.risk > 60 ? "text-rose-400" : c.risk > 40 ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {c.risk}%
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {c.product} · {c.reason}
                  </div>
                </div>
              ))}
              {data.churnRisk.length === 0 && (
                <div className="text-xs text-muted-foreground">No churn risk data yet</div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="weekly" className="mb-5">
          <TabsList>
            <TabsTrigger value="weekly">Weekly report</TabsTrigger>
            <TabsTrigger value="monthly">Monthly report</TabsTrigger>
            <TabsTrigger value="heatmap">Activity heatmap</TabsTrigger>
            <TabsTrigger value="forecast">Profit forecast</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-4">
            {data.revenueTrend && data.revenueTrend.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">Revenue (MTD)</div>
                  <div className="text-xl font-semibold mt-1">{inr(data.revenue.revenue)}</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">
                    {data.revenue.growth !== null
                      ? `${data.revenue.growth > 0 ? "+" : ""}${data.revenue.growth}%`
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">Deals closed</div>
                  <div className="text-xl font-semibold mt-1">—</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">Not tracked</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">New leads</div>
                  <div className="text-xl font-semibold mt-1">—</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">Not tracked</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">Cash collected</div>
                  <div className="text-xl font-semibold mt-1">—</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">Not tracked</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No weekly data available</div>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4 h-64">
              <MonthlyRevenueChart trend={data.revenueTrend} />
            </div>
          </TabsContent>
          <TabsContent value="heatmap" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Team activity — last 7 days × 24 hours
              </div>
              <div className="text-center py-8 text-muted-foreground">
                Heatmap requires activity tracking integration
              </div>
            </div>
          </TabsContent>
          <TabsContent value="forecast" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4 h-72">
              <ProfitForecastChart forecast={data.forecast} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              Estimates based on current data trends. Not a guarantee.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function computeBusinessScore(data: typeof AiInsights.prototype.data): number {
  if (!data) return 0;
  let score = 0;
  let factors = 0;

  // Revenue health (30%)
  if (data.revenue.growth !== null) {
    score += Math.min(100, Math.max(0, 50 + data.revenue.growth * 2)) * 0.3;
    factors += 0.3;
  }

  // Profit margin (25%)
  if (data.revenue.margin !== null) {
    score += Math.min(100, data.revenue.margin * 3.33) * 0.25;
    factors += 0.25;
  }

  // Health areas (25%)
  if (data.health.length > 0) {
    const avgHealth = data.health.reduce((s, h) => s + h.score, 0) / data.health.length;
    score += avgHealth * 0.25;
    factors += 0.25;
  }

  // Risk level (20%)
  const highRisks = data.risks.filter((r) => r.severity === "High").length;
  const riskScore = highRisks === 0 ? 100 : highRisks === 1 ? 70 : highRisks === 2 ? 40 : 10;
  score += riskScore * 0.2;
  factors += 0.2;

  return factors > 0 ? Math.round(score / factors) : 0;
}

function BigScore({ score }: { score: number }) {
  const data = [{ name: "score", value: score }];
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="h-24 w-24">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              fill="#3b82f6"
              cornerRadius={20}
              background={{ fill: "#27272a" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Business Score
        </div>
        <div className="text-3xl font-semibold">
          {score}
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  tone,
  hint,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "up" | "down";
  hint: string;
}) {
  const Icon = tone === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="flex items-center gap-1 mt-1 text-[11px]">
        <Icon className={`h-3 w-3 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`} />
        <span className={tone === "up" ? "text-emerald-400" : "text-rose-400"}>{delta}</span>
        <span className="text-muted-foreground">· {hint}</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded mb-2" />
      <div className="h-6 w-32 bg-muted rounded mb-1" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-3" />
      <div className="h-56 bg-muted rounded" />
    </div>
  );
}

function RevenueForecastChart({
  trend,
  forecast,
}: {
  trend: { month: string; revenue: number; target?: number; expenses?: number }[];
  forecast: { month: string; revenue: number; profit: number; best: number; worst: number }[];
}) {
  const chartData = [
    ...trend.map((r) => ({
      month: r.month,
      actual: r.revenue / 1000,
      forecast: null as number | null,
    })),
    ...forecast.map((f) => ({
      month: f.month,
      actual: null as number | null,
      forecast: f.revenue / 1000,
    })),
  ];

  return (
    <ResponsiveContainer>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} />
        <Tooltip
          contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#g1)"
          name="Actual (₹k)"
        />
        <Area
          type="monotone"
          dataKey="forecast"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#g2)"
          name="Forecast (₹k)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MonthlyRevenueChart({
  trend,
}: {
  trend: { month: string; revenue: number; target?: number; expenses?: number }[];
}) {
  if (!trend || trend.length === 0)
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>
    );

  return (
    <ResponsiveContainer>
      <BarChart data={trend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} />
        <Tooltip
          contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }}
        />
        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#f43f5e" name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProfitForecastChart({
  forecast,
}: {
  forecast: { month: string; revenue: number; profit: number; best: number; worst: number }[];
}) {
  if (!forecast || forecast.length === 0)
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No forecast data
      </div>
    );

  return (
    <ResponsiveContainer>
      <LineChart data={forecast}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} />
        <Tooltip
          contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="best"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} />
        <Line
          type="monotone"
          dataKey="worst"
          stroke="#f43f5e"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
        <Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
