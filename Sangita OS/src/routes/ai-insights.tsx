import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HEALTH, REVENUE_TREND } from "@/lib/mock";
import { AI_RECS, RISKS, MISSED_OPPS, CHURN_RISK, FORECAST_12M, HEATMAP, inr } from "@/lib/business-data";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, RadialBar, RadialBarChart, PolarAngleAxis, BarChart, Bar, LineChart, Line } from "recharts";
import { Sparkles, TrendingUp, AlertTriangle, Target, Brain, Flame, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/ai-insights")({
  head: () => ({ meta: [{ title: "AI Insights — Sangita OS" }, { name: "description", content: "Executive intelligence — health, forecasts, risk & recommendations." }] }),
  component: AiInsights,
});

function AiInsights() {
  const score = 84;
  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          eyebrow="AI Insights"
          title="Executive Intelligence"
          description="Business health, forecasts, and AI-drafted recommendations — updated as data flows in. All predictions are estimates from current trends."
          actions={<div className="flex gap-2"><Button size="sm" variant="outline" className="gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Weekly briefing</Button><Button size="sm" className="gap-2"><Brain className="h-3.5 w-3.5" /> Ask AI</Button></div>}
        />

        <div className="grid grid-cols-4 gap-3 mb-5">
          <BigScore score={score} />
          <Kpi label="Revenue (Aug)" value="₹3.78Cr" delta="+10.5%" tone="up" hint="vs Jul" />
          <Kpi label="Profit margin" value="28.4%" delta="+1.8pt" tone="up" hint="Target 30%" />
          <Kpi label="MRR" value="₹3.38L" delta="+14.2%" tone="up" hint="Compound growth" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Revenue trend & 12-month forecast</div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Estimate</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={[...REVENUE_TREND.map((r) => ({ month: r.month, actual: r.revenue / 1000, forecast: null as number | null })), ...FORECAST_12M.map((f) => ({ month: f.month, actual: null as number | null, forecast: f.revenue }))]}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#g1)" name="Actual (₹k)" />
                  <Area type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" fill="url(#g2)" name="Forecast (₹k)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Health by area</div>
            <div className="space-y-2">
              {HEALTH.map((h) => (
                <div key={h.area}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{h.area}</span><span className="font-semibold">{h.score}</span></div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${h.score}%` }} transition={{ duration: 0.8 }} className={`h-full ${h.score > 85 ? "bg-emerald-400" : h.score > 70 ? "bg-primary" : "bg-amber-400"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary"><Target className="h-4 w-4" /> Today's Focus</div>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-primary">01</span> Close Acme MSA — <span className="text-emerald-400 ml-auto">+₹8.4L</span></li>
              <li className="flex gap-2"><span className="text-primary">02</span> Ship checkout redesign <span className="text-emerald-400 ml-auto">+18% CVR</span></li>
              <li className="flex gap-2"><span className="text-primary">03</span> Follow up Nexora <span className="text-emerald-400 ml-auto">+₹3.2L</span></li>
              <li className="flex gap-2"><span className="text-primary">04</span> Review Q3 spend <span className="text-muted-foreground ml-auto">Efficiency</span></li>
            </ol>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI Recommendations</div>
            <div className="space-y-3">
              {AI_RECS.map((r) => (
                <div key={r.title} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">{r.impact}</span>
                      <span className="text-muted-foreground">{r.confidence}% conf.</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs">Apply</Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{r.why}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-400" /> Risk radar</div>
            <div className="space-y-2">
              {RISKS.map((r) => (
                <div key={r.title} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{r.title}</span><Badge variant="outline" className={`text-[10px] ${r.severity === "High" ? "border-rose-500/40 text-rose-300" : r.severity === "Medium" ? "border-amber-500/40 text-amber-300" : "border-slate-500/40 text-slate-300"}`}>{r.severity}</Badge></div>
                  <div className="text-muted-foreground mt-0.5">{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Flame className="h-4 w-4 text-rose-400" /> Missed opportunities</div>
            <div className="space-y-2">
              {MISSED_OPPS.map((m) => (
                <div key={m.title} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{m.title}</span><span className="text-rose-400 font-semibold">{inr(m.cost)}</span></div>
                  <div className="text-muted-foreground mt-0.5">{m.why}</div>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] mt-1 gap-1"><Zap className="h-3 w-3" /> {m.action}</Button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-rose-400" /> Churn early-warning</div>
            <div className="space-y-2">
              {CHURN_RISK.map((c) => (
                <div key={c.client} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{c.client}</span><span className={`font-semibold ${c.risk > 60 ? "text-rose-400" : c.risk > 40 ? "text-amber-400" : "text-emerald-400"}`}>{c.risk}%</span></div>
                  <div className="text-muted-foreground mt-0.5">{c.product} · {c.reason}</div>
                </div>
              ))}
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
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: "Revenue", v: "₹94.2L", d: "+18% WoW" }, { l: "Deals closed", v: "6", d: "+2 vs last wk" },
                { l: "New leads", v: "42", d: "+11 WoW" }, { l: "Cash collected", v: "₹78L", d: "3 overdue chased" },
              ].map((k) => <div key={k.l} className="rounded-xl border border-border bg-card p-4"><div className="text-[10px] uppercase text-muted-foreground">{k.l}</div><div className="text-xl font-semibold mt-1">{k.v}</div><div className="text-[11px] text-emerald-400 mt-0.5">{k.d}</div></div>)}
            </div>
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4 h-64">
              <ResponsiveContainer><BarChart data={REVENUE_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} /><Bar dataKey="expenses" fill="#f43f5e" name="Expenses" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="heatmap" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-2">Team activity — last 7 days × 24 hours</div>
              <div className="flex flex-col gap-1">
                {HEATMAP.map((row, d) => (
                  <div key={d} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-6">{["S","M","T","W","T","F","S"][d]}</span>
                    <div className="flex gap-0.5 flex-1">
                      {row.map((cell, h) => (
                        <div key={h} className="flex-1 h-4 rounded-sm" style={{ background: `rgba(37, 99, 235, ${cell.value / 120})` }} title={`${cell.value}`} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-0.5 pl-7 mt-1">{Array.from({length: 24}).map((_, h) => <span key={h} className="flex-1 text-[9px] text-center text-muted-foreground">{h % 3 === 0 ? h : ""}</span>)}</div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="forecast" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-4 h-72">
              <ResponsiveContainer><LineChart data={FORECAST_12M}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a", borderRadius: 8 }} /><Line type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" /><Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} /><Line type="monotone" dataKey="worst" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" /><Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} /></LineChart></ResponsiveContainer>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Estimates based on current growth trend (28% MoM). Not a guarantee.</div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BigScore({ score }: { score: number }) {
  const data = [{ name: "score", value: score }];
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="h-24 w-24">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" fill="#3b82f6" cornerRadius={20} background={{ fill: "#27272a" }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Business Score</div>
        <div className="text-3xl font-semibold">{score}<span className="text-sm text-muted-foreground">/100</span></div>
        <div className="text-[11px] text-emerald-400 mt-0.5">+3 pts this week</div>
      </div>
    </div>
  );
}
function Kpi({ label, value, delta, tone, hint }: { label: string; value: string; delta: string; tone: "up" | "down"; hint: string }) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepIcons = TrendingUp;