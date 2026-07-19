// Identity resolution — the same "combine multiple sources, then LLM-synthesize,
// then LLM-validate" pattern applied to the *identity* step (which was previously
// single-source and let wrong species through, e.g. "Vaquita" → a ladybug).
//
//   1. Gather candidate taxa from three taxonomy authorities (GBIF, iNaturalist,
//      Catalogue of Life) — top few each, including vernacular hits.
//   2. Synthesis LLM reads ALL candidates and picks the one correct accepted
//      scientific name for the query (or null if none fits) — choosing only from
//      the candidates, never inventing.
//   3. Validation LLM independently confirms the pick genuinely matches the query
//      (rejects obvious class mismatches like mammal→insect).
//
// Only a confirmed identity proceeds to the data pipeline; otherwise the target
// is skipped with a clear reason. Both LLM calls are metered against the budget.
import { generateObject } from "ai";
import { z } from "zod";
import { synthModel, validateModel } from "./provider.js";
import { estimateCostCents, totalTokens, type TokenUsage } from "./cost.js";
import { meter, RunBudget } from "../budget.js";
import { searchGbif, matchGbif } from "../sources/gbif.js";
import { searchINaturalist } from "../sources/inaturalist.js";
import { fetchCatalogueOfLife } from "../sources/catalogueoflife.js";
import type { SpeciesQuery } from "../types.js";

interface Candidate { source: string; scientific: string; common?: string; rank?: string }

const Pick = z.object({
  scientific: z
    .string()
    .nullable()
    .describe("the single correct accepted scientific (binomial) name from the candidates, or null if none match"),
  commonName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const Check = z.object({
  ok: z.boolean(),
  confidence: z.number().min(0).max(1),
  note: z.string().nullable(),
});

export interface Identity {
  scientific: string;
  commonName?: string | null;
  gbifKey?: number;
  confidence: number;
}

export type IdentityOutcome =
  | { ok: true; identity: Identity }
  | { ok: false; reason: string };

export async function resolveSpeciesIdentity(query: SpeciesQuery, budget: RunBudget): Promise<IdentityOutcome> {
  const term = query.scientific || query.name;
  if (!term) return { ok: false, reason: "no name" };

  // 1. Candidate identities from the three taxonomy authorities.
  const [g, i, colRes] = await Promise.all([
    searchGbif(term),
    searchINaturalist(term),
    fetchCatalogueOfLife({ name: term }).catch(() => null),
  ]);
  const candidates: Candidate[] = [
    ...g.map((c) => ({ source: "GBIF", scientific: c.scientific, rank: c.rank })),
    ...i.map((c) => ({ source: "iNaturalist", scientific: c.scientific, common: c.common, rank: c.rank })),
  ];
  if (colRes?.ok && colRes.fields.scientific) {
    candidates.push({ source: "CatalogueOfLife", scientific: String(colRes.fields.scientific) });
  }
  if (!candidates.length) return { ok: false, reason: `no candidate taxa from any source for "${term}"` };

  const list = candidates
    .map((c, idx) => `${idx + 1}. [${c.source}] ${c.scientific}${c.common ? ` (common: ${c.common})` : ""}${c.rank ? ` — ${c.rank}` : ""}`)
    .join("\n");

  // 2. Synthesis LLM picks the correct species from the candidate list.
  const pick = await generateObject({
    model: synthModel(),
    schema: Pick,
    system:
      `You disambiguate a species query into ONE correct accepted scientific name, choosing ONLY from the ` +
      `candidate list returned by taxonomy databases. The query may be a common name (in any language) or a ` +
      `scientific name. Pick the candidate that is the species the user means; prefer species rank over genus/` +
      `family. If none of the candidates is the intended species, return null. Never invent a name not present ` +
      `in or directly derivable from the candidates.`,
    prompt: `Query: "${term}"\n\nCandidate taxa:\n${list}`,
    temperature: 0,
  });
  const c1 = estimateCostCents("synth", pick.usage as TokenUsage);
  budget.charge(c1);
  await meter("vertex-anthropic", { calls: 1, tokens: totalTokens(pick.usage as TokenUsage), costCents: c1 });

  const chosen = pick.object.scientific?.trim();
  if (!chosen) return { ok: false, reason: `no confident species match for "${term}" among ${candidates.length} candidates` };

  // 3. Validation LLM independently confirms the pick matches the query.
  const check = await generateObject({
    model: validateModel(),
    schema: Check,
    system:
      `You verify a species identity decision. Given the original query and the chosen scientific name (plus the ` +
      `candidate list it came from), confirm the chosen name is present/derivable from the candidates AND is ` +
      `genuinely the species the query refers to. Reject obvious mismatches (e.g. a query for a mammal resolved ` +
      `to an insect, or a common name resolved to an unrelated taxon). Use only well-established common-name↔species knowledge.`,
    prompt: `Query: "${term}"\nChosen: ${chosen}${pick.object.commonName ? ` (${pick.object.commonName})` : ""}\n\nCandidates:\n${list}`,
    temperature: 0,
  });
  const c2 = estimateCostCents("validate", check.usage as TokenUsage);
  budget.charge(c2);
  await meter("vertex-gemini", { calls: 1, tokens: totalTokens(check.usage as TokenUsage), costCents: c2 });

  if (!check.object.ok) {
    return { ok: false, reason: `identity for "${term}" rejected by validator: ${check.object.note ?? "mismatch"}` };
  }

  // 4. Key GBIF from the confirmed name for downstream occurrence coordinates.
  const gk = await matchGbif({ scientific: chosen });
  return {
    ok: true,
    identity: {
      scientific: chosen,
      commonName: pick.object.commonName,
      gbifKey: gk.key,
      confidence: Math.min(pick.object.confidence, check.object.confidence),
    },
  };
}
