// In-memory fixed-window rate limiter keyed by client IP. Sufficient for a
// single stateless instance; swap the store for Redis if going multi-replica.
import { createMiddleware } from "hono/factory";

type Bucket = { count: number; resetAt: number };
const stores = new Map<string, Map<string, Bucket>>();

function clientIp(headers: Headers): string {
  // Railway/Vercel set x-forwarded-for; take the first hop.
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

export function rateLimit(opts: { name: string; limit: number; windowMs: number }) {
  const store = stores.get(opts.name) ?? new Map<string, Bucket>();
  stores.set(opts.name, store);

  return createMiddleware(async (c, next) => {
    const ip = clientIp(c.req.raw.headers);
    const now = Date.now();
    let b = store.get(ip);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + opts.windowMs };
      store.set(ip, b);
    }
    b.count++;
    if (b.count > opts.limit) {
      const retry = Math.ceil((b.resetAt - now) / 1000);
      c.header("Retry-After", String(retry));
      return c.json({ error: "rate limited" }, 429);
    }
    await next();
  });
}

// Periodically evict expired buckets so the maps don't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [ip, b] of store) if (now > b.resetAt) store.delete(ip);
  }
}, 60_000).unref();
