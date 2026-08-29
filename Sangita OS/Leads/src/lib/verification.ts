/**
 * Email verification provider — interface + mock implementation.
 * Phase 3: no paid provider required. Production can plug ZeroBounce, Hunter, etc.
 * via VERIFICATION_PROVIDER env.
 *
 * Never expose provider secrets to client/n8n — server-only.
 */
import type { EmailVerificationStatus } from "@/lib/types";

export interface VerificationResult {
  email: string;
  status: EmailVerificationStatus; // valid | invalid | risky | unknown
  provider: string;
  score?: number | null;
  error?: string | null;
}

export interface EmailVerifier {
  verify(email: string): Promise<VerificationResult>;
  verifyBatch(emails: string[]): Promise<VerificationResult[]>;
}

// Disposable / risky domains (sample)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
]);
const RISKY_KEYWORDS = ["test", "fake", "noreply", "no-reply"];

function mockVerifySingle(email: string): VerificationResult {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { email, status: "invalid", provider: "mock", score: 0, error: "Invalid format" };
  }
  const domain = trimmed.split("@")[1] ?? "";
  if (DISPOSABLE_DOMAINS.has(domain) || RISKY_KEYWORDS.some((k) => trimmed.includes(k))) {
    return { email, status: "risky", provider: "mock", score: 40, error: null };
  }
  // Simulate unknown for some domains
  if (domain.endsWith(".unknown") || domain.includes("unknown")) {
    return { email, status: "unknown", provider: "mock", score: null, error: null };
  }
  // Invalid examples: missing MX simulation
  if (trimmed.includes("invalid") || domain === "invalid.com") {
    return { email, status: "invalid", provider: "mock", score: 10, error: "Mailbox not found" };
  }
  // Default valid
  return { email, status: "valid", provider: "mock", score: 95, error: null };
}

export class MockEmailVerifier implements EmailVerifier {
  async verify(email: string): Promise<VerificationResult> {
    // tiny deterministic delay to simulate async
    return mockVerifySingle(email);
  }
  async verifyBatch(emails: string[]): Promise<VerificationResult[]> {
    return emails.map((e) => mockVerifySingle(e));
  }
}

/**
 * Future real provider — placeholder that still uses mock if no API key.
 * Example: ZeroBounce, Hunter, NeverBounce — all expose HTTP API.
 * Keep provider key server-only (process.env.VERIFICATION_API_KEY).
 */
export class ProviderEmailVerifier implements EmailVerifier {
  constructor(private readonly apiKey?: string) {}
  async verify(email: string): Promise<VerificationResult> {
    const key = this.apiKey ?? process.env.VERIFICATION_API_KEY ?? process.env.ZEROBOUNCE_API_KEY;
    if (!key) {
      // No paid key → fall back to mock, but mark provider as mock to avoid confusion
      return mockVerifySingle(email);
    }
    // Real implementation would fetch(`https://api.zerobounce.net/v2/validate?email=${email}&key=${key}`)
    // For Phase 3, we still return mock to keep zero-cost & deterministic.
    return { ...(await new MockEmailVerifier().verify(email)), provider: "zerobounce" };
  }
  async verifyBatch(emails: string[]): Promise<VerificationResult[]> {
    const single = new ProviderEmailVerifier(this.apiKey);
    return Promise.all(emails.map((e) => single.verify(e)));
  }
}

export function createEmailVerifier(): EmailVerifier {
  const provider = process.env.VERIFICATION_PROVIDER ?? "mock";
  if (provider === "zerobounce" || provider === "hunter") {
    return new ProviderEmailVerifier(process.env.VERIFICATION_API_KEY);
  }
  return new MockEmailVerifier();
}

export function verificationStatusFromEmail(email: string): EmailVerificationStatus {
  return mockVerifySingle(email).status;
}
