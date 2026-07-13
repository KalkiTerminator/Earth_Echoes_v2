// Cron scheduler for saved ingest jobs. Mirrors jobs/rollup.ts. On boot (and
// after any job mutation) it syncs an in-memory map of cron tasks to the
// enabled+scheduled jobs in the DB.
//
// Concurrency: an in-memory guard prevents a job from overlapping its previous
// (still-running) firing. This is correct for the current single-instance
// deployment. True multi-instance safety would need a *dedicated* pooled client
// held for the whole run (pool.connect() -> pg_advisory_lock -> run -> unlock ->
// release) — a pooled db.execute() can't do it because advisory locks are
// connection-scoped and each execute() may land on a different connection. That
// belongs with the worker-service split (plan Phase 6).
import cron, { type ScheduledTask } from "node-cron";
import { nanoid } from "nanoid";
import { db, schema } from "../db/client.js";
import { runSpeciesIngest, type RunParams } from "./orchestrator.js";
import { hasMonthlyHeadroom } from "./budget.js";

interface Entry { schedule: string; paramsKey: string; task: ScheduledTask; }
const tasks = new Map<string, Entry>();
const running = new Set<string>(); // jobs whose previous firing hasn't finished

async function fire(jobId: string, params: RunParams): Promise<void> {
  if (running.has(jobId)) {
    console.warn(`[scheduler] skipping ${jobId}: previous run still in progress`);
    return;
  }
  if (!(await hasMonthlyHeadroom())) {
    console.warn(`[scheduler] skipping ${jobId}: monthly budget exhausted`);
    return;
  }
  running.add(jobId);
  try {
    await runSpeciesIngest({ runId: nanoid(), params, jobId, trigger: "scheduled", triggeredBy: null });
  } finally {
    running.delete(jobId);
  }
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
    const paramsKey = JSON.stringify(job.params ?? {});
    const existing = tasks.get(job.id);
    // Rebuild when EITHER the schedule or the params change (params are captured
    // in the task closure, so an unchanged-schedule edit must still re-create it).
    if (existing && existing.schedule === job.schedule && existing.paramsKey === paramsKey) continue;
    if (existing) existing.task.stop();
    const params = (job.params ?? {}) as RunParams;
    const task = cron.schedule(job.schedule, () => {
      fire(job.id, params).catch((e) => console.error("[scheduler] job failed", job.id, e));
    });
    tasks.set(job.id, { schedule: job.schedule, paramsKey, task });
  }

  // Remove tasks whose job was deleted/disabled/unscheduled.
  for (const [id, entry] of tasks) {
    if (!wanted.has(id)) { entry.task.stop(); tasks.delete(id); }
  }
}
