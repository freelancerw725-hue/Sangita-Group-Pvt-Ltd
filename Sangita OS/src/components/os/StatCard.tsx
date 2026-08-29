import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, hint, icon,
}: {
  label: string; value: string; delta?: number; hint?: string; icon?: ReactNode;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 soft-shadow"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {typeof delta === "number" && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md",
            positive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10",
          )}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}