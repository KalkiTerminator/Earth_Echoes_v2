// Resolvers fan out to the top sources for each data domain, gather every
// source's candidate value per field, flag conflicts, and hand a
// facts+conflicts bundle to the synthesis LLM (Phase 2). Connectors are called
// once each and their fields sliced into per-domain bundles (many sources feed
// more than one domain).
import { fetchGbif, resolveGbifKey } from "../sources/gbif.js";
import { fetchWikimedia } from "../sources/wikimedia.js";
import { fetchINaturalist } from "../sources/inaturalist.js";
import { fetchIucn } from "../sources/iucn.js";
import { fetchWikidata } from "../sources/wikidata.js";
import { fetchXenoCanto } from "../sources/xenocanto.js";
import { fetchScrape } from "../sources/scrape.js";
import type {
  ConnectorResult, FieldCandidate, ResolvedField, ResolverBundle, SpeciesQuery, SpeciesRecord,
} from "../types.js";

type Field = keyof SpeciesRecord;

function normalize(v: unknown): string {
  if (typeof v === "number") return String(Math.round(v * 1000) / 1000);
  if (Array.isArray(v)) return v.map((x) => String(x).toLowerCase().trim()).sort().join("|");
  return String(v).toLowerCase().trim();
}

function collect(results: ConnectorResult[], field: Field): FieldCandidate[] {
  const out: FieldCandidate[] = [];
  for (const r of results) {
    if (!r.ok) continue;
    const value = (r.fields as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === "") continue;
    out.push({ value, provider: r.provider, sourceUrl: r.sourceUrl });
  }
  return out;
}

function bundle(
  domain: ResolverBundle["domain"],
  results: ConnectorResult[],
  fields: Field[],
): ResolverBundle {
  const resolved: ResolvedField[] = [];
  const notes: string[] = [];
  for (const field of fields) {
    const candidates = collect(results, field);
    if (!candidates.length) continue;
    const distinct = new Set(candidates.map((c) => normalize(c.value)));
    resolved.push({ field, candidates, conflict: distinct.size > 1 });
  }
  for (const r of results) {
    if (!r.ok && r.error && !r.error.includes("skipped")) {
      notes.push(`${r.provider}: ${r.error}`);
    }
  }
  const raw: ResolverBundle["raw"] = {};
  for (const r of results) if (r.raw != null) raw[r.provider] = r.raw;
  return { domain, fields: resolved, raw, notes };
}

export interface GatherResult {
  query: SpeciesQuery;
  scientific?: string;
  gbifKey?: number;
  bundles: ResolverBundle[];
  results: ConnectorResult[];
}

/**
 * Resolve identity, then gather all connectors once and slice into the four
 * Phase-1 domain bundles. This is the deterministic input the LLM loop consumes.
 */
export async function gather(query: SpeciesQuery): Promise<GatherResult> {
  // 1. Canonicalize identity — GBIF match gives the scientific name that keys
  //    every other source.
  const q: SpeciesQuery = { ...query };
  if (!q.scientific) {
    try {
      const gr = await fetchGbif(q);
      if (gr.ok && gr.fields.scientific) q.scientific = gr.fields.scientific;
    } catch { /* fall through with whatever we have */ }
  }
  q.gbifKey = await resolveGbifKey(q).catch(() => undefined);

  // 2. Fan out (each connector is internally throttled + cached).
  const results = await Promise.all([
    fetchGbif(q),
    fetchWikimedia(q),
    fetchINaturalist(q),
    fetchIucn(q),
    fetchWikidata(q),
    fetchXenoCanto(q),
    fetchScrape(q), // Firecrawl MCP enrichment — no-op unless configured
  ]);

  const byId = Object.fromEntries(results.map((r) => [r.provider, r])) as Record<string, ConnectorResult>;
  const pick = (...ids: string[]) => ids.map((id) => byId[id]).filter(Boolean);

  const bundles: ResolverBundle[] = [
    bundle("taxonomy", pick("gbif", "inaturalist", "wikidata"), ["name", "scientific"]),
    bundle("status", pick("iucn", "inaturalist", "wikidata"), ["status", "population", "threats"]),
    bundle("coordinates", pick("gbif"), ["lat", "lng"]),
    bundle("media", pick("wikimedia", "inaturalist", "wikidata"), ["imageRemote", "description"]),
    bundle("audio", pick("xenocanto"), ["audioUrl"]),
  ];

  return { query: q, scientific: q.scientific, gbifKey: q.gbifKey, bundles, results };
}
