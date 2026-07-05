// Analytics ingestion. Fire-and-forget: always returns 202 so the endpoint
// can't be used as an oracle. Privacy-conscious — stores an anonymous UUID
// and an allowlisted event name only; never IP or user agent.
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.js";
import { events } from "../db/schema.js";
import type { Variables } from "../types.js";

export const eventsRoutes = new Hono<{ Variables: Variables }>();

const ALLOWED = new Set([
  "page_view", "species_view", "tour_start", "tour_complete",
  "quiz_start", "quiz_complete", "bookmark_add", "bookmark_remove",
  "share", "compare_open", "time_machine_scrub", "signup", "login",
]);

const eventSchema = z.object({
  anonId: z.string().uuid(),
  sessionKey: z.string().max(64).optional(),
  name: z.string().max(48),
  props: z.record(z.any()).optional(),
});
const batchSchema = z.object({ events: z.array(eventSchema).max(20) });

eventsRoutes.post("/", async (c) => {
  // Cap payload to 8 KB.
  const raw = await c.req.text();
  if (raw.length > 8192) return c.json({ error: "payload too large" }, 413);

  let parsed: z.infer<typeof batchSchema>;
  try {
    parsed = batchSchema.parse(JSON.parse(raw));
  } catch {
    return c.json({ error: "bad request" }, 400);
  }

  const userId = c.get("user")?.id ?? null;
  const rows = parsed.events
    .filter((e) => ALLOWED.has(e.name))
    .map((e) => ({
      anonId: e.anonId,
      userId,
      sessionKey: e.sessionKey ?? null,
      name: e.name,
      props: e.props ?? {},
    }));

  if (rows.length) {
    // Don't block the response on the insert.
    db.insert(events).values(rows).catch((err) => console.error("[events] insert failed", err));
  }
  return c.body(null, 202);
});
