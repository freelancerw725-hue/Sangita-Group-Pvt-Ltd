import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck, CheckCircle2, XCircle, IndianRupee, TrendingUp,
  Brain, Phone, Users, BookOpen, Dumbbell, Moon, RotateCcw, Check,
} from "lucide-react";
import {
  useDailyLog, totalProductiveHours, completionRate, type DailyLog,
} from "@/lib/daily-log";
import { inr } from "@/lib/mock";
import { cn } from "@/lib/utils";

type FieldKey = keyof Omit<DailyLog, "date" | "notes">;

type Field = {
  key: FieldKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  step: number;
  suffix?: string;
  format?: (n: number) => string;
  group: "tasks" | "money" | "hours";
};

const FIELDS: Field[] = [
  { key: "completedTasks", label: "Completed tasks", icon: CheckCircle2, step: 1, group: "tasks" },
  { key: "missedTasks", label: "Missed tasks", icon: XCircle, step: 1, group: "tasks" },
  { key: "revenue", label: "Revenue", icon: IndianRupee, step: 5000, group: "money", format: inr },
  { key: "profit", label: "Profit", icon: TrendingUp, step: 5000, group: "money", format: inr },
  { key: "deepWorkHours", label: "Deep work", icon: Brain, step: 0.5, suffix: "h", group: "hours" },
  { key: "salesHours", label: "Sales", icon: Phone, step: 0.5, suffix: "h", group: "hours" },
  { key: "meetingsHours", label: "Meetings", icon: Users, step: 0.5, suffix: "h", group: "hours" },
  { key: "learningHours", label: "Learning", icon: BookOpen, step: 0.5, suffix: "h", group: "hours" },
  { key: "exerciseHours", label: "Exercise", icon: Dumbbell, step: 0.25, suffix: "h", group: "hours" },
  { key: "sleepHours", label: "Sleep", icon: Moon, step: 0.5, suffix: "h", group: "hours" },
];

export function DailyLogPanel({ onChange }: { onChange?: (log: DailyLog) => void }) {
  const { log, history, update, reset, hydrated } = useDailyLog();

  useMemo(() => { onChange?.(log); }, [log, onChange]);

  const productive = totalProductiveHours(log);
  const rate = completionRate(log);
  const filled = FIELDS.filter((f) => (log[f.key] as number) > 0).length;
  const completeness = Math.round((filled / FIELDS.length) * 100);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary/80 inline-flex items-center gap-1.5">
            <ClipboardCheck className="h-3 w-3" /> Daily Log
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Log today so the AI never guesses</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Enter what actually happened. Every AI briefing, forecast, and end-of-day rating below reads directly from this.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Log completeness</span>{" "}
            <span className="font-semibold text-foreground">{completeness}%</span>
          </div>
          <button
            onClick={reset}
            className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs inline-flex items-center gap-1.5 hover:bg-background transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset today
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Completion" value={`${rate}%`} sub={`${log.completedTasks} done · ${log.missedTasks} missed`} />
          <Summary label="Revenue today" value={log.revenue ? inr(log.revenue) : "—"} sub={log.profit ? `${inr(log.profit)} profit` : "add profit"} accent />
          <Summary label="Productive hours" value={`${productive.toFixed(1)}h`} sub="deep work + sales + meetings + learning" />
          <Summary label="Sleep" value={log.sleepHours ? `${log.sleepHours}h` : "—"} sub={log.exerciseHours ? `${log.exerciseHours}h exercise` : "log exercise"} />
        </div>

        <FieldGrid title="Tasks" fields={FIELDS.filter((f) => f.group === "tasks")} log={log} update={update} />
        <FieldGrid title="Money (INR)" fields={FIELDS.filter((f) => f.group === "money")} log={log} update={update} />
        <FieldGrid title="Hours" fields={FIELDS.filter((f) => f.group === "hours")} log={log} update={update} />

        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
          <textarea
            value={log.notes ?? ""}
            onChange={(e) => update({ notes: e.target.value })}
            rows={2}
            placeholder="Wins, blockers, one lesson…"
            className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary/60 transition"
          />
        </div>

        {hydrated && history.length > 1 && (
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Last 7 days</div>
            <div className="flex gap-2 overflow-x-auto">
              {history.map((h) => {
                const isToday = h.date === log.date;
                return (
                  <div
                    key={h.date}
                    className={cn(
                      "shrink-0 rounded-lg border px-3 py-2 text-xs min-w-[130px]",
                      isToday ? "border-primary/60 bg-primary/10" : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatShort(h.date)}</span>
                      {isToday && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {h.revenue ? inr(h.revenue) : "—"} · {completionRate(h)}%
                    </div>
                    <div className="text-muted-foreground">{totalProductiveHours(h).toFixed(1)}h focus</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-[11px] italic text-muted-foreground">
          Saved locally on this device. AI outputs below refresh with your log — no invented numbers.
        </div>
      </motion.div>
    </section>
  );
}

function FieldGrid({
  title, fields, log, update,
}: {
  title: string; fields: Field[]; log: DailyLog;
  update: (p: Partial<DailyLog>) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <Stepper key={f.key} field={f} value={log[f.key] as number} onChange={(v) => update({ [f.key]: v })} />
        ))}
      </div>
    </div>
  );
}

function Stepper({
  field, value, onChange,
}: { field: Field; value: number; onChange: (v: number) => void }) {
  const Icon = field.icon;
  const display = field.format
    ? value ? field.format(value) : "0"
    : `${value}${field.suffix ?? ""}`;
  const dec = () => onChange(Math.max(0, Number((value - field.step).toFixed(2))));
  const inc = () => onChange(Number((value + field.step).toFixed(2)));
  return (
    <div className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground truncate">{field.label}</div>
        <input
          type="number"
          step={field.step}
          min={0}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={inc}
          className="h-4 w-6 rounded border border-border text-[10px] leading-none hover:bg-card"
          aria-label={`Increase ${field.label}`}
        >+</button>
        <button
          onClick={dec}
          className="h-4 w-6 rounded border border-border text-[10px] leading-none hover:bg-card"
          aria-label={`Decrease ${field.label}`}
        >−</button>
      </div>
      {field.format && value > 0 && (
        <div className="text-[10px] text-muted-foreground tabular-nums">{display}</div>
      )}
    </div>
  );
}

function Summary({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold", accent && "text-primary")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function formatShort(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}