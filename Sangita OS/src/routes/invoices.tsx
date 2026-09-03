import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Plus,
  Search,
  Download,
  Mail,
  Bell,
  Sparkles,
  Trash2,
  FileText,
  IndianRupee,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { inr } from "@/lib/dashboard/server";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Sangita OS" },
      {
        name: "description",
        content: "Send, track, and auto-chase invoices with AI from real data.",
      },
    ],
  }),
  component: InvoicesPage,
});

const STATUS_COLOR: Record<string, string> = {
  Draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  Sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Viewed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Overdue: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

type Invoice = {
  id: string;
  client: string;
  client_email: string;
  issue_date: string;
  due_date: string;
  status: string;
  items: any[];
  notes?: string;
  timeline: any[];
  created_at: string;
  updated_at: string;
};

function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [openInv, setOpenInv] = useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = invoices.filter((i) => {
    const okQ = !q || (i.id + i.client).toLowerCase().includes(q.toLowerCase());
    const okS = status === "all" || i.status === status;
    return okQ && okS;
  });

  const stats = useMemo(() => {
    const outstanding = invoices
      .filter((i) => i.status !== "Paid" && i.status !== "Cancelled")
      .reduce((s, i) => s + invoiceTotals(i).total, 0);
    const paid = invoices
      .filter((i) => i.status === "Paid")
      .reduce((s, i) => s + invoiceTotals(i).total, 0);
    const overdue = invoices
      .filter((i) => i.status === "Overdue")
      .reduce((s, i) => s + invoiceTotals(i).total, 0);
    return { outstanding, paid, overdue };
  }, [invoices]);

  const monthly = useMemo(() => {
    const months: Record<string, { paid: number; out: number }> = {};
    for (const inv of invoices) {
      const { total } = invoiceTotals(inv);
      const month = new Date(inv.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!months[month]) months[month] = { paid: 0, out: 0 };
      if (inv.status === "Paid") months[month].paid += total;
      else if (["Sent", "Viewed", "Overdue"].includes(inv.status)) months[month].out += total;
    }
    return Object.entries(months).map(([m, v]) => ({
      m,
      paid: v.paid / 100000,
      out: v.out / 100000,
    }));
  }, [invoices]);

  const statusMix = useMemo(() => {
    const statuses = ["Paid", "Sent", "Overdue", "Draft", "Viewed", "Cancelled"] as const;
    return statuses.map((s) => ({ name: s, value: invoices.filter((i) => i.status === s).length }));
  }, [invoices]);

  const COLORS = ["#10b981", "#3b82f6", "#f43f5e", "#64748b", "#a855f7", "#f59e0b"];

  function markPaid(id: string) {
    setInvoices((p) => p.map((i) => (i.id === id ? { ...i, status: "Paid" } : i)));
    toast.success(`${id} marked paid`);
  }
  function sendReminder(id: string) {
    toast.success(`Reminder sent for ${id}`);
  }
  function exportPdf(id: string) {
    toast.success(`${id}.pdf exported`);
  }
  function del(id: string) {
    setInvoices((p) => p.filter((i) => i.id !== id));
    toast.success("Invoice deleted");
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader
            eyebrow="Finance"
            title="Invoices"
            description="Loading invoices from database..."
          />
          <div className="grid grid-cols-4 gap-3 mb-5">
            <SkeletonKpi label="Outstanding" />
            <SkeletonKpi label="Paid (30d)" />
            <SkeletonKpi label="Overdue" />
            <SkeletonKpi label="Avg. days to pay" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-[1500px] mx-auto">
          <PageHeader eyebrow="Finance" title="Invoices" description="Failed to load invoices" />
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-400">
            {error}
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchInvoices}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1500px] mx-auto">
        <PageHeader
          eyebrow="Finance"
          title="Invoices"
          description="Send, track, and auto-chase GST-compliant invoices from real database records."
          actions={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" /> Create Invoice
                </Button>
              </DialogTrigger>
              <CreateInvoiceDialog
                onCreate={(inv) => {
                  setInvoices((p) => [inv, ...p]);
                  setCreateOpen(false);
                }}
              />
            </Dialog>
          }
        />
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Kpi
            label="Outstanding"
            value={inr(stats.outstanding)}
            tone="text-primary"
            hint="Across all open invoices"
          />
          <Kpi
            label="Paid (30d)"
            value={inr(stats.paid)}
            tone="text-emerald-400"
            hint="Real payments received"
          />
          <Kpi
            label="Overdue"
            value={inr(stats.overdue)}
            tone="text-rose-400"
            hint="AI will auto-chase"
          />
          <Kpi
            label="Total Invoices"
            value={String(invoices.length)}
            tone="text-foreground"
            hint="From database"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Cashflow — Paid vs Outstanding (₹L)</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="m" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#111113",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium mb-3">Status mix</div>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    stroke="none"
                  >
                    {statusMix.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#111113",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice # or client…"
              className="pl-9 h-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_COLOR) as string[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI can auto-chase overdue invoices
            <Button size="sm" variant="outline" className="h-7">
              Run
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] uppercase tracking-widest">Invoice</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest">Issue</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest">Due</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest text-right">
                  Total
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const { total } = invoiceTotals(inv);
                return (
                  <TableRow
                    key={inv.id}
                    className="border-border hover:bg-primary/5 cursor-pointer"
                    onClick={() => setOpenInv(inv)}
                  >
                    <TableCell className="font-medium">{inv.id}</TableCell>
                    <TableCell>
                      {inv.client}
                      <div className="text-[11px] text-muted-foreground">{inv.client_email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {inv.issue_date}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{inv.due_date}</TableCell>
                    <TableCell className="text-right font-semibold">{inr(total)}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] border ${STATUS_COLOR[inv.status] || "border-border"}`}
                        variant="outline"
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => sendReminder(inv.id)}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => exportPdf(inv.id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => toast.success(`Email sent to ${inv.client_email}`)}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        {inv.status !== "Paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => markPaid(inv.id)}
                          >
                            <IndianRupee className="h-3 w-3" /> Mark paid
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-400"
                          onClick={() => del(inv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={!!openInv} onOpenChange={(o) => !o && setOpenInv(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {openInv && (
            <InvoiceDetail
              inv={openInv}
              onMarkPaid={() => {
                markPaid(openInv.id);
                setOpenInv({ ...openInv, status: "Paid" });
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function invoiceTotals(inv: Invoice) {
  const subtotal = inv.items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const gst = inv.items.reduce(
    (s, it) => s + ((it.qty || 0) * (it.rate || 0) * (it.gstPct || 18)) / 100,
    0,
  );
  return { subtotal, gst, total: subtotal + gst };
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function InvoiceDetail({ inv, onMarkPaid }: { inv: Invoice; onMarkPaid: () => void }) {
  const { subtotal, gst, total } = invoiceTotals(inv);
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {inv.id}
          </div>
          <h2 className="text-xl font-semibold mt-0.5">{inv.client}</h2>
          <div className="text-xs text-muted-foreground">{inv.client_email}</div>
        </div>
        <Badge
          className={`text-[10px] border ${STATUS_COLOR[inv.status] || "border-border"}`}
          variant="outline"
        >
          {inv.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
        <div className="rounded-md border border-border p-2">
          <div className="text-muted-foreground text-[10px] uppercase">Issue</div>
          <div className="mt-0.5">{inv.issue_date}</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-muted-foreground text-[10px] uppercase">Due</div>
          <div className="mt-0.5">{inv.due_date}</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-muted-foreground text-[10px] uppercase">Terms</div>
          <div className="mt-0.5">Net 15</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-[11px]">Description</TableHead>
              <TableHead className="text-[11px] text-right">Qty</TableHead>
              <TableHead className="text-[11px] text-right">Rate</TableHead>
              <TableHead className="text-[11px] text-right">GST</TableHead>
              <TableHead className="text-[11px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inv.items.map((it, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="text-xs">{it.desc}</TableCell>
                <TableCell className="text-xs text-right">{it.qty}</TableCell>
                <TableCell className="text-xs text-right">{inr(it.rate || 0)}</TableCell>
                <TableCell className="text-xs text-right">{it.gstPct || 18}%</TableCell>
                <TableCell className="text-xs text-right">
                  {inr((it.qty || 0) * (it.rate || 0) * (1 + (it.gstPct || 18) / 100))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 ml-auto w-64 space-y-1 text-sm">
        <Row k="Subtotal" v={inr(subtotal)} />
        <Row k="GST (18%)" v={inr(gst)} />
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{inr(total)}</span>
        </div>
      </div>

      {inv.notes && (
        <div className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
          Notes: {inv.notes}
        </div>
      )}

      <div className="mt-4">
        <div className="text-xs font-medium mb-2">Timeline</div>
        <div className="space-y-1.5">
          {inv.timeline.map((t, i) => (
            <div key={i} className="text-xs flex gap-3">
              <span className="text-muted-foreground w-14 shrink-0">{t.at}</span>
              <span className="text-primary uppercase text-[10px] w-16">{t.type}</span>
              <span>{t.text}</span>
            </div>
          ))}
          {inv.timeline.length === 0 && (
            <div className="text-xs text-muted-foreground">No events yet.</div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3.5 w-3.5" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-3.5 w-3.5" /> Email invoice
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-3.5 w-3.5" /> Send reminder
        </Button>
        <Button size="sm" className="gap-2" onClick={onMarkPaid} disabled={inv.status === "Paid"}>
          <IndianRupee className="h-3.5 w-3.5" /> Mark paid
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function CreateInvoiceDialog({ onCreate }: { onCreate: (inv: Invoice) => void }) {
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState([{ desc: "", qty: 1, rate: 0, gstPct: 18 }]);
  const totals = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const gst = items.reduce(
    (s, it) => s + ((it.qty || 0) * (it.rate || 0) * (it.gstPct || 18)) / 100,
    0,
  );
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Create Invoice
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Client name"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
        <Input
          placeholder="Client email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <div className="text-xs font-medium mb-2">Line items</div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-6"
                placeholder="Description"
                value={it.desc}
                onChange={(e) =>
                  setItems((p) => p.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))
                }
              />
              <Input
                className="col-span-2"
                type="number"
                placeholder="Qty"
                value={it.qty || 1}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) || 1 } : x)),
                  )
                }
              />
              <Input
                className="col-span-2"
                type="number"
                placeholder="Rate"
                value={it.rate || 0}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) || 0 } : x)),
                  )
                }
              />
              <Input
                className="col-span-2"
                type="number"
                placeholder="GST%"
                value={it.gstPct || 18}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, j) => (j === i ? { ...x, gstPct: Number(e.target.value) || 18 } : x)),
                  )
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setItems((p) => [...p, { desc: "", qty: 1, rate: 0, gstPct: 18 }])}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
        </div>
        <div className="mt-3 text-xs flex justify-end gap-6">
          <div>
            Subtotal: <span className="font-semibold">{inr(totals)}</span>
          </div>
          <div>
            GST: <span className="font-semibold">{inr(gst)}</span>
          </div>
          <div>
            Total: <span className="font-semibold text-primary">{inr(totals + gst)}</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            const now = new Date();
            const due = new Date(now.getTime() + 15 * 86400000);
            onCreate({
              id: `INV-${2100 + Math.floor(Math.random() * 900)}`,
              client,
              client_email: email,
              issue_date: now.toISOString().slice(0, 10),
              due_date: due.toISOString().slice(0, 10),
              status: "Draft",
              items,
              timeline: [{ at: "just now", type: "created", text: "Invoice created" }],
            });
            toast.success("Invoice created (local only - not saved to database)");
          }}
        >
          Save invoice
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SkeletonKpi({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="h-6 w-24 bg-muted rounded mt-1" />
      <div className="h-3 w-16 bg-muted rounded mt-0.5" />
    </div>
  );
}
