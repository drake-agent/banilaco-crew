/**
 * Minimal in-memory rate limiter for public endpoints.
 *
 * Sized for single-instance protection against casual brute-force (squad code
 * enumeration, proof URL scrapers, etc). For multi-instance deployments move
 * this to Redis / Upstash.
 *
 * Usage:
 *   const gate = checkRateLimit(key, { limit: 10, windowMs: 60_000 });
 *   if (!gate.ok) return NextResponse.json({error: 'rate limited'}, {status: 429});
 */

interface RateLimitOptions {
  limit: number;     // max requests in window
  windowMs: number;  // window duration in ms
}

interface Bucket {
  count: number;
  resetAt: number;
}

// Single-process store. Scoped by key (typically ip:route).
const buckets = new Map<string, Bucket>();

// Crude sweep to keep the map bounded — runs inline once per 1000 hits.
let hitsSinceSweep = 0;
function maybeSweep(now: number): void {
  hitsSinceSweep++;
  if (hitsSinceSweep < 1000) return;
  hitsSinceSweep = 0;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt };
  }

  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { ok: true, remaining: opts.limit - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Extract a best-effort client identifier from a Request.
 *
 * Prefers the first entry in `x-forwarded-for` (set by Vercel / most reverse
 * proxies), then `x-real-ip`, then falls back to a shared bucket.
 */
export function clientKey(request: Request, route: string): string {
  const fwd = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const ip = fwd?.split(',')[0]?.trim() || real || 'anon';
  return `${route}:${ip}`;
}
