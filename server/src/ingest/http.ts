// Shared HTTP client for connectors: per-provider throttling, read-through
// caching, timeout, and retry-with-backoff on 429/5xx/network errors. Sends a
// descriptive User-Agent (mandatory for Wikimedia/Wikidata). Records one metered
// "call" per live request.
import { env } from "../env.js";
import { throttle } from "./ratelimit.js";
import { cached } from "./cache.js";
import { meter } from "./budget.js";
import type { ProviderId } from "./types.js";

const USER_AGENT = `EarthsEchoes/1.0 (autonomous-ingest; ${env.ingest.contactEmail})`;

export interface HttpOpts {
  provider: ProviderId;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Cache TTL in seconds; 0 disables caching for this call. */
  ttlSeconds?: number;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function liveRequest(
  url: string,
  opts: HttpOpts,
  accept: string,
): Promise<Response> {
  const { provider, timeoutMs = 15_000, retries = 3, headers = {} } = opts;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await throttle(provider);
    await meter(provider, { calls: 1 });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: accept, ...headers },
      });
      if (res.status === 429 || res.status >= 500) {
        throw new HttpError(res.status, `HTTP ${res.status} from ${provider}`);
      }
      if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status} from ${provider}`);
      return res;
    } catch (e) {
      attempt++;
      const retryable =
        e instanceof HttpError ? e.status === 429 || e.status >= 500 : true;
      if (!retryable || attempt > retries) throw e;
      await sleep(Math.min(8_000, 2 ** attempt * 400)); // 0.8s, 1.6s, 3.2s...
    } finally {
      clearTimeout(timer);
    }
  }
}

/** GET a JSON endpoint (cached, throttled, retried). */
export async function getJson<T>(
  url: string,
  opts: HttpOpts,
): Promise<{ data: T; fromCache: boolean }> {
  const ttl = opts.ttlSeconds ?? 86_400;
  const run = async () => {
    const res = await liveRequest(url, opts, "application/json");
    return (await res.json()) as T;
  };
  if (ttl <= 0) return { data: await run(), fromCache: false };
  return cached<T>(opts.provider, `GET ${url}`, run, ttl);
}
