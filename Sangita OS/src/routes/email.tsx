import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Sparkles } from "lucide-react";
import { inr } from "@/lib/dashboard/server";

export const Route = createFileRoute("/email")({
  head: () => ({ meta: [{ title: "Bulk Email — Sangita OS" }] }),
  component: () => <EmailPage />,
});

function EmailPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch("/api/dashboard/email");
        if (!res.ok) throw new Error("Failed to fetch campaigns");
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader
            eyebrow="Revenue"
            title="Bulk Email"
            description="Loading campaigns from real data..."
          />
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[11px] uppercase">Campaign</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Sent</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Delivered</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Open %</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Click %</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Revenue</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1400px] mx-auto">
          <PageHeader eyebrow="Revenue" title="Bulk Email" description="Failed to load campaigns" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Revenue"
          title="Bulk Email"
          description="Segmented campaigns with real metrics from database."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI compose
              </Button>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" /> New campaign
              </Button>
            </div>
          }
        />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase">Campaign</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Sent</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Delivered</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Open %</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Click %</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Revenue</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="text-sm font-medium">{c.name}</TableCell>
                  <TableCell className="text-right text-xs">{c.sent.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs">
                    {c.delivered.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {c.openRate !== null ? `${c.openRate}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {c.clickRate !== null ? `${c.clickRate}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-400">
                    {inr(c.revenue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {campaigns.length === 0 && (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No campaigns yet. Create one after approving leads.
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
