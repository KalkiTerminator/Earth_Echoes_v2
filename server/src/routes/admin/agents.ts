// Command Center API — configure/run/govern the ingestion agents. Mounted under
// the admin-gated /api/admin/*, so every route already requires an admin session
// + same-origin. Runs are kicked asynchronously: the endpoint creates the run
// row and returns its id immediately; the orchestrator finishes in the
// background and updates the row (the UI polls /runs/:id).
import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../../db/client.js";
import { runSpeciesIngest, type RunParams } from "../../ingest/orchestrator.js";
import { syncSchedules } from "../../ingest/scheduler.js";
import { promoteCandidate, rejectCandidate } from "../../ingest/promote.js";
import { monthlySpendCents } from "../../ingest/budget.js";
import { env } from "../../env.js";
import type { Variables } from "../../types.js";

export const adminAgents = new Hono<{ Variables: Variables }>();

const paramsSchema = z.object({
  count: z.number().int().min(1).max(25).optional(),
  names: z.array(z.string()).optional(),
  taxon: z.string().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  autoPublish: z.boolean().optional(),
}).default({});

const jobSchema = z.object({
  name: z.string().min(1),
  domain: z.enum(["species", "refresh", "audio", "coords"]),
  params: paramsSchema,
  schedule: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

function userId(c: { get: (k: "user") => { id?: string } | undefined }): string | null {
  return c.get("user")?.id ?? null;
}

// ---- jobs (saved automations) ----
adminAgents.get("/agents", async (c) => {
  const rows = await db.select().from(schema.ingestJobs).orderBy(desc(schema.ingestJobs.createdAt));
  return c.json(rows);
});

adminAgents.post("/agents", async (c) => {
  const parsed = jobSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  const id = nanoid();
  await db.insert(schema.ingestJobs).values({
    id, name: parsed.data.name, domain: parsed.data.domain, params: parsed.data.params,
    schedule: parsed.data.schedule ?? null, enabled: parsed.data.enabled ?? true, createdBy: userId(c),
  });
  void syncSchedules();
  return c.json({ ok: true, id }, 201);
});

adminAgents.put("/agents/:id", async (c) => {
  const parsed = jobSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  await db.update(schema.ingestJobs).set({ ...parsed.data, updatedAt: new Date() }).where(eq(schema.ingestJobs.id, c.req.param("id")));
  void syncSchedules();
  return c.json({ ok: true });
});

adminAgents.delete("/agents/:id", async (c) => {
  await db.delete(schema.ingestJobs).where(eq(schema.ingestJobs.id, c.req.param("id")));
  void syncSchedules();
  return c.json({ ok: true });
});

// Kick a run — from a saved job or ad-hoc params. Returns the runId immediately.
function kick(params: RunParams, jobId: string | null, triggeredBy: string | null): string {
  const runId = nanoid();
  // Fire-and-forget: the orchestrator marks the run running -> finished.
  void runSpeciesIngest({ runId, params, jobId, triggeredBy }).catch((e) => {
    console.error("[ingest] run failed", runId, e);
  });
  return runId;
}

adminAgents.post("/agents/:id/run", async (c) => {
  const [job] = await db.select().from(schema.ingestJobs).where(eq(schema.ingestJobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "job not found" }, 404);
  const runId = kick(job.params as RunParams, job.id, userId(c));
  return c.json({ ok: true, runId }, 202);
});

adminAgents.post("/agents/run", async (c) => {
  const parsed = paramsSchema.safeParse((await c.req.json().catch(() => ({})))?.params ?? {});
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  const runId = kick(parsed.data, null, userId(c));
  return c.json({ ok: true, runId }, 202);
});

// ---- runs ----
adminAgents.get("/runs", async (c) => {
  const rows = await db.select().from(schema.ingestRuns).orderBy(desc(schema.ingestRuns.createdAt)).limit(50);
  return c.json(rows);
});

adminAgents.get("/runs/:id", async (c) => {
  const [run] = await db.select().from(schema.ingestRuns).where(eq(schema.ingestRuns.id, c.req.param("id")));
  if (!run) return c.json({ error: "not found" }, 404);
  const candidates = await db.select().from(schema.speciesCandidates).where(eq(schema.speciesCandidates.runId, run.id));
  return c.json({ run, candidates });
});

// ---- candidates (review queue) ----
adminAgents.get("/candidates", async (c) => {
  const state = c.req.query("state");
  const rows = state
    ? await db.select().from(schema.speciesCandidates).where(eq(schema.speciesCandidates.reviewState, state)).orderBy(desc(schema.speciesCandidates.createdAt)).limit(100)
    : await db.select().from(schema.speciesCandidates).orderBy(desc(schema.speciesCandidates.createdAt)).limit(100);
  return c.json(rows);
});

adminAgents.get("/candidates/:id", async (c) => {
  const [row] = await db.select().from(schema.speciesCandidates).where(eq(schema.speciesCandidates.id, c.req.param("id")));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

// Edit a candidate's proposed record before approving (manual override).
adminAgents.put("/candidates/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.record !== "object") return c.json({ error: "record required" }, 400);
  await db.update(schema.speciesCandidates).set({ record: body.record }).where(eq(schema.speciesCandidates.id, c.req.param("id")));
  return c.json({ ok: true });
});

adminAgents.post("/candidates/:id/approve", async (c) => {
  const res = await promoteCandidate(c.req.param("id"), { reviewerId: userId(c) });
  return res.ok ? c.json(res) : c.json(res, 409);
});

adminAgents.post("/candidates/:id/reject", async (c) => {
  const res = await rejectCandidate(c.req.param("id"), userId(c));
  return c.json(res);
});

// ---- audit + cost ----
adminAgents.get("/audit", async (c) => {
  const rows = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.ts)).limit(200);
  return c.json(rows);
});

adminAgents.get("/usage", async (c) => {
  const firstOfMonth = new Date().toISOString().slice(0, 8) + "01";
  const rows = await db
    .select()
    .from(schema.usageMeter)
    .where(and(gte(schema.usageMeter.day, firstOfMonth)));
  const monthCents = await monthlySpendCents();
  return c.json({ monthCents, monthlyCapCents: env.ingest.monthlyCents, byProvider: rows });
});
