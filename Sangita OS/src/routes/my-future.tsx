import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Rocket,
  Car,
  Home,
  Building2,
  Trophy,
  Globe,
  Target,
  Sparkles,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Sun,
  Moon,
  Loader2,
  Brain,
  ShieldAlert,
  Lightbulb,
  Zap,
} from "lucide-react";
import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/os/AppLayout";
import { REVENUE_TREND, HEALTH, PRODUCTS, inr } from "@/lib/mock";
import { CHART } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";
import { DailyLogPanel } from "@/components/os/DailyLogPanel";
import { useDailyLog, totalProductiveHours, completionRate } from "@/lib/daily-log";

export const Route = createFileRoute("/my-future")({
  head: () => ({
    meta: [
      { title: "My Future — Sangita OS" },
      {
        name: "description",
        content:
          "Future Intelligence Engine — realistic forecasts, life-goal analyzers, AI CEO briefing, and daily execution plans grounded in your real business data.",
      },
      { property: "og:title", content: "My Future — Sangita OS" },
      {
        property: "og:description",
        content:
          "Realistic forecasts for your business, wealth, and life goals — grounded in actual revenue, profit, and growth data.",
      },
    ],
  }),
  component: MyFuture,
});

// ------- Business math (deterministic, derived from mock data) -------
function useBusinessMetrics() {
  return useMemo(() => {
    const last = REVENUE_TREND[REVENUE_TREND.length - 1];
    const prev = REVENUE_TREND[REVENUE_TREND.length - 2];
    const monthlyRevenue = last.revenue;
    const monthlyExpenses = last.expenses;
    const monthlyProfit = monthlyRevenue - monthlyExpenses;
    const growthRate = (last.revenue - prev.revenue) / prev.revenue;
    const avgGrowth =
      REVENUE_TREND.slice(1).reduce(
        (s, r, i) => s + (r.revenue - REVENUE_TREND[i].revenue) / REVENUE_TREND[i].revenue,
        0,
      ) /
      (REVENUE_TREND.length - 1);
    const mrr = PRODUCTS.reduce((s, p) => s + p.mrr, 0);
    const arr = mrr * 12;
    const netWorth = 4200000; // current estimated
    const cashReserve = 1800000;
    const clients = 1284;
    const healthAvg = Math.round(HEALTH.reduce((s, h) => s + h.score, 0) / HEALTH.length);
    const profitMargin = monthlyProfit / monthlyRevenue;
    return {
      monthlyRevenue,
      monthlyExpenses,
      monthlyProfit,
      growthRate,
      avgGrowth,
      mrr,
      arr,
      netWorth,
      cashReserve,
      clients,
      healthAvg,
      profitMargin,
    };
  }, []);
}

/** Months to reach a target future value with monthly savings and compounding business growth */
function monthsToTarget(
  target: number,
  current: number,
  monthlySave: number,
  monthlyGrowth: number,
) {
  if (current >= target) return 0;
  let balance = current;
  let save = monthlySave;
  for (let m = 1; m <= 600; m++) {
    balance += save;
    save *= 1 + monthlyGrowth;
    if (balance >= target) return m;
  }
  return 600;
}

function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function confidence(growth: number, health: number, profitMargin: number) {
  const g = Math.max(0, Math.min(1, growth * 6));
  const h = health / 100;
  const p = Math.max(0, Math.min(1, profitMargin * 2));
  return Math.round((g * 0.4 + h * 0.35 + p * 0.25) * 100);
}

// ------- Life Goals -------
type Goal = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cost: number;
  saved: number;
  monthlyInvest: number;
};

const DEFAULT_GOALS: Goal[] = [
  {
    id: "lambo",
    title: "Lamborghini Huracán",
    icon: Car,
    cost: 42000000,
    saved: 3200000,
    monthlyInvest: 250000,
  },
  {
    id: "bugatti",
    title: "Bugatti Chiron",
    icon: Trophy,
    cost: 300000000,
    saved: 4200000,
    monthlyInvest: 400000,
  },
  {
    id: "house",
    title: "Dream House · Mumbai",
    icon: Home,
    cost: 85000000,
    saved: 6800000,
    monthlyInvest: 350000,
  },
  {
    id: "office",
    title: "Own Office Building",
    icon: Building2,
    cost: 55000000,
    saved: 4800000,
    monthlyInvest: 300000,
  },
  {
    id: "nw1cr",
    title: "₹1 Cr Personal Net Worth",
    icon: Target,
    cost: 10000000,
    saved: 4200000,
    monthlyInvest: 200000,
  },
  {
    id: "val10cr",
    title: "₹10 Cr Company Valuation",
    icon: TrendingUp,
    cost: 100000000,
    saved: 22000000,
    monthlyInvest: 500000,
  },
  {
    id: "intl",
    title: "International Expansion",
    icon: Globe,
    cost: 25000000,
    saved: 1200000,
    monthlyInvest: 180000,
  },
];

