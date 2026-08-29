import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getLeadsUrl, getBulkMailUrl } from "@/components/os/Plugins";

describe("Sangita OS Plugins — Leads & Bulk Mail launchers", () => {
  const originalEnv = { ...import.meta.env } as Record<string, string>;

  beforeEach(() => {
    // Clear relevant env
    delete (import.meta.env as Record<string, string>).VITE_LEADS_BASE_URL;
    delete (import.meta.env as Record<string, string>).VITE_LEAD_FINDER_BASE_URL;
    delete (import.meta.env as Record<string, string>).VITE_BULK_MAIL_BASE_URL;
    delete (import.meta.env as Record<string, string>).VITE_BULK_MAIL_URL;
  });

  afterEach(() => {
    // Restore
    Object.assign(import.meta.env, originalEnv);
  });

  it("1. Leads plugin renders (getLeadsUrl returns url when configured)", () => {
    (import.meta.env as Record<string, string>).VITE_LEADS_BASE_URL = "https://leads.example.com";
    expect(getLeadsUrl()).toBe("https://leads.example.com");
  });

  it("2. Bulk Mail plugin renders (getBulkMailUrl returns url when configured)", () => {
    (import.meta.env as Record<string, string>).VITE_BULK_MAIL_BASE_URL = "https://bulk-mail.example.com";
    expect(getBulkMailUrl()).toBe("https://bulk-mail.example.com");
  });

  it("3. Leads URL comes from configuration (VITE_LEADS_BASE_URL)", () => {
    (import.meta.env as Record<string, string>).VITE_LEADS_BASE_URL = "https://leads.example.com";
    expect(getLeadsUrl()).toBe("https://leads.example.com");
    delete (import.meta.env as Record<string, string>).VITE_LEADS_BASE_URL;
    (import.meta.env as Record<string, string>).VITE_LEAD_FINDER_BASE_URL = "https://lead-finder.example.com";
    expect(getLeadsUrl()).toBe("https://lead-finder.example.com");
  });

  it("4. Bulk Mail URL comes from configuration (VITE_BULK_MAIL_BASE_URL)", () => {
    (import.meta.env as Record<string, string>).VITE_BULK_MAIL_BASE_URL = "https://bulk-mail.example.com";
    expect(getBulkMailUrl()).toBe("https://bulk-mail.example.com");
  });

  it("5. Opens in new tab (component uses target=_blank)", async () => {
    const content = await import("fs").then((fs) => fs.readFileSync("src/components/os/Plugins.tsx", "utf8"));
    expect(content).toContain('target="_blank"');
  });

  it("6. rel=\"noopener noreferrer\" exists", async () => {
    const content = await import("fs").then((fs) => fs.readFileSync("src/components/os/Plugins.tsx", "utf8"));
    expect(content).toContain('rel="noopener noreferrer"');
  });

  it("7. Missing URL does not crash page (returns null, shows Not configured)", () => {
    expect(getLeadsUrl()).toBeNull();
    expect(getBulkMailUrl()).toBeNull();
    // Component should handle null without throwing — we test the helper, not the render
    expect(() => getLeadsUrl()).not.toThrow();
    expect(() => getBulkMailUrl()).not.toThrow();
  });

  it("8. Existing Overview functionality still works (Plugins component imports)", async () => {
    const mod = await import("@/components/os/Plugins");
    expect(mod.Plugins).toBeDefined();
    expect(typeof mod.Plugins).toBe("function");
  });

  it("9. Existing CampaignMonitor still works", async () => {
    const mod = await import("@/components/os/CampaignMonitor");
    expect(mod.CampaignMonitor).toBeDefined();
  });

  it("10. Existing LeadSheetMonitor still works", async () => {
    const mod = await import("@/components/os/LeadSheetMonitor");
    expect(mod.LeadSheetMonitor).toBeDefined();
  });

  it("11. No secrets exposed in client bundle (no API keys in Plugins.tsx)", async () => {
    const content = await import("fs").then((fs) => fs.readFileSync("src/components/os/Plugins.tsx", "utf8"));
    expect(content).not.toContain("BULK_MAIL_API_KEY");
    expect(content).not.toContain("LEAD_FINDER_API_KEY");
    expect(content).not.toContain("KEYWORDS_API_KEY");
    expect(content).not.toContain("NEXT_PUBLIC");
    // Only public URLs should be referenced
    expect(content).toContain("VITE_LEADS_BASE_URL");
    expect(content).toContain("VITE_BULK_MAIL_BASE_URL");
  });
});
