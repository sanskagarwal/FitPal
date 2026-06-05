import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limiter.
//
// The AI routes are the only expensive, externally-billed endpoints, so we cap
// how often a single client can hit them. This is a fixed-window counter kept
// in process memory — sufficient for a single-instance deployment with no extra
// dependency. For multi-instance deployments, swap the store for Redis.
//
// Configurable via env:
//   AI_RATE_LIMIT        max requests per window per client (default 30)
//   AI_RATE_WINDOW_MS    window length in ms (default 60000 = 1 minute)
// Set AI_RATE_LIMIT=0 to disable.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window rolls over
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  // Prefer the proxy-forwarded client IP when present, else the socket address.
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown');
  return ip;
}

export function aiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const limit = Number(process.env.AI_RATE_LIMIT ?? 30);
  const windowMs = Number(process.env.AI_RATE_WINDOW_MS ?? 60_000);

  // Disabled or misconfigured → no limiting.
  if (!Number.isFinite(limit) || limit <= 0) {
    next();
    return;
  }

  const now = Date.now();
  const key = clientKey(req);
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: `Too many AI requests. Please wait ${retryAfterSec}s and try again.`,
    });
    return;
  }

  next();
}

// Periodically drop expired buckets so the map doesn't grow unbounded. Unref so
// this timer never keeps the process alive on its own.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60_000);
sweep.unref?.();
