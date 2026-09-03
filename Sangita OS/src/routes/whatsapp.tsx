import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Sangita OS" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/whatsapp-templates");
        if (!res.ok) throw new Error("Failed to fetch templates");
        const data = await res.json();
        setTemplates(data.templates || []);
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
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader
            eyebrow="Revenue"
            title="WhatsApp"
            description="Loading templates from database..."
          />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonTemplate />
            <SkeletonTemplate />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1300px] mx-auto">
          <PageHeader eyebrow="Revenue" title="WhatsApp" description="Failed to load templates" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1300px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="WhatsApp"
          description="Approved templates, broadcasts and conversation analytics — from real database records."
          actions={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" /> New template
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {t.category || "Uncategorized"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Uses</div>
                  <div className="text-lg font-semibold">{t.uses || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Response</div>
                  <div className="text-lg font-semibold text-emerald-400">{t.cvr || 0}%</div>
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-2 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No WhatsApp templates found. Add templates to the database to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SkeletonTemplate() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-4 w-16 bg-muted rounded mt-3" />
      <div className="h-4 w-16 bg-muted rounded mt-2" />
    </div>
  );
}
