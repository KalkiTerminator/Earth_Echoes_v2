// Orchestrator — one autonomous "add/refresh species" run. Selects targets,
// then for each: gather (top-3 sources) -> synth⇄validate loop -> media for
// gaps -> stage a candidate (raw + synthesis + validation + confidence + diff).
// Optionally auto-publishes high-confidence candidates; otherwise they wait in
// the review queue. Isolated from the public read path; per-run budget capped.
import { nanoid } from "nanoid";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { getJson } from "./http.js";
import { gather } from "./resolvers/index.js";
import { resolveAudio } from "./audio.js";
import { resolveSpeciesIdentity } from "./llm/identify.js";
import { synthValidateLoop } from "./llm/loop.js";
import { generateSpeciesImage } from "./llm/media.js";
import { generateSpeciesAudio } from "./llm/audio.js";
import { llmConfigured } from "./llm/provider.js";
import { promoteCandidate } from "./promote.js";
import { RunBudget, hasMonthlyHeadroom } from "./budget.js";
import { audit } from "./audit.js";
import type { SpeciesQuery, SpeciesRecord } from "./types.js";

export interface RunParams {
  count?: number;
  /** Explicit species to add (common or scientific names). */
  names?: string[];
  /** Otherwise discover via GBIF by higher taxon (e.g. "Aves", "Mammalia"). */
  taxon?: string;
  confidenceThreshold?: number; // 0..1, for auto-publish
  autoPublish?: boolean;
}

export interface RunResult {
  runId: string;
  status: "succeeded" | "partial" | "failed";
  stats: RunStats;
}
interface RunStats {
  targets: number;
  candidates: number;
  approved: number;
  skipped: number;
  costCents: number;
  notes: string[];
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64);
}

async function discover(params: RunParams, limit: number): Promise<SpeciesQuery[]> {
  if (params.names?.length) return params.names.slice(0, limit).map((n) => ({ name: n }));
  if (!params.taxon) return [];
  const cap = Math.min(50, limit * 4);
  try {
    // Resolve the higher taxon to a GBIF backbone key, then list accepted species
    // *under* it (highertaxonKey). Full-text `q=` only matches names and would
    // return loosely-related species rather than true members of the taxon.
    const { data: match } = await getJson<{ usageKey?: number }>(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(params.taxon)}`,
      { provider: "gbif" },
    );
    const searchUrl = match.usageKey
      ? `https://api.gbif.org/v1/species/search?highertaxonKey=${match.usageKey}&rank=SPECIES&status=ACCEPTED&limit=${cap}`
      : `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(params.taxon)}&rank=SPECIES&status=ACCEPTED&limit=${cap}`;
    const { data } = await getJson<{ results?: { canonicalName?: string }[] }>(searchUrl, { provider: "gbif" });
    const names = new Set<string>();
    for (const r of data.results || []) {
      if (r.canonicalName) names.add(r.canonicalName);
      if (names.size >= limit) break;
    }
    return [...names].map((n) => ({ scientific: n }));
  } catch {
    return [];
  }
}

/**
 * Mark runs orphaned by a process restart as failed, so they don't sit
 * "running" forever. Called once at boot.
 */
export async function sweepStaleRuns(): Promise<void> {
  try {
    await db
      .update(schema.ingestRuns)
      .set({ status: "failed", error: "interrupted by restart", finishedAt: new Date() })
      .where(and(
        inArray(schema.ingestRuns.status, ["running", "queued"]),
        lt(schema.ingestRuns.startedAt, new Date(Date.now() - 3_600_000)),
      ));
  } catch {
    // best-effort
  }
}

function computeDiff(next: SpeciesRecord, prev: Record<string, unknown> | undefined): Record<string, { from: unknown; to: unknown }> | null {
  if (!prev) return null;
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(next)) {
    const before = prev[k];
    if (JSON.stringify(before) !== JSON.stringify(v)) diff[k] = { from: before, to: v };
  }
  return Object.keys(diff).length ? diff : null;
}

/**
 * Execute a run. Pass an existing `runId` (created by the API endpoint) or let
 * it create one. Never throws for per-species failures — the run degrades to
 * "partial" and records notes.
 */
