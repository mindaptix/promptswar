import { NextResponse } from "next/server";

type Bucket = { hits: number[]; limit: number; windowMs: number };
const buckets = new Map<string, Bucket>();

const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  auth: { limit: 20, windowMs: 60_000 },
  ai: { limit: 30, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
};

/** Test-only reset so suites do not share a process-wide counter. */
export function resetRateLimits() {
  buckets.clear();
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}

/** Sliding-window limit. Returns a 429 response when the bucket is full. */
export function rateLimit(request: Request, bucket: keyof typeof LIMITS): NextResponse | null {
  const rule = LIMITS[bucket];
  const key = `${bucket}:${clientKey(request)}`;
  const now = Date.now();
  const state = buckets.get(key) ?? { hits: [], limit: rule.limit, windowMs: rule.windowMs };
  state.hits = state.hits.filter((time) => now - time < state.windowMs);
  if (state.hits.length >= state.limit) {
    buckets.set(key, state);
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429, headers: { "retry-after": "60" } });
  }
  state.hits.push(now);
  buckets.set(key, state);
  return null;
}

/** Browsers send Origin on cookie-authenticated writes. A present, foreign Origin is rejected. */
export function rejectForeignOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  let allowed: string;
  try {
    allowed = new URL(request.url).origin;
  } catch {
    return NextResponse.json({ error: "This action is not allowed from that site." }, { status: 403 });
  }
  if (origin !== allowed) return NextResponse.json({ error: "This action is not allowed from that site." }, { status: 403 });
  return null;
}

export function guardMutation(request: Request, bucket: keyof typeof LIMITS): NextResponse | null {
  return rejectForeignOrigin(request) ?? rateLimit(request, bucket);
}

/** Logs a stable message without request bodies, tokens, or stack traces. */
export function logError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`[${scope}] ${message.slice(0, 300)}`);
}
