/**
 * Bulk Mail template integration boundary — read-only for Phase 3.
 * Reuses existing Bulk Mail templates API if BULK_MAIL_BASE_URL is configured.
 * Otherwise returns mock list for UI/test without duplicating engine.
 * Never duplicates Bulk Mail template engine, never sends.
 */

export interface BulkMailTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
}

const MOCK_TEMPLATES: BulkMailTemplate[] = [
  { id: 1, name: "Initial Outreach", category: "Initial Outreach", subject: "Quick idea for {{company}}", body: "Hi {{contact}},\n\nNoticed {{company}} on YouTube...", variables: ["company", "contact"] },
  { id: 2, name: "Media Partnership", category: "Initial Outreach", subject: "Partnership opportunity for {{company}}", body: "Hello {{contact}},\n\nWe help media…", variables: ["company", "contact"] },
  { id: 3, name: "Followup 1", category: "Followup 1", subject: "Re: {{company}}", body: "Just bumping…", variables: ["company"] },
];

export async function fetchBulkMailTemplates(): Promise<BulkMailTemplate[]> {
  const base = process.env.BULK_MAIL_BASE_URL?.trim() || process.env.BULK_MAIL_URL?.trim();
  if (!base) return MOCK_TEMPLATES;
  try {
    const url = `${base.replace(/\/$/, "")}/api/templates`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`Bulk Mail templates fetch failed: ${res.status}`);
    const data = await res.json().catch(() => ({}));
    // Bulk Mail returns { data: [...] }
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : null;
    if (list && list.length) {
      return list.map((t: Record<string, unknown>) => ({
        id: Number(t.id),
        name: String(t.name),
        category: String(t.category),
        subject: String(t.subject ?? ""),
        body: String(t.body ?? ""),
        variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
      }));
    }
    return MOCK_TEMPLATES;
  } catch {
    return MOCK_TEMPLATES;
  }
}

export async function getBulkMailTemplate(id: number): Promise<BulkMailTemplate | null> {
  const all = await fetchBulkMailTemplates();
  return all.find((t) => t.id === id) ?? null;
}
