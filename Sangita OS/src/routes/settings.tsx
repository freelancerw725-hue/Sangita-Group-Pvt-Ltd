import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/os/AppLayout";
import { PageHeader } from "@/components/os/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Sangita OS" }] }),
  component: () => (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader
          eyebrow="System"
          title="Settings"
          description="Organization, workspace, integrations, billing."
        />
        <Tabs defaultValue="org">
          <TabsList>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="notif">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="org" className="mt-4 space-y-3">
            <Field label="Organization">
              <Input defaultValue="Sangita Group" />
            </Field>
            <Field label="Primary email">
              <Input defaultValue="ceo@sangita.co" />
            </Field>
            <Field label="Timezone">
              <Input defaultValue="Asia/Kolkata (IST)" />
            </Field>
            <Field label="Currency">
              <Input defaultValue="INR (₹)" />
            </Field>
            <Button size="sm">Save changes</Button>
          </TabsContent>
          <TabsContent value="ai" className="mt-4 space-y-3">
            <Toggle
              label="AI daily briefings"
              desc="Receive an AI-drafted briefing every morning."
              defaultChecked
            />
            <Toggle
              label="AI-drafted follow-ups"
              desc="Pre-generate follow-ups after every meeting."
              defaultChecked
            />
            <Toggle
              label="Auto-chase overdue invoices"
              desc="AI sends polite reminders when invoices go 5+ days late."
              defaultChecked
            />
          </TabsContent>
          <TabsContent value="notif" className="mt-4 space-y-3">
            <Toggle label="Email notifications" defaultChecked />
            <Toggle label="WhatsApp notifications" defaultChecked />
            <Toggle label="Slack digest" />
          </TabsContent>
          <TabsContent value="billing" className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium">Enterprise plan</div>
              <div className="text-xs text-muted-foreground">Billed annually · ₹4.8L/year</div>
              <Button size="sm" variant="outline" className="mt-3">
                Manage plan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  ),
});
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}
function Toggle({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
