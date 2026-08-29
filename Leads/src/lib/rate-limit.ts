import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const ipMap = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const existing = ipMap.get(ip);

  if (!existing || now > existing.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (existing.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    const response = NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  existing.count += 1;
  return null;
}
