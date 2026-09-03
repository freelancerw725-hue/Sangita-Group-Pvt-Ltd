/**
 * Simple API auth for Keyword Pool.
 * Phase 1: checks for optional KEYWORDS_API_KEY / N8N_API_KEY.
 * If env vars not set, allows all (dev mode) but logs warning.
 * Future: integrate with Supabase auth (Bearer JWT).
 */
export function isAuthorized(request: Request): boolean {
  const key = process.env.KEYWORDS_API_KEY || process.env.N8N_API_KEY;
  if (!key) return true; // dev open

  const headerKey = request.headers.get("x-api-key") ?? request.headers.get("x-n8n-key");
  const authHeader = request.headers.get("authorization");

  if (headerKey && headerKey === key) return true;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token === key) return true;
  }
  // Also allow if caller provides ?api_key=...
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("api_key") === key) return true;
  } catch {}
  return false;
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Unauthorized", message: "Missing or invalid API key (x-api-key)" }),
    {
      status: 401,
      headers: { "content-type": "application/json" },
    },
  );
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export function errorJson(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, { status });
}
