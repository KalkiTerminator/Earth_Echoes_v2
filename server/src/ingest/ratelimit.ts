// Per-provider request spacing. Several sources explicitly ask callers to
// delay between requests (IUCN 1-2s, Xeno-canto ~10 per 20s, iNaturalist
// <=60-100/min). We serialize calls per provider and enforce a minimum
// interval — simpler and safer than a bursty token bucket for these limits.
import type { ProviderId } from "./types.js";

// Minimum milliseconds between consecutive calls to each provider.
const MIN_INTERVAL_MS: Partial<Record<ProviderId, number>> & { default: number } = {
  default: 500,
  gbif: 200,
  iucn: 1500,
  wikimedia: 150,
  wikidata: 600,
  inaturalist: 1100,
  obis: 300,
  ebird: 400,
  catalogueoflife: 700,
  xenocanto: 2100,
  openai: 250,
  deepseek: 250,
  gemini: 350,
  firecrawl: 500,
  apify: 500,
  edge: 500,
};

const lastAt: Partial<Record<ProviderId, number>> = {};
// A per-provider promise chain so calls run one-at-a-time, correctly spaced.
const chain: Partial<Record<ProviderId, Promise<void>>> = {};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves when it is safe to make the next call to `provider`. */
export function throttle(provider: ProviderId): Promise<void> {
  const interval = MIN_INTERVAL_MS[provider] ?? MIN_INTERVAL_MS.default;
  const prev = chain[provider] ?? Promise.resolve();
  const next = prev.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, (lastAt[provider] ?? 0) + interval - now);
    if (wait > 0) await sleep(wait);
    lastAt[provider] = Date.now();
  });
  // Keep the chain alive even if a waiter's downstream work rejects.
  chain[provider] = next.catch(() => undefined);
  return next;
}
