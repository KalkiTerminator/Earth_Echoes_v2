// Nightly analytics maintenance: materialize daily rollups and enforce the
// 90-day raw-event retention. Scheduled at 04:00 UTC. Exported runRollup() is
// also callable on demand (e.g. from a verification script).
import cron from "node-cron";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export async function runRollup() {
  // Upsert per-day DAU and event-count rollups for the last 2 days (idempotent).
  await db.execute(sql`
    INSERT INTO daily_rollups (day, metric, dims, value)
    SELECT ts::date, 'dau', '{}'::jsonb, count(DISTINCT anon_id)
    FROM events WHERE ts > now() - interval '2 days'
    GROUP BY ts::date
    ON CONFLICT (day, metric, dims) DO UPDATE SET value = EXCLUDED.value`);

  await db.execute(sql`
    INSERT INTO daily_rollups (day, metric, dims, value)
    SELECT ts::date, 'events', '{}'::jsonb, count(*)
    FROM events WHERE ts > now() - interval '2 days'
    GROUP BY ts::date
    ON CONFLICT (day, metric, dims) DO UPDATE SET value = EXCLUDED.value`);

  await db.execute(sql`
    INSERT INTO daily_rollups (day, metric, dims, value)
    SELECT created_at::date, 'signups', '{}'::jsonb, count(*)
    FROM "user" WHERE created_at > now() - interval '2 days'
    GROUP BY created_at::date
    ON CONFLICT (day, metric, dims) DO UPDATE SET value = EXCLUDED.value`);

  // Retention: drop raw events older than 90 days (rollups are kept).
  await db.execute(sql`DELETE FROM events WHERE ts < now() - interval '90 days'`);
}

export function scheduleRollup() {
  cron.schedule("0 4 * * *", () => {
    runRollup().catch((e) => console.error("[rollup] failed", e));
  });
}
