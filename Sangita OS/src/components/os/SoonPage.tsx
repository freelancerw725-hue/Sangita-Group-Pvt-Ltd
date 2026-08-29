import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { useOS } from "./os-store";

export function SoonPage({
  title, eyebrow, description, features, icon,
}: {
  title: string; eyebrow?: string; description: string; features: string[]; icon?: ReactNode;
}) {
  const { openAI } = useOS();
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        eyebrow={eyebrow ?? "Sangita OS Module"}
        title={title}
        description={description}
        actions={
          <button
            onClick={openAI}
            className="h-9 px-3 rounded-lg gradient-primary text-white text-sm inline-flex items-center gap-2 soft-shadow"
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask AI about this
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="mt-3 text-sm font-medium">{f}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-6 grid-bg">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span className="uppercase tracking-widest">In development</span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground max-w-2xl">
          This module is wired into Sangita OS and will light up as data flows in. Meanwhile, ask AI to draft, forecast, or analyze anything with ⌘/.
        </div>
      </div>
    </div>
  );
}