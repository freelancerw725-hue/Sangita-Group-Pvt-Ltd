/**
 * Automation auth for Lead Finder.
 * Separate secret for n8n → Lead Finder.
 * Supports: LEAD_FINDER_AUTOMATION_KEY, AUTOMATION_API_KEY, N8N_API_KEY
 * Never logs secrets, masks keys in errors.
 */
import { NextResponse } from "next/server";

function getAutomationKey(): string | undefined {
  return (
    process.env.LEAD_FINDER_AUTOMATION_KEY?.trim() ||
    process.env.AUTOMATION_API_KEY?.trim() ||
    process.env.N8N_API_KEY?.trim() ||
    undefined
  );
}

export function hasAutomationKey(): boolean {
  return Boolean(getAutomationKey());
}

export function isAutomationAuthorized(request: Request): boolean {
  const expected = getAutomationKey();
  // In test/dev without key, allow but only for local/testing — but we require auth in prod.
  // For Phase 2 dev convenience, if no key configured, allow with warning (still testable).
  if (!expected) {
    // In production without key, deny.
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  const headerKey = request.headers.get("x-api-key")?.trim() ?? request.headers.get("x-automation-key")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (headerKey && headerKey === expected) return true;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === expected) return true;
  }
  // query fallback ?api_key=
  try {
    const url = new URL(request.url);
    const qp = url.searchParams.get("api_key") ?? url.searchParams.get("key");
    if (qp && qp === expected) return true;
  } catch {
    // ignore
  }
  return false;
}

export function automationUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized", message: "Missing or invalid automation API key. Use x-api-key or Authorization: Bearer" },
    { status: 401 },
  );
}

export function maskSecret(value: string): string {
  if (!value) return "****";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 4)}${"*".repeat(Math.max(0, value.length - 4))}`;
}

// For logging: never include raw keys
export function safeLog(message: string, meta?: Record<string, unknown>) {
  // strip any potential key material
  const safeMeta = meta ? JSON.stringify(meta).replace(/(key|token|secret|password)[^"]*"[^"]*"/gi, '"$1":"****"') : "";
  console.log(`[automation] ${message} ${safeMeta}`);
}
