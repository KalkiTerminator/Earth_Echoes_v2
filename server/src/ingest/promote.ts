// Promotion — turns a staged candidate into a live species. Reused by both the
// auto-publish path (high confidence) and the manual "Approve" action in the
// Command Center. Re-validates through the exact same speciesSchema as a manual
// admin write, upserts the species row (tagged origin='agent' with provenance),
// marks the candidate published, and publishes a new snapshot.
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { publish } from "../lib/snapshot.js";
import { speciesSchema } from "../routes/admin/content.js";
import { audit } from "./audit.js";
import type { SpeciesRecord } from "./types.js";

export interface PromoteResult {
  ok: boolean;
  version?: number;
  error?: string;
}

/** Validate + upsert a candidate's record into the live species table + publish. */
export async function promoteCandidate(
  candidateId: string,
  opts: { reviewerId?: string | null } = {},
): Promise<PromoteResult> {
  const [cand] = await db
    .select()
    .from(schema.speciesCandidates)
    .where(eq(schema.speciesCandidates.id, candidateId));
  if (!cand) return { ok: false, error: "candidate not found" };
  if (cand.reviewState === "published") return { ok: false, error: "already published" };

  const record = cand.record as SpeciesRecord;
  const candidate = { ...record, id: cand.slug };

  const parsed = speciesSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: `validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
  }

  // FK check (nicer error than the DB constraint).
  const [hab] = await db.select().from(schema.habitats).where(eq(schema.habitats.id, parsed.data.habitat));
  if (!hab) return { ok: false, error: `unknown habitat "${parsed.data.habitat}"` };

  const values = {
    ...parsed.data,
    origin: "agent" as const,
    provenance: cand.synthesis ?? null,
    confidence: cand.confidence ?? null,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  // Upsert so a "refresh" run can update an existing species in place.
  await db
    .insert(schema.species)
    .values(values)
    .onConflictDoUpdate({ target: schema.species.id, set: values });

  await db
    .update(schema.speciesCandidates)
    .set({ reviewState: "published", reviewedBy: opts.reviewerId ?? null, reviewedAt: new Date() })
    .where(eq(schema.speciesCandidates.id, candidateId));

  const { version } = await publish(opts.reviewerId ?? null);

  await audit({
    actor: opts.reviewerId ?? "agent",
    action: "candidate.promote",
    entity: "species",
    entityId: cand.slug,
    runId: cand.runId ?? undefined,
    after: { version, confidence: cand.confidence },
  });

  return { ok: true, version };
}

/** Reject a candidate without publishing. */
export async function rejectCandidate(
  candidateId: string,
  reviewerId?: string | null,
): Promise<PromoteResult> {
  await db
    .update(schema.speciesCandidates)
    .set({ reviewState: "rejected", reviewedBy: reviewerId ?? null, reviewedAt: new Date() })
    .where(eq(schema.speciesCandidates.id, candidateId));
  await audit({ actor: reviewerId ?? "agent", action: "candidate.reject", entity: "candidate", entityId: candidateId });
  return { ok: true };
}
