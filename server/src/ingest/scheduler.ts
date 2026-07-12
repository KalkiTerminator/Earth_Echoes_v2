// Cron scheduler for saved ingest jobs. Mirrors jobs/rollup.ts. On boot (and
// after any job mutation) it syncs an in-memory map of cron tasks to the
// enabled+scheduled jobs in the DB. When a job fires it grabs a Postgres
// advisory lock so that, if the API ever runs multiple instances, only one
// executes the run — the "worker-ready" property from the plan.
import cron, { type ScheduledTask } from "node-cron";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../db/client.js";
import { runSpeciesIngest, type RunParams } from "./orchestrator.js";
import { hasMonthlyHeadroom } from "./budget.js";

interface Entry { schedule: string; task: ScheduledTask; }
const tasks = new Map<string, Entry>();

async function withAdvisoryLock(jobId: string, fn: () => Promise<void>): Promise<void> {
  const got: { rows: { ok: boolean }[] } = await db.execute(
    sql`SELECT pg_try_advisory_lock(hashtext(${jobId})) AS ok`,
  ) as unknown as { rows: { ok: boolean }[] };
  if (!got.rows[0]?.ok) return; // another instance owns this job right now
  try {
    await fn();
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${jobId}))`);
  }
}

async function fire(jobId: string, params: RunParams): Promise<void> {
  if (!(await hasMonthlyHeadroom())) {
    console.warn(`[scheduler] skipping ${jobId}: monthly budget exhausted`);
    return;
  }
  await withAdvisoryLock(jobId, async () => {
    await runSpeciesIngest({ runId: nanoid(), params, jobId, trigger: "scheduled", triggeredBy: null });
  });
}

/** Reconcile the live cron tasks with the enabled+scheduled jobs in the DB. */
export async function syncSchedules(): Promise<void> {
  let jobs: { id: string; schedule: string | null; enabled: boolean; params: unknown }[];
  try {
    jobs = await db.select({
      id: schema.ingestJobs.id, schedule: schema.ingestJobs.schedule,
      enabled: schema.ingestJobs.enabled, params: schema.ingestJobs.params,
    }).from(schema.ingestJobs);
  } catch {
    return; // table not migrated yet, etc.
  }

  const wanted = new Set<string>();
  for (const job of jobs) {
    if (!job.enabled || !job.schedule || !cron.validate(job.schedule)) continue;
    wanted.add(job.id);
    const existing = tasks.get(job.id);
    if (existing && existing.schedule === job.schedule) continue; // unchanged
    if (existing) existing.task.stop();
    const params = (job.params ?? {}) as RunParams;
    const task = cron.schedule(job.schedule, () => {
      fire(job.id, params).catch((e) => console.error("[scheduler] job failed", job.id, e));
    });
    tasks.set(job.id, { schedule: job.schedule, task });
  }

  // Remove tasks whose job was deleted/disabled/unscheduled.
  for (const [id, entry] of tasks) {
    if (!wanted.has(id)) { entry.task.stop(); tasks.delete(id); }
  }
}