export async function runSpeciesIngest(input: {
  params: RunParams;
  runId?: string;
  jobId?: string | null;
  triggeredBy?: string | null;
  trigger?: "manual" | "scheduled";
}): Promise<RunResult> {
  const runId = input.runId ?? nanoid();
  const params = input.params;
  const count = Math.max(1, Math.min(25, params.count ?? 5));
  const threshold = params.confidenceThreshold ?? 0.8;
  const stats: RunStats = { targets: 0, candidates: 0, approved: 0, skipped: 0, costCents: 0, notes: [] };

  // Ensure a run row exists and is marked running.
  await db
    .insert(schema.ingestRuns)
    .values({ id: runId, jobId: input.jobId ?? null, trigger: input.trigger ?? "manual", status: "running", startedAt: new Date(), triggeredBy: input.triggeredBy ?? null })
    .onConflictDoUpdate({ target: schema.ingestRuns.id, set: { status: "running", startedAt: new Date() } });
  await audit({ actor: input.triggeredBy ?? "agent", action: "run.start", entity: "run", entityId: runId, meta: { params } });

  // Guards.
  if (!llmConfigured()) return finish("failed", "Vertex AI not configured (GOOGLE_VERTEX_PROJECT).");
  if (!(await hasMonthlyHeadroom())) return finish("failed", "Monthly ingestion budget exhausted.");

  const allowedHabitats = await db.select({ id: schema.habitats.id, label: schema.habitats.label }).from(schema.habitats);
  if (!allowedHabitats.length) return finish("failed", "No habitats configured — seed habitats before ingesting.");

  const budget = new RunBudget();
  const targets = await discover(params, count);
  stats.targets = targets.length;
  if (!targets.length) return finish("failed", "No target species (provide names or a taxon).");

  for (const query of targets) {
    try {
      // Identity first: an LLM reads candidate taxa from GBIF + iNaturalist +
      // Catalogue of Life and picks the correct species; a second LLM validates
      // the pick. This stops wrong-species matches (e.g. "Vaquita" → a ladybug)
      // from poisoning the whole record. Unconfirmed → skip with a clear reason.
      const ident = await resolveSpeciesIdentity(query, budget);
      if (!ident.ok) { stats.skipped++; stats.notes.push(`skip ${JSON.stringify(query)}: ${ident.reason}`); continue; }

      const g = await gather({ scientific: ident.identity.scientific, gbifKey: ident.identity.gbifKey });
      if (!g.scientific) { stats.skipped++; stats.notes.push(`skip ${JSON.stringify(query)}: unresolved identity`); continue; }

      const loop = await synthValidateLoop(
        { bundles: g.bundles, rawSources: Object.fromEntries(g.results.filter((r) => r.raw != null).map((r) => [r.provider, r.raw])), allowedHabitats },
        budget,
      );
      const record = loop.record;

      // Audio: prefer a real recording, tried in priority order (Xeno-canto →
      // iNaturalist sounds → Wikimedia Commons). If none exists anywhere and
      // generation is configured, synthesize a call (Gemini prompt → ElevenLabs)
      // — ALWAYS disclosed to the reader via audioCredit. Xeno-canto was already
      // fetched during gather; pass it in to avoid a duplicate call.
      const xc = g.results.find((r) => r.provider === "xenocanto" && r.ok);
      const audio = await resolveAudio(query, xc ? { url: xc.fields.audioUrl, credit: xc.fields.audioCredit } : null);
      if (audio) {
        record.audioUrl = audio.url;
        record.audioCredit = audio.credit;
      } else {
        const gen = await generateSpeciesAudio(record, budget, input.triggeredBy ?? undefined);
        if (gen) { record.audioUrl = gen.url; record.audioCredit = gen.credit; }
      }

      // Media for gaps: generate an illustration only when no photo was found.
      if (!record.imageRemote && !record.imageUrl) {
        const url = await generateSpeciesImage(record, budget, input.triggeredBy ?? undefined);
        if (url) record.imageUrl = url;
      }

      const slug = slugify(record.name || record.scientific || nanoid());
      const [existing] = await db.select().from(schema.species).where(eq(schema.species.id, slug));
      const diff = computeDiff(record, existing as Record<string, unknown> | undefined);

      const candidateId = nanoid();
      await db.insert(schema.speciesCandidates).values({
        id: candidateId,
        runId,
        slug,
        record,
        rawSources: g.results.map((r) => ({ provider: r.provider, ok: r.ok, sourceUrl: r.sourceUrl, raw: r.raw })),
        synthesis: { provenance: loop.provenance, trace: loop.trace, iterations: loop.iterations },
        validation: loop.validation,
        confidence: String(loop.confidence),
        diff,
        reviewState: "pending",
      });
      stats.candidates++;
      await audit({ actor: "agent", action: "candidate.create", entity: "candidate", entityId: candidateId, runId, meta: { slug, confidence: loop.confidence, passed: loop.passed } });

      if (params.autoPublish && loop.passed && loop.confidence >= threshold) {
        const p = await promoteCandidate(candidateId, { reviewerId: input.triggeredBy ?? null });
        if (p.ok) stats.approved++;
        else stats.notes.push(`auto-publish ${slug} failed: ${p.error}`);
      }
    } catch (e) {
      stats.notes.push(`error ${JSON.stringify(query)}: ${String(e)}`);
      if (String(e).includes("Run budget exceeded")) {
        stats.notes.push("stopping: per-run budget cap reached");
        stats.costCents = Math.round(budget.spent);
        break;
      }
    }
    stats.costCents = Math.round(budget.spent);
  }

  return finish(stats.candidates > 0 ? (stats.notes.length ? "partial" : "succeeded") : "failed");

  async function finish(status: RunResult["status"], error?: string): Promise<RunResult> {
    // stats.costCents is accumulated after each species in the loop above.
    await db.update(schema.ingestRuns).set({ status, stats, error: error ?? null, finishedAt: new Date() }).where(eq(schema.ingestRuns.id, runId));
    await audit({ actor: input.triggeredBy ?? "agent", action: "run.finish", entity: "run", entityId: runId, after: { status, stats } });
    return { runId, status, stats };
  }
}
