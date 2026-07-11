// Read-through cache for external API responses, backed by the source_cache
// table. Honors rate limits (a re-run of the same query within TTL never hits
// the upstream) and cuts LLM/enrichment cost. Keyed by provider + a hash of
// the request so identical queries collapse.
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { ProviderId } from "./types.js";

const DEFAULT_TTL = 86_400; // 24h

function keyFor(provider: ProviderId, request: string): string {
  return `${provider}:${createHash("sha1").update(request).digest("hex")}`;
}

/**
 * Return a cached payload if fresh; otherwise run `fetcher`, store, and return.
 * `request` should uniquely identify the call (e.g. the full URL + body).
 */
export async function cached<T>(
  provider: ProviderId,
  request: string,
  fetcher: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL,
): Promise<{ data: T; fromCache: boolean }> {
  const key = keyFor(provider, request);
  try {
    const rows = await db
      .select()
      .from(schema.sourceCache)
      .where(eq(schema.sourceCache.key, key))
      .limit(1);
    const row = rows[0];
    if (row) {
      const ageMs = Date.now() - new Date(row.fetchedAt as unknown as string).getTime();
      if (ageMs < (row.ttlSeconds ?? DEFAULT_TTL) * 1000) {
        return { data: row.payload as T, fromCache: true };
      }
    }
  } catch {
    // Cache read is best-effort; fall through to a live fetch.
  }

  const data = await fetcher();

  try {
    await db
      .insert(schema.sourceCache)
      .values({ key, provider, payload: data as unknown, fetchedAt: new Date(), ttlSeconds })
      .onConflictDoUpdate({
        target: schema.sourceCache.key,
        set: { payload: data as unknown, fetchedAt: new Date(), ttlSeconds },
      });
  } catch {
    // Non-fatal: a failed cache write just means the next call re-fetches.
  }

  return { data, fromCache: false };
}
