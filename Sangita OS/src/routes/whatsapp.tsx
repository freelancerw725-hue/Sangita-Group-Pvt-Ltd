import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { WHATSAPP_TEMPLATES } from "@/lib/business-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader eyebrow="Revenue" title="WhatsApp" description="Approved templates, broadcasts and conversation analytics." actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New template</Button>} />
        <div className="grid grid-cols-2 gap-4">
          {WHATSAPP_TEMPLATES.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-400" /><span className="text-sm font-medium">{t.name}</span></div><Badge variant="outline" className="text-[10px]">{t.category}</Badge></div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs"><div><div className="text-muted-foreground text-[10px] uppercase">Uses</div><div className="text-lg font-semibold">{t.uses}</div></div><div><div className="text-muted-foreground text-[10px] uppercase">Response</div><div className="text-lg font-semibold text-emerald-400">{t.cvr}%</div></div></div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});