import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { PRODUCTS_LIST, inr } from "@/lib/business-data";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="Operations" title="Products" description="MRR, users and churn across your SaaS portfolio." actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add product</Button>} />
        <div className="grid grid-cols-3 gap-4">
          {PRODUCTS_LIST.map((p) => (
            <div key={p.name} className="rounded-xl border border-border bg-card p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tier}</div>
              <div className="text-xl font-semibold mt-1">{p.name}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><div className="text-[10px] uppercase text-muted-foreground">MRR</div><div className="text-lg font-semibold text-primary">{inr(p.mrr)}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Users</div><div className="text-lg font-semibold">{p.users}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Churn</div><div className="text-lg font-semibold text-rose-400">{p.churn}%</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Growth</div><div className="text-lg font-semibold text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{p.delta}%</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});