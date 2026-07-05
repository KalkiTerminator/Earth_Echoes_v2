// Authenticated per-user state: bookmarks / birthYear / tweaks config / sound,
// plus quiz score history. All routes require a session (mounted behind
// requireAuth). PUT supports ?merge=1 for the login-time reconciliation:
// bookmarks are unioned, other fields are server-wins-if-set.
import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, max } from "drizzle-orm";
import { db } from "../db/client.js";
import { userState, quizScores } from "../db/schema.js";
import type { Variables } from "../types.js";

export const meRoutes = new Hono<{ Variables: Variables }>();

const stateSchema = z.object({
  bookmarks: z.array(z.string()).max(500).optional(),
  birthYear: z.number().int().min(1900).max(2100).nullable().optional(),
  config: z.record(z.any()).nullable().optional(),
  soundOn: z.boolean().nullable().optional(),
});

meRoutes.get("/state", async (c) => {
  const userId = c.get("user")!.id;
  const [row] = await db.select().from(userState).where(eq(userState.userId, userId));
  return c.json(
    row ?? { bookmarks: [], birthYear: null, config: null, soundOn: null }
  );
});

meRoutes.put("/state", async (c) => {
  const userId = c.get("user")!.id;
  const merge = c.req.query("merge") === "1";
  let body: z.infer<typeof stateSchema>;
  try {
    body = stateSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: "bad request" }, 400);
  }

  const [existing] = await db.select().from(userState).where(eq(userState.userId, userId));

  // Compute the next state. On merge (login): union bookmarks, keep any
  // server value that's already set, otherwise take the incoming (local) one.
  const next = {
    bookmarks:
      merge && existing
        ? Array.from(new Set([...(existing.bookmarks ?? []), ...(body.bookmarks ?? [])]))
        : body.bookmarks ?? existing?.bookmarks ?? [],
    birthYear: pick(merge, existing?.birthYear, body.birthYear),
    config: pick(merge, existing?.config, body.config),
    soundOn: pick(merge, existing?.soundOn, body.soundOn),
  };

  await db
    .insert(userState)
    .values({ userId, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: userState.userId, set: { ...next, updatedAt: new Date() } });

  return c.json(next);
});

// server-wins-if-set on merge; otherwise the incoming value (falling back to
// existing when the field was omitted from the request).
function pick<T>(merge: boolean, serverVal: T | null | undefined, incoming: T | null | undefined): T | null {
  if (merge) {
    if (serverVal !== null && serverVal !== undefined) return serverVal;
    return (incoming ?? null) as T | null;
  }
  return (incoming === undefined ? serverVal ?? null : incoming) as T | null;
}

meRoutes.get("/quiz-scores", async (c) => {
  const userId = c.get("user")!.id;
  const rows = await db
    .select()
    .from(quizScores)
    .where(eq(quizScores.userId, userId))
    .orderBy(desc(quizScores.createdAt))
    .limit(20);
  const [{ best }] = await db
    .select({ best: max(quizScores.total) })
    .from(quizScores)
    .where(eq(quizScores.userId, userId));
  return c.json({ history: rows, best: best ?? 0 });
});

const scoreSchema = z.object({
  total: z.number().int().min(0).max(500),
  rounds: z.array(z.any()).optional(),
});

meRoutes.post("/quiz-scores", async (c) => {
  const userId = c.get("user")!.id;
  let body: z.infer<typeof scoreSchema>;
  try {
    body = scoreSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: "bad request" }, 400);
  }
  await db.insert(quizScores).values({ userId, total: body.total, rounds: body.rounds ?? null });
  return c.json({ ok: true }, 201);
});