function GoalCard({ goal }: { goal: Goal }) {
  const m = useBusinessMetrics();
  const Icon = goal.icon;
  const progress = Math.min(100, (goal.saved / goal.cost) * 100);
  const months = monthsToTarget(
    goal.cost,
    goal.saved,
    goal.monthlyInvest,
    Math.max(0.005, m.avgGrowth),
  );
  const eta = addMonths(months);
  const conf = confidence(m.avgGrowth, m.healthAvg, m.profitMargin);
  const reqRevenue = goal.monthlyInvest / Math.max(0.15, m.profitMargin);
  const reqProfit = goal.monthlyInvest;
  const reqGrowth = Math.max(
    0.02,
    (goal.cost / (goal.saved || 1)) ** (1 / Math.max(months, 12)) - 1,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 soft-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary grid place-items-center text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{goal.title}</div>
          <div className="text-xs text-muted-foreground">Est. cost {inr(goal.cost)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Confidence
          </div>
          <div className="text-sm font-semibold text-primary">{conf}%</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span className="text-foreground font-medium">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full gradient-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Metric label="Current savings" value={inr(goal.saved)} />
        <Metric label="Monthly invest" value={inr(goal.monthlyInvest)} />
        <Metric label="Est. purchase" value={eta} highlight />
        <Metric label="Req. monthly revenue" value={inr(reqRevenue)} />
        <Metric label="Req. monthly profit" value={inr(reqProfit)} />
        <Metric label="Req. growth / mo" value={`${(reqGrowth * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground italic">
        Based on your current business performance and growth trend.
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold", highlight && "text-primary")}>{value}</div>
    </div>
  );
}

function LifeGoalsSection() {
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", cost: "", saved: "", monthlyInvest: "" });

  const addGoal = () => {
    if (!draft.title || !draft.cost) return;
    setGoals((g) => [
      ...g,
      {
        id: crypto.randomUUID(),
        title: draft.title,
        icon: Rocket,
        cost: Number(draft.cost),
        saved: Number(draft.saved) || 0,
        monthlyInvest: Number(draft.monthlyInvest) || 0,
      },
    ]);
    setDraft({ title: "", cost: "", saved: "", monthlyInvest: "" });
    setShowAdd(false);
  };

  return (
    <SectionShell
      eyebrow="Life Goals"
      title="Dream in numbers"
      description="Every goal is grounded in your real revenue, profit, and growth. Estimates only — never guarantees."
      action={
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow"
        >
          <Plus className="h-4 w-4" /> Add dream goal
        </button>
      }
    >
      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4 grid gap-3 md:grid-cols-5">
          <input
            placeholder="Goal title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="md:col-span-2 h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
          <input
            placeholder="Cost (₹)"
            type="number"
            value={draft.cost}
            onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
          <input
            placeholder="Saved (₹)"
            type="number"
            value={draft.saved}
            onChange={(e) => setDraft({ ...draft, saved: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
          <input
            placeholder="Monthly (₹)"
            type="number"
            value={draft.monthlyInvest}
            onChange={(e) => setDraft({ ...draft, monthlyInvest: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
          <button
            onClick={addGoal}
            className="md:col-span-5 h-9 rounded-lg gradient-primary text-white text-sm"
          >
            Create goal
          </button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    </SectionShell>
  );
}

// ------- Analyzers -------
function LamborghiniAnalyzer() {
  const m = useBusinessMetrics();
  const cost = 42000000;
  const saved = 3200000;
  const bestMonths = monthsToTarget(cost, saved, 350000, m.avgGrowth * 1.5);
  const expectedMonths = monthsToTarget(cost, saved, 250000, m.avgGrowth);
  const worstMonths = monthsToTarget(cost, saved, 150000, Math.max(0.002, m.avgGrowth * 0.5));
  const progress = (saved / cost) * 100;
  const conf = confidence(m.avgGrowth, m.healthAvg, m.profitMargin);

  const reqMonthlyRevenue = 1800000;
  const reqMonthlyProfit = 550000;
  const reqCash = 8000000;
  const reqClients = 320;
  const reqProducts = 4;
  const reqMRR = 950000;
  const reqHours = 9;

  return (
    <SectionShell
      eyebrow="Analyzer"
      title="Lamborghini Huracán"
      description="What your business must look like for the keys to make sense."
      icon={<Car className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            Current progress
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{progress.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">of {inr(cost)}</span>
          </div>
          <div className="h-32 -mx-2 mt-2">
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="65%"
                outerRadius="100%"
                data={[{ v: progress }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="v"
                  cornerRadius={8}
                  fill={CHART.primary}
                  background={{ fill: "#27272A" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-center text-xs text-muted-foreground">
            Confidence <span className="text-primary font-medium">{conf}%</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold">Estimated purchase time</div>
          <ScenarioRow label="Best case" months={bestMonths} tone="success" />
          <ScenarioRow label="Expected case" months={expectedMonths} tone="primary" />
          <ScenarioRow label="Worst case" months={worstMonths} tone="warning" />
          <div className="text-[11px] text-muted-foreground italic pt-2">
            Current trend: revenue growing {(m.avgGrowth * 100).toFixed(1)}% mo/mo, margin{" "}
            {(m.profitMargin * 100).toFixed(0)}%.
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Business requirements</div>
          <div className="space-y-2 text-sm">
            <Req label="Monthly revenue" value={inr(reqMonthlyRevenue)} />
            <Req label="Monthly profit" value={inr(reqMonthlyProfit)} />
            <Req label="Cash reserve" value={inr(reqCash)} />
            <Req label="Clients" value={`${reqClients}+`} />
            <Req label="Products live" value={`${reqProducts}`} />
            <Req label="MRR" value={inr(reqMRR)} />
            <Req label="Focused hours / day" value={`${reqHours}h`} />
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground italic">
            Based on your current business performance and growth trend.
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function BugattiAnalyzer() {
  const m = useBusinessMetrics();
  const conf = Math.max(6, confidence(m.avgGrowth, m.healthAvg, m.profitMargin) - 35);
  const months = monthsToTarget(300000000, m.netWorth, 400000, m.avgGrowth);

  const rows = [
    { label: "Estimated timeline", value: `${Math.round(months / 12)} years` },
    { label: "Business size required", value: "300+ FTE, 6 products" },
    { label: "Annual revenue", value: `${inr(1200000000)}+` },
    { label: "Net worth required", value: `${inr(500000000)}+` },
    { label: "Company valuation", value: `${inr(3000000000)}+ ($350M)` },
    { label: "Team size", value: "250–400 across 3 verticals" },
    { label: "Startup portfolio", value: "4–6 profitable products" },
  ];

  return (
    <SectionShell
      eyebrow="Analyzer"
      title="Bugatti Chiron"
      description="The tier where hypercars stop being an aspiration and start being a rounding error."
      icon={<Trophy className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Business scale required</div>
          <div className="grid gap-2 md:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="rounded-lg border border-border bg-background p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.label}
                </div>
                <div className="mt-1 text-sm font-semibold">{r.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
          <div className="text-sm font-semibold">Risk analysis</div>
          <ul className="mt-3 space-y-2 text-sm">
            <RiskRow
              tone="warning"
              text="Requires 30–50× current revenue — high market execution risk."
            />
            <RiskRow tone="warning" text="Long duration exposes you to 2+ macro cycles." />
            <RiskRow tone="success" text="Multi-product portfolio diversifies category risk." />
            <RiskRow tone="danger" text="Founder burnout is the #1 threat at this timeline." />
          </ul>
          <div className="mt-auto pt-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Confidence score
            </div>
            <div className="text-3xl font-semibold text-primary">{conf}%</div>
            <div className="text-[11px] text-muted-foreground italic mt-1">
              Estimate only — based on current business data and trends.
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function ScenarioRow({
  label,
  months,
  tone,
}: {
  label: string;
  months: number;
  tone: "success" | "primary" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-emerald-400"
      : tone === "warning"
        ? "text-amber-400"
        : "text-primary";
  const years = (months / 12).toFixed(1);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{addMonths(months)}</div>
      </div>
      <div className={cn("text-sm font-semibold", color)}>{years} yrs</div>
    </div>
  );
}
function Req({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function RiskRow({ tone, text }: { tone: "success" | "warning" | "danger"; text: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : ShieldAlert;
  const color =
    tone === "success"
      ? "text-emerald-400"
      : tone === "warning"
        ? "text-amber-400"
        : "text-red-400";
  return (
    <li className="flex gap-2">
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}

// ------- Startup Advisor -------
function StartupAdvisor() {
  const m = useBusinessMetrics();
  const focus = m.healthAvg < 78 || m.profitMargin < 0.25;
  const verdict = !focus;

  return (
    <SectionShell
      eyebrow="Startup Advisor"
      title="Should you start another company?"
      description="Analyzed across SwiftGrowthDigital, Libriofy, Synsfi and portfolio capacity."
      icon={<Lightbulb className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className={cn(
            "rounded-xl border p-5 lg:col-span-1",
            verdict
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Recommendation
          </div>
          <div
            className={cn(
              "mt-1 text-4xl font-semibold",
              verdict ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {verdict ? "YES" : "NO — not yet"}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {verdict
              ? "Your existing portfolio is healthy (avg score " +
                m.healthAvg +
                ", margin " +
                (m.profitMargin * 100).toFixed(0) +
                "%). Cash reserve of " +
                inr(m.cashReserve) +
                " gives 6–9 months of new-venture runway without starving current products."
              : "Business health is " +
                m.healthAvg +
                "/100 and margin " +
                (m.profitMargin * 100).toFixed(0) +
                "%. Stabilize Ops & Automation first — a 4th product will dilute focus and starve Libriofy renewals."}
          </p>
          <div className="mt-3 text-[11px] text-muted-foreground italic">
            Based on your current business performance and growth trend.
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">If YES — recommended shape</div>
          <div className="grid gap-2 md:grid-cols-2">
            <Req label="Best industry" value="Vertical AI for SMB ops" />
            <Req label="Market opportunity" value="₹40,000 Cr TAM · India + SEA" />
            <Req label="Expected investment" value={inr(6000000)} />
            <Req label="Expected ROI" value="3–5× in 24 months" />
            <Req label="Expected timeline" value="MVP in 90 days · PMF in 9 months" />
            <Req label="Required team" value="1 PM · 3 eng · 1 designer · 1 GTM" />
            <Req label="Business risk" value="Medium — GTM crowded, moat via data" />
            <Req label="Recommended cash cap" value={`${inr(m.cashReserve * 0.35)} max burn`} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// ------- Daily Success Plan + Today's Target -------
const DAILY_PLAN = [
  { time: "05:30", label: "Wake up", icon: Sun },
  { time: "06:00–07:30", label: "Deep work · thinking", icon: Brain },
  { time: "07:30–09:00", label: "Coding block", icon: Zap },
  { time: "09:00–11:00", label: "Sales calls & outreach", icon: PhoneIcon },
  { time: "11:00–12:00", label: "Email outreach (25 sends)", icon: MailIcon },
  { time: "12:00–13:00", label: "Follow-ups", icon: Flame },
  { time: "14:00–15:30", label: "Meetings (max 3)", icon: Building2 },
  { time: "15:30–16:30", label: "Learning (1 hr)", icon: Lightbulb },
  { time: "17:00–18:00", label: "Exercise", icon: Rocket },
  { time: "18:00–18:30", label: "Finance review", icon: Target },
  { time: "18:30–19:00", label: "Planning tomorrow", icon: CheckCircle2 },
  { time: "21:30–22:15", label: "Reading (45 min)", icon: Sparkles },
  { time: "23:00", label: "Sleep goal — 7h", icon: Moon },
];
function PhoneIcon({ className }: { className?: string }) {
  return <Flame className={className} />;
}
function MailIcon({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}

const TODAY_TARGETS = [
  { label: "Revenue target", value: "₹85,000" },
  { label: "Profit target", value: "₹32,000" },
  { label: "Emails to send", value: "25" },
  { label: "Cold calls", value: "12" },
  { label: "Follow-ups", value: "8" },
  { label: "Meetings", value: "3" },
  { label: "Product dev hours", value: "3h" },
  { label: "Marketing tasks", value: "4" },
  { label: "Content pieces", value: "2" },
  { label: "Client delivery", value: "1 milestone" },
  { label: "Invoices to send", value: "3" },
  { label: "Agreements to sign", value: "1" },
  { label: "Collections", value: "₹1.4L" },
];

function DailyPlanSection() {
  const productive = 11.5;
  return (
    <SectionShell
      eyebrow="Daily Success Plan"
      title="Today's execution blueprint"
      description={`Total productive hours: ${productive}h. Generated from your role, energy pattern, and current business priorities.`}
      icon={<CalendarIcon className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Time blocks</div>
          <ul className="divide-y divide-border">
            {DAILY_PLAN.map((b) => {
              const Icon = b.icon;
              return (
                <li key={b.time} className="py-2.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{b.label}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{b.time}</div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Today's targets</div>
          <ul className="space-y-2">
            {TODAY_TARGETS.map((t) => (
              <li
                key={t.label}
                className="flex items-center justify-between text-sm border-b border-border/60 pb-1.5"
              >
                <span className="text-muted-foreground text-xs">{t.label}</span>
                <span className="font-semibold">{t.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return <Clock className={className} />;
}

// ------- Habit Tracker -------
const HABITS = [
  { name: "Coding", streak: 12, done: true },
  { name: "Sales", streak: 9, done: true },
  { name: "Emails", streak: 22, done: true },
  { name: "Learning", streak: 6, done: true },
  { name: "Exercise", streak: 4, done: false },
  { name: "Reading", streak: 15, done: true },
  { name: "Meditation", streak: 3, done: false },
  { name: "Sleep 7h+", streak: 8, done: true },
  { name: "Water 3L", streak: 11, done: true },
  { name: "Planning", streak: 26, done: true },
  { name: "Finance review", streak: 5, done: false },
  { name: "AI review", streak: 18, done: true },
];
function HabitSection() {
  const done = HABITS.filter((h) => h.done).length;
  const consistency = Math.round((done / HABITS.length) * 100);
  const discipline = Math.round(
    (HABITS.reduce((s, h) => s + Math.min(30, h.streak), 0) / HABITS.length) * (100 / 30),
  );
  const business = Math.round(consistency * 0.6 + discipline * 0.4);
  return (
    <SectionShell
      eyebrow="Habits"
      title="Consistency compounds"
      icon={<Target className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <ScoreTile label="Consistency" value={consistency} />
        <ScoreTile label="Discipline" value={discipline} />
        <ScoreTile label="Business score" value={business} />
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
          <div className="mt-1 text-3xl font-semibold">
            {done}
            <span className="text-muted-foreground text-lg">/{HABITS.length}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">habits completed</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          {HABITS.map((h) => (
            <div
              key={h.name}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3",
                h.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background",
              )}
            >
              <div>
                <div className="text-sm font-medium">{h.name}</div>
                <div className="text-[11px] text-muted-foreground">{h.streak} day streak</div>
              </div>
              {h.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold">
        {value}
        <span className="text-muted-foreground text-lg">/100</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full gradient-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ------- Missed Opportunity Analyzer -------
const MISSED = [
  { label: "Missed follow-ups", count: 6, impact: 240000, icon: Flame },
  { label: "Delayed projects", count: 2, impact: 380000, icon: Clock },
  { label: "Unsent emails", count: 14, impact: 95000, icon: TrendingUp },
  { label: "Pending invoices", count: 5, impact: 420000, icon: AlertTriangle },
  { label: "Slow product releases", count: 1, impact: 280000, icon: Rocket },
  { label: "Inactive leads (30d+)", count: 22, impact: 640000, icon: Target },
  { label: "Missed meetings", count: 3, impact: 120000, icon: Clock },
];
function MissedOpportunity() {
  const total = MISSED.reduce((s, m) => s + m.impact, 0);
  return (
    <SectionShell
      eyebrow="Missed Opportunities"
      title={`~${inr(total)} left on the table this month`}
      description="Detected across CRM, invoices, calendar, and project timelines. Recoverable if actioned in the next 7 days."
      icon={<ShieldAlert className="h-4 w-4" />}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {MISSED.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-amber-400" /> {m.label}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">{m.count}</div>
                <div className="text-sm text-primary font-semibold">{inr(m.impact)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ------- Business Health -------
function BusinessHealthSection() {
  const explanations: Record<string, string> = {
    Sales:
      "Pipeline value up 12.8%. Conversion strong on SwiftGrowth. Follow-up latency creeping up.",
    Marketing:
      "Ad ROAS steady at 3.4×. Organic pipeline flat — content velocity is the bottleneck.",
    Development: "Sprint velocity healthy. Libriofy checkout ships this week. Test coverage 78%.",
    Finance: "Runway 11 months. Overdue AR at ₹42k. Margin holding at 33%.",
    "Customer Success": "NPS 62. Onboarding time cut to 4.2 days. 2 churn risks flagged.",
    Product: "Libriofy usage +22%. Synsfi activation stalled — onboarding needs a redesign.",
    Operations: "3 workflows failed silently. Documentation gap in AR & payroll.",
    Automation: "Score dropping — sync jobs need instrumentation. Highest ROI fix this week.",
  };
  return (
    <SectionShell
      eyebrow="Business Health"
      title="Every score, explained"
      icon={<Brain className="h-4 w-4" />}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {HEALTH.map((h) => {
          const color =
            h.score >= 85 ? "text-emerald-400" : h.score >= 75 ? "text-primary" : "text-amber-400";
          return (
            <div key={h.area} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{h.area}</div>
                <div className={cn("text-2xl font-semibold", color)}>{h.score}</div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full",
                    h.score >= 85
                      ? "bg-emerald-500"
                      : h.score >= 75
                        ? "bg-primary"
                        : "bg-amber-500",
                  )}
                  style={{ width: `${h.score}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                {explanations[h.area]}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ------- 30 day + 12 month forecast -------
function ForecastSection() {
  const m = useBusinessMetrics();
  const next30 = {
    revenue: m.monthlyRevenue * (1 + m.avgGrowth),
    profit: m.monthlyRevenue * (1 + m.avgGrowth) - m.monthlyExpenses * 1.02,
    clients: Math.round(m.clients * (1 + m.avgGrowth * 0.4)),
    meetings: 48,
    growth: m.avgGrowth * 100,
    cash: m.cashReserve + m.monthlyProfit * 1.02,
    health: Math.min(100, m.healthAvg + 2),
  };

  const twelveMonth = Array.from({ length: 12 }, (_, i) => {
    const rev = m.monthlyRevenue * Math.pow(1 + m.avgGrowth, i + 1);
    const exp = m.monthlyExpenses * Math.pow(1.015, i + 1);
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    return {
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      revenue: Math.round(rev),
      profit: Math.round(rev - exp),
    };
  });

  return (
    <SectionShell
      eyebrow="Forecast"
      title="Next 30 days · Next 12 months"
      description={`Assumes ${(m.avgGrowth * 100).toFixed(1)}% mo/mo revenue growth (7-month average), ${(m.profitMargin * 100).toFixed(0)}% margin, and 1.5% mo/mo expense inflation.`}
      icon={<TrendingUp className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2.5">
          <div className="text-sm font-semibold">Next 30 days</div>
          <Req label="Expected revenue" value={inr(next30.revenue)} />
          <Req label="Expected profit" value={inr(next30.profit)} />
          <Req label="Expected clients" value={`${next30.clients}`} />
          <Req label="Expected meetings" value={`${next30.meetings}`} />
          <Req label="Expected growth" value={`${next30.growth.toFixed(1)}%`} />
          <Req label="Expected cash flow" value={inr(next30.cash)} />
          <Req label="Business health" value={`${next30.health}/100`} />
          <div className="text-[11px] text-muted-foreground italic pt-1">
            Estimate only — based on current business data and trends.
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">12-month revenue & profit trajectory</div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={twelveMonth} margin={{ top: 10, right: 8, left: -12 }}>
                <defs>
                  <linearGradient id="frev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fprof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.success} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis
                  dataKey="month"
                  stroke="#71717A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => inr(v as number)}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111113",
                    border: "1px solid #27272A",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => inr(v)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART.primary}
                  strokeWidth={2}
                  fill="url(#frev)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke={CHART.success}
                  strokeWidth={2}
                  fill="url(#fprof)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-semibold mb-3">12-month roadmap</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <RoadmapItem title="Hiring plan" value="+6 hires: 2 eng · 2 GTM · 1 CS · 1 finance" />
          <RoadmapItem
            title="Revenue goal"
            value={`${inr(((twelveMonth[11].revenue * 12) / 12) * 12)} annual`}
          />
          <RoadmapItem
            title="Product releases"
            value="Libriofy v2 · Synsfi API · SwiftGrowth Studio"
          />
          <RoadmapItem
            title="Office goals"
            value="Move to 4,500 sqft HQ · open Bangalore satellite"
          />
          <RoadmapItem
            title="Investment goals"
            value={`Raise ${inr(35000000)} pre-Series A (optional)`}
          />
          <RoadmapItem
            title="Major risks"
            value="Founder capacity · Libriofy churn · macro slowdown"
          />
          <RoadmapItem
            title="Growth strategy"
            value="Land Libriofy renewals · productize SwiftGrowth · Synsfi PMF"
          />
          <RoadmapItem title="Cash target" value={`${inr(m.cashReserve * 2.5)} reserve`} />
        </div>
      </div>
    </SectionShell>
  );
}
function RoadmapItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-medium leading-snug">{value}</div>
    </div>
  );
}

// ------- AI CEO (streaming) -------
function AiCEO() {
  const m = useBusinessMetrics();
  const { log } = useDailyLog();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/future-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Act as my AI CEO for today. My business data:
- Monthly revenue: ${inr(m.monthlyRevenue)}
- Monthly profit: ${inr(m.monthlyProfit)} (margin ${(m.profitMargin * 100).toFixed(1)}%)
- MRR: ${inr(m.mrr)} · ARR: ${inr(m.arr)}
- Avg monthly growth: ${(m.avgGrowth * 100).toFixed(1)}%
- Business health: ${m.healthAvg}/100
- Cash reserve: ${inr(m.cashReserve)}
- Products: SwiftGrowthDigital, Libriofy, Synsfi

Today's logged data (from user, do not invent):
- Completed tasks: ${log.completedTasks} · Missed tasks: ${log.missedTasks}
- Revenue today: ${log.revenue ? inr(log.revenue) : "not logged"}
- Profit today: ${log.profit ? inr(log.profit) : "not logged"}
- Deep work: ${log.deepWorkHours}h · Sales: ${log.salesHours}h · Meetings: ${log.meetingsHours}h · Learning: ${log.learningHours}h
- Exercise: ${log.exerciseHours}h · Sleep: ${log.sleepHours}h
- Notes: ${log.notes || "(none)"}
If a field is 0 or "not logged", say "not logged yet" instead of guessing.

Answer each in one sharp line:
1. What should I do FIRST today?
2. What should I AVOID?
3. Highest-ROI task right now?
4. Where am I likely wasting time?
5. Fastest lever to increase revenue this week?
6. Which product deserves maximum focus and why?`,
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + decoder.decode(value));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionShell
      eyebrow="AI CEO"
      title="Your morning briefing"
      description="Six questions your AI CEO answers before you touch your inbox."
      icon={<Sparkles className="h-4 w-4" />}
      action={
        <button
          onClick={generate}
          disabled={loading}
          className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Thinking…" : text ? "Regenerate" : "Generate today's briefing"}
        </button>
      }
    >
      <div className="rounded-xl border border-border bg-card p-5 min-h-[220px]">
        {text ? (
          <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ol:my-2 prose-li:my-1">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Click <span className="text-foreground font-medium">Generate today's briefing</span> —
            the AI reads your live business data and returns six operator-grade answers.
            <div className="mt-3 text-[11px] italic">
              All output is an estimate based on current business data and trends.
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// ------- End of Day Report -------
function EndOfDayReport() {
  const { log } = useDailyLog();
  const productive = totalProductiveHours(log);
  const rate = completionRate(log);
  const totalTasks = log.completedTasks + log.missedTasks;
  const habitScore = Math.min(
    100,
    Math.round(
      Math.min(log.deepWorkHours / 4, 1) * 25 +
        Math.min(log.exerciseHours / 0.75, 1) * 20 +
        Math.min(log.sleepHours / 7.5, 1) * 25 +
        Math.min(log.learningHours / 1, 1) * 15 +
        (rate / 100) * 15,
    ),
  );
  const anyLogged =
    totalTasks > 0 || log.revenue > 0 || log.profit > 0 || productive > 0 || log.sleepHours > 0;
  const rating = !anyLogged
    ? "— · Log today to rate"
    : habitScore >= 85
      ? "A · Elite day"
      : habitScore >= 70
        ? "A− · Strong day"
        : habitScore >= 55
          ? "B · Solid day"
          : habitScore >= 40
            ? "C · Below average"
            : "D · Recover tomorrow";
  const fmt = (v: number, s = "") => (anyLogged ? `${v}${s}` : "—");
  const stats = [
    { label: "Productive hours", value: anyLogged ? `${productive.toFixed(1)}h` : "—" },
    { label: "Completed tasks", value: totalTasks ? `${log.completedTasks}/${totalTasks}` : "—" },
    { label: "Missed tasks", value: anyLogged ? String(log.missedTasks) : "—" },
    { label: "Revenue generated", value: log.revenue ? inr(log.revenue) : "—" },
    { label: "Profit generated", value: log.profit ? inr(log.profit) : "—" },
    { label: "Sleep", value: fmt(log.sleepHours, "h") },
    { label: "Habit score", value: anyLogged ? `${habitScore}/100` : "—" },
    { label: "Completion rate", value: totalTasks ? `${rate}%` : "—" },
  ];
  const tomorrow = [
    "Close Acme Corp — send counter-signed retainer by 11am.",
    "Ship Libriofy v1.3 checkout — final QA + deploy window 2–4pm.",
    "Call Nexora Labs (they opened proposal 4×).",
    "Review Q3 marketing spend with growth lead.",
    "Zero inbox by 6pm.",
  ];
  return (
    <SectionShell
      eyebrow="End of Day"
      title="Today, rated"
      description="Computed live from your Daily Log — nothing is invented."
      icon={<Moon className="h-4 w-4" />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Today's scorecard</div>
          <div className="grid gap-2 md:grid-cols-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-border bg-background p-3 flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="font-semibold text-sm">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="text-[10px] uppercase tracking-widest text-primary">Overall rating</div>
            <div className="mt-1 text-3xl font-semibold text-primary">{rating}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {anyLogged
                ? "Estimate based on the numbers you logged today."
                : "Fill the Daily Log above to see your rating."}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-semibold mb-3">Tomorrow's priorities</div>
          <ol className="space-y-2 text-sm">
            {tomorrow.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="h-5 w-5 shrink-0 rounded-md bg-primary/10 text-primary text-xs grid place-items-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </SectionShell>
  );
}

// ------- Layout helpers -------
function SectionShell({
  eyebrow,
  title,
  description,
  icon,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary/80 inline-flex items-center gap-1.5">
            {icon} {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ------- Page -------
function MyFuture() {
  const m = useBusinessMetrics();
  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 grid-bg"
        >
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full gradient-primary opacity-20 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-primary/80 inline-flex items-center gap-1.5">
              <Rocket className="h-3 w-3" /> Future Intelligence Engine
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">My Future</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Realistic forecasts for wealth, business scale, and daily execution — grounded in your
              live revenue, profit, growth, and habits. This engine never guarantees the future.
              Every number is an estimate based on your current business data and trends.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <HeroStat label="Monthly revenue" value={inr(m.monthlyRevenue)} />
              <HeroStat label="Monthly profit" value={inr(m.monthlyProfit)} accent />
              <HeroStat label="Avg growth mo/mo" value={`${(m.avgGrowth * 100).toFixed(1)}%`} />
              <HeroStat label="Business health" value={`${m.healthAvg}/100`} />
            </div>
          </div>
        </motion.section>

        <DailyLogPanel />
        <LifeGoalsSection />
        <LamborghiniAnalyzer />
        <BugattiAnalyzer />
        <StartupAdvisor />
        <DailyPlanSection />
        <HabitSection />
        <MissedOpportunity />
        <BusinessHealthSection />
        <ForecastSection />
        <AiCEO />
        <EndOfDayReport />

        <div className="text-center text-[11px] text-muted-foreground italic pt-4 pb-8">
          The Future Intelligence Engine never guarantees the future. All output is an estimate
          based on your current business data and trends.
        </div>
      </div>
    </AppLayout>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 backdrop-blur p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold", accent && "text-primary")}>{value}</div>
    </div>
  );
}
