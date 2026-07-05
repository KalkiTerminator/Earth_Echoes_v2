// Admin analytics dashboard queries. Reads mostly from daily_rollups (filled
// by the nightly job) plus last-24h raw events, wrapped in a 5-minute cache so
// repeated dashboard loads don't re-run the aggregations.
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import type { Variables } from "../../types.js";

export const adminAnalytics = new Hono<{ Variables: Variables }>();

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 5 * 60_000;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

// Headline numbers.
adminAnalytics.get("/summary", async (c) => {
  const data = await cached("summary", async () => {
    const [{ users }] = await db.execute<{ users: number }>(
      sql`SELECT count(*)::int AS users FROM "user"`
    ).then((r: any) => r.rows);
    const [{ new_signups }] = await db.execute<{ new_signups: number }>(
      sql`SELECT count(*)::int AS new_signups FROM "user" WHERE created_at > now() - interval '7 days'`
    ).then((r: any) => r.rows);
    const [{ dau }] = await db.execute<{ dau: number }>(
      sql`SELECT count(DISTINCT anon_id)::int AS dau FROM events WHERE ts > now() - interval '24 hours'`
    ).then((r: any) => r.rows);
    const [{ events_24h }] = await db.execute<{ events_24h: number }>(
      sql`SELECT count(*)::int AS events_24h FROM events WHERE ts > now() - interval '24 hours'`
    ).then((r: any) => r.rows);
    return { users, newSignups7d: new_signups, dau, events24h: events_24h };
  });
  return c.json(data);
});

// Daily active users (distinct anon_id) over N days.
adminAnalytics.get("/timeseries", async (c) => {
  const days = Math.min(90, Math.max(1, parseInt(c.req.query("days") || "30", 10)));
  const metric = c.req.query("metric") || "dau";
  const data = await cached(`ts:${metric}:${days}`, async () => {
    if (metric === "signups") {
      const r: any = await db.execute(sql`
        SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
               count(u.id)::int AS value
        FROM generate_series(now() - (${days} || ' days')::interval, now(), '1 day') d
        LEFT JOIN "user" u ON date_trunc('day', u.created_at) = date_trunc('day', d)
        GROUP BY 1 ORDER BY 1`);
      return r.rows;
    }
    const r: any = await db.execute(sql`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT e.anon_id)::int AS value
      FROM generate_series(now() - (${days} || ' days')::interval, now(), '1 day') d
      LEFT JOIN events e ON date_trunc('day', e.ts) = date_trunc('day', d)
      GROUP BY 1 ORDER BY 1`);
    return r.rows;
  });
  return c.json(data);
});

// Most-viewed species (from species_view events).
adminAnalytics.get("/top-species", async (c) => {
  const data = await cached("top-species", async () => {
    const r: any = await db.execute(sql`
      SELECT props->>'species' AS species, count(*)::int AS views
      FROM events
      WHERE name = 'species_view' AND props->>'species' IS NOT NULL
        AND ts > now() - interval '30 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20`);
    return r.rows;
  });
  return c.json(data);
});

// Quiz performance.
adminAnalytics.get("/quiz", async (c) => {
  const data = await cached("quiz", async () => {
    const [row] = await db.execute<{ plays: number; avg: number; best: number }>(sql`
      SELECT count(*)::int AS plays,
             coalesce(round(avg(total))::int, 0) AS avg,
             coalesce(max(total), 0) AS best
      FROM quiz_scores`).then((r: any) => r.rows);
    return row;
  });
  return c.json(data);
});

// Recent signups list (email + when) for the users view.
adminAnalytics.get("/users", async (c) => {
  const data = await cached("users", async () => {
    const r: any = await db.execute(sql`
      SELECT id, name, email, role, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS created_at
      FROM "user" ORDER BY created_at DESC LIMIT 100`);
    return r.rows;
  });
  return c.json(data);
});
