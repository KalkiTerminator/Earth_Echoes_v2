// Admin content CRUD + preview + publish. All mounted behind requireAdmin.
// Species payloads are zod-validated to the frontend contract; publish() then
// re-validates the whole assembled document before it can go live.
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { species, habitats, threatClasses } from "../../db/schema.js";
import { assembleDoc, publish } from "../../lib/snapshot.js";
import type { Variables } from "../../types.js";

export const adminContent = new Hono<{ Variables: Variables }>();

// ---- full draft document for the panel ----
adminContent.get("/atlas", async (c) => {
  const doc = await assembleDoc({ includeUnpublished: true });
  return c.json(doc);
});

adminContent.get("/preview", async (c) => {
  const doc = await assembleDoc({ includeUnpublished: false });
  return c.json({ version: "draft", ...doc });
});

// ---- species ----
const speciesSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "id must be a lowercase slug"),
  name: z.string().min(1),
  scientific: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  habitat: z.string().min(1),
  habitatLabel: z.string().optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  yearExtinct: z.number().int().nullable().optional(),
  population: z.string().optional().nullable(),
  threats: z.array(z.string()).optional(),
  iconicAction: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageRemote: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  threatClass: z.string().optional().nullable(),
  popCount: z.number().int().optional().nullable(),
  help: z.array(z.string()).optional().nullable(),
  audioUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

adminContent.post("/species", async (c) => {
  const parsed = speciesSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  // Referential check the DB FK would also enforce, but nicer error.
  const [hab] = await db.select().from(habitats).where(eq(habitats.id, parsed.data.habitat));
  if (!hab) return c.json({ error: `unknown habitat "${parsed.data.habitat}"` }, 400);
  await db.insert(species).values({ ...parsed.data, updatedAt: new Date() });
  return c.json({ ok: true }, 201);
});

adminContent.put("/species/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = speciesSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  await db.update(species).set({ ...parsed.data, updatedAt: new Date() }).where(eq(species.id, id));
  return c.json({ ok: true });
});

adminContent.delete("/species/:id", async (c) => {
  await db.delete(species).where(eq(species.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- habitats ----
const habitatSchema = z.object({
  id: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  color: z.string().min(1),
  rgb: z.string().min(1),
  atmos: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

adminContent.post("/habitats", async (c) => {
  const parsed = habitatSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  await db
    .insert(habitats)
    .values({ ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: habitats.id, set: { ...parsed.data, updatedAt: new Date() } });
  return c.json({ ok: true }, 201);
});

adminContent.delete("/habitats/:id", async (c) => {
  const id = c.req.param("id");
  const [used] = await db.select().from(species).where(eq(species.habitat, id)).limit(1);
  if (used) return c.json({ error: "habitat is referenced by a species" }, 409);
  await db.delete(habitats).where(eq(habitats.id, id));
  return c.json({ ok: true });
});

// ---- threat classes ----
const threatSchema = z.object({
  id: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  color: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

adminContent.post("/threat-classes", async (c) => {
  const parsed = threatSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", issues: parsed.error.issues }, 400);
  await db
    .insert(threatClasses)
    .values({ ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: threatClasses.id, set: { ...parsed.data, updatedAt: new Date() } });
  return c.json({ ok: true }, 201);
});

adminContent.delete("/threat-classes/:id", async (c) => {
  await db.delete(threatClasses).where(eq(threatClasses.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ---- publish ----
adminContent.post("/publish", async (c) => {
  const user = c.get("user")!;
  try {
    const { version } = await publish(user.id);
    return c.json({ ok: true, version });
  } catch (e: any) {
    // Validation failure → 409 with the specific problem for the editor.
    return c.json({ error: "validation failed", problem: e.problem ?? e.message }, 409);
  }
});
